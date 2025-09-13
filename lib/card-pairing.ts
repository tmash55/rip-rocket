import { createClient } from '@/libs/supabase/server'

export interface Upload {
  id: string
  profile_id: string
  batch_id: string
  filename: string
  storage_path: string
  status: 'uploaded' | 'paired' | 'orphaned' | 'deleted'
  uploaded_at: string
}

export interface CardPair {
  id: string
  profile_id: string
  batch_id: string
  front_upload_id: string
  back_upload_id?: string
  status: 'unpaired' | 'paired'
  method: 'auto_filename' | 'auto_sequential' | 'manual'
  confidence?: number
}

export interface PairingResult {
  success: boolean
  pairs_created: number
  orphaned_uploads: string[]
  errors: string[]
}

export class CardPairingService {
  private supabase: any

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Main pairing function - tries all strategies
   */
  async pairBatchImages(batchId: string, profileId: string): Promise<PairingResult> {
    try {
      // Get all uploads for this batch
      const { data: uploads, error } = await this.supabase
        .from('uploads')
        .select('*')
        .eq('batch_id', batchId)
        .eq('profile_id', profileId)
        .eq('status', 'uploaded')
        .order('filename')

      if (error) throw error
      if (!uploads || uploads.length === 0) {
        return { success: true, pairs_created: 0, orphaned_uploads: [], errors: [] }
      }

      console.log(`[Pairing] Processing ${uploads.length} uploads for batch ${batchId}`)
      console.log(`[Pairing] Filenames:`, uploads.map(u => u.filename))

      const result: PairingResult = {
        success: true,
        pairs_created: 0,
        orphaned_uploads: [],
        errors: []
      }

      let remainingUploads = [...uploads]

      // Strategy 1: Filename-based pairing
      const filenameResult = await this.pairByFilename(remainingUploads, batchId, profileId)
      result.pairs_created += filenameResult.pairs_created
      result.errors.push(...filenameResult.errors)
      remainingUploads = remainingUploads.filter(upload => 
        !filenameResult.paired_upload_ids.includes(upload.id)
      )

      console.log(`[Pairing] After filename pairing: ${filenameResult.pairs_created} pairs, ${remainingUploads.length} remaining`)

      // Strategy 2: Sequential number pairing
      if (remainingUploads.length >= 2) {
        const sequentialResult = await this.pairBySequential(remainingUploads, batchId, profileId)
        result.pairs_created += sequentialResult.pairs_created
        result.errors.push(...sequentialResult.errors)
        remainingUploads = remainingUploads.filter(upload => 
          !sequentialResult.paired_upload_ids.includes(upload.id)
        )

        console.log(`[Pairing] After sequential pairing: ${sequentialResult.pairs_created} pairs, ${remainingUploads.length} remaining`)
      }

      // Remaining uploads are orphaned (need manual pairing)
      result.orphaned_uploads = remainingUploads.map(upload => upload.id)

      // Update upload statuses
      if (result.orphaned_uploads.length > 0) {
        await this.supabase
          .from('uploads')
          .update({ status: 'orphaned' })
          .in('id', result.orphaned_uploads)
      }

      return result

    } catch (error) {
      console.error('[Pairing] Error during batch pairing:', error)
      return {
        success: false,
        pairs_created: 0,
        orphaned_uploads: [],
        errors: [error.message || 'Unknown pairing error']
      }
    }
  }

  /**
   * Strategy 1: Filename pattern matching
   */
  private async pairByFilename(
    uploads: Upload[], 
    batchId: string, 
    profileId: string
  ): Promise<{ pairs_created: number; paired_upload_ids: string[]; errors: string[] }> {
    const pairs: { front: Upload; back: Upload; confidence: number }[] = []
    const pairedIds: string[] = []
    const errors: string[] = []

    // Common filename patterns
    const patterns = [
      // Pattern: filename_front.ext + filename_back.ext
      {
        regex: /^(.+)_(front|f)(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_back`, `${basename}_b`]
      },
      {
        regex: /^(.+)_(back|b)(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_front`, `${basename}_f`]
      },
      // Pattern: filename_1.ext + filename_2.ext (assuming 1=front, 2=back)
      {
        regex: /^(.+)_1(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_2`]
      },
      {
        regex: /^(.+)_2(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_1`]
      }
    ]

    for (const upload of uploads) {
      if (pairedIds.includes(upload.id)) continue

      const filename = upload.filename.toLowerCase()
      
      for (const pattern of patterns) {
        const match = filename.match(pattern.regex)
        if (!match) continue

        const [, basename, suffix, extension] = match
        const possibleMatches = pattern.matcher(basename).map(name => `${name}${extension}`)

        // Find matching upload
        const partner = uploads.find(u => 
          !pairedIds.includes(u.id) &&
          u.id !== upload.id &&
          possibleMatches.some(possible => u.filename.toLowerCase() === possible)
        )

        if (partner) {
          // Determine which is front/back
          const isFront = filename.includes('front') || filename.includes('_f.') || filename.includes('_1.')
          const front = isFront ? upload : partner
          const back = isFront ? partner : upload

          pairs.push({ front, back, confidence: 0.95 })
          pairedIds.push(front.id, back.id)
          break
        }
      }
    }

    // Create card_pairs records
    for (const pair of pairs) {
      try {
        const { error } = await this.supabase
          .from('card_pairs')
          .insert({
            profile_id: profileId,
            batch_id: batchId,
            front_upload_id: pair.front.id,
            back_upload_id: pair.back.id,
            status: 'paired',
            method: 'auto_filename',
            confidence: pair.confidence
          })

        if (error) {
          errors.push(`Failed to create filename pair: ${error.message}`)
          continue
        }

        // Update upload statuses
        await this.supabase
          .from('uploads')
          .update({ status: 'paired' })
          .in('id', [pair.front.id, pair.back.id])

      } catch (error) {
        errors.push(`Error creating filename pair: ${error.message}`)
      }
    }

    return {
      pairs_created: pairs.length,
      paired_upload_ids: pairedIds,
      errors
    }
  }

  /**
   * Strategy 2: Sequential number pairing (scanner increment pattern)
   */
  private async pairBySequential(
    uploads: Upload[], 
    batchId: string, 
    profileId: string
  ): Promise<{ pairs_created: number; paired_upload_ids: string[]; errors: string[] }> {
    const pairs: { front: Upload; back: Upload; confidence: number }[] = []
    const pairedIds: string[] = []
    const errors: string[] = []

    console.log(`[Pairing] Sequential: Starting with ${uploads.length} uploads`)

    // Group by normalized prefix (filename without extension and trailing number)
    const groups = new Map<string, { upload: Upload; number: number }[]>()

    for (const upload of uploads) {
      const name = upload.filename.toLowerCase()
      const numberMatch = name.match(/(\d+)(?!.*\d)/) // last number in the name
      const number = numberMatch ? parseInt(numberMatch[1]) : null
      const withoutExt = name.replace(/\.[^.]+$/, '')
      const prefix = withoutExt.replace(/[\s_\-]*\d+$/, '') // drop trailing digits and separators
      console.log(`[Pairing] Sequential: ${upload.filename} -> number: ${number}, prefix: ${prefix}`)
      if (number === null) continue
      const list = groups.get(prefix) || []
      list.push({ upload, number })
      groups.set(prefix, list)
    }

    let totalCountWithNumbers = 0
    for (const [prefix, list] of groups) {
      list.sort((a, b) => a.number - b.number)
      totalCountWithNumbers += list.length
      console.log(`[Pairing] Sequential: Group '${prefix}' sorted:`, list.map(i => `${i.upload.filename}(${i.number})`).join(', '))

      // Walk the group and pair adjacent sequential numbers
      let i = 0
      while (i < list.length - 1) {
        const current = list[i]
        const next = list[i + 1]

        if (pairedIds.includes(current.upload.id)) { i++; continue }
        if (pairedIds.includes(next.upload.id)) { i++; continue }

        const difference = next.number - current.number
        console.log(`[Pairing] Sequential: [${prefix}] Check ${current.upload.filename}(${current.number}) vs ${next.upload.filename}(${next.number}) => diff ${difference}`)
        if (difference === 1) {
          pairs.push({
            front: current.upload,
            back: next.upload,
            confidence: 0.8
          })
          pairedIds.push(current.upload.id, next.upload.id)
          i += 2
        } else {
          i++
        }
      }
    }

    console.log(`[Pairing] Sequential: ${totalCountWithNumbers} uploads had numbers across ${groups.size} groups`)
    console.log(`[Pairing] Sequential: Found ${pairs.length} potential pairs (grouped by prefix)`) 

    // Create card_pairs records
    for (const pair of pairs) {
      try {
        console.log(`[Pairing] Sequential: Creating DB pair for ${pair.front.filename} + ${pair.back.filename}`)
        
        const { error } = await this.supabase
          .from('card_pairs')
          .insert({
            profile_id: profileId,
            batch_id: batchId,
            front_upload_id: pair.front.id,
            back_upload_id: pair.back.id,
            status: 'paired',
            method: 'auto_sequential',
            confidence: pair.confidence
          })

        if (error) {
          console.error(`[Pairing] Sequential: DB error creating pair:`, error)
          errors.push(`Failed to create sequential pair: ${error.message}`)
          continue
        }

        console.log(`[Pairing] Sequential: ✅ Successfully created pair in DB`)

        // Update upload statuses
        const { error: updateError } = await this.supabase
          .from('uploads')
          .update({ status: 'paired' })
          .in('id', [pair.front.id, pair.back.id])

        if (updateError) {
          console.error(`[Pairing] Sequential: Error updating upload statuses:`, updateError)
          errors.push(`Failed to update upload statuses: ${updateError.message}`)
        } else {
          console.log(`[Pairing] Sequential: ✅ Updated upload statuses to 'paired'`)
        }

      } catch (error) {
        console.error(`[Pairing] Sequential: Exception creating pair:`, error)
        errors.push(`Error creating sequential pair: ${error.message}`)
      }
    }

    return {
      pairs_created: pairs.length,
      paired_upload_ids: pairedIds,
      errors
    }
  }

  /**
   * Manual pairing by user
   */
  async createManualPair(
    frontUploadId: string,
    backUploadId: string | null,
    batchId: string,
    profileId: string
  ): Promise<{ success: boolean; pairId?: string; error?: string }> {
    try {
      const { data, error } = await this.supabase
        .from('card_pairs')
        .insert({
          profile_id: profileId,
          batch_id: batchId,
          front_upload_id: frontUploadId,
          back_upload_id: backUploadId,
          status: 'paired',
          method: 'manual',
          confidence: 1.0 // User confirmation = 100% confidence
        })
        .select()
        .single()

      if (error) throw error

      // Update upload statuses
      const uploadIds = [frontUploadId]
      if (backUploadId) uploadIds.push(backUploadId)

      await this.supabase
        .from('uploads')
        .update({ status: 'paired' })
        .in('id', uploadIds)

      return { success: true, pairId: data.id }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get pairing status for a batch
   */
  async getBatchPairingStatus(batchId: string, profileId: string) {
    const [uploadsResult, pairsResult] = await Promise.all([
      this.supabase
        .from('uploads')
        .select('*')
        .eq('batch_id', batchId)
        .eq('profile_id', profileId),
      
      this.supabase
        .from('card_pairs')
        .select(`
          *,
          front_upload:uploads!card_pairs_front_upload_id_fkey(*),
          back_upload:uploads!card_pairs_back_upload_id_fkey(*)
        `)
        .eq('batch_id', batchId)
        .eq('profile_id', profileId)
    ])

    if (uploadsResult.error) throw uploadsResult.error
    if (pairsResult.error) throw pairsResult.error

    const uploads = uploadsResult.data || []
    const pairs = pairsResult.data || []
    
    const orphanedUploads = uploads.filter(upload => upload.status === 'orphaned')
    const pairedUploads = uploads.filter(upload => upload.status === 'paired')

    return {
      total_uploads: uploads.length,
      paired_uploads: pairedUploads.length,
      orphaned_uploads: orphanedUploads.length,
      pairs_created: pairs.length,
      pairs,
      orphaned_files: orphanedUploads
    }
  }
}
