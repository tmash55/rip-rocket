import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { batchId: string }
}

/**
 * GET /api/debug-pairing/[batchId]
 * Debug the pairing algorithm step-by-step
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const batchId = params.batchId

    // Get batch info
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .eq('profile_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get uploads
    const { data: uploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('*')
      .eq('batch_id', batchId)
      .eq('profile_id', user.id)
      .eq('status', 'uploaded')
      .order('filename')

    if (uploadsError || !uploads) {
      return NextResponse.json({ error: "Failed to get uploads" }, { status: 500 })
    }

    console.log(`[Debug] Processing ${uploads.length} uploads for batch ${batchId}`)

    const debugInfo = {
      batch_info: {
        id: batchId,
        status: batch.status,
        total_files: batch.total_files
      },
      uploads: uploads.map(upload => ({
        id: upload.id,
        filename: upload.filename,
        status: upload.status
      })),
      filename_analysis: [],
      sequential_analysis: [],
      pairing_recommendations: []
    }

    // Debug filename patterns
    const filenamePatterns = [
      // Pattern: filename_front.ext + filename_back.ext
      {
        name: "front/back suffix",
        regex: /^(.+)_(front|f)(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_back`, `${basename}_b`]
      },
      {
        name: "back/front suffix", 
        regex: /^(.+)_(back|b)(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_front`, `${basename}_f`]
      },
      // Pattern: filename_1.ext + filename_2.ext
      {
        name: "numbered suffix _1/_2",
        regex: /^(.+)_1(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_2`]
      },
      {
        name: "numbered suffix _2/_1",
        regex: /^(.+)_2(\.[^.]+)$/i,
        matcher: (basename: string) => [`${basename}_1`]
      }
    ]

    for (const upload of uploads) {
      const filename = upload.filename.toLowerCase()
      const analysis = {
        filename: upload.filename,
        patterns_tested: []
      }

      for (const pattern of filenamePatterns) {
        const match = filename.match(pattern.regex)
        const patternTest = {
          pattern_name: pattern.name,
          regex: pattern.regex.toString(),
          matched: !!match,
          extracted_parts: match ? match.slice(1) : null,
          potential_matches: []
        }

        if (match) {
          const [, basename, suffix, extension] = match
          const possibleMatches = pattern.matcher(basename).map(name => `${name}${extension}`)
          
          // Check if any of these potential matches exist
          for (const possibleMatch of possibleMatches) {
            const partner = uploads.find(u => 
              u.id !== upload.id && 
              u.filename.toLowerCase() === possibleMatch
            )
            
            if (partner) {
              patternTest.potential_matches.push({
                expected_filename: possibleMatch,
                found_partner: {
                  id: partner.id,
                  filename: partner.filename
                }
              })
            } else {
              patternTest.potential_matches.push({
                expected_filename: possibleMatch,
                found_partner: null
              })
            }
          }
        }

        analysis.patterns_tested.push(patternTest)
      }

      debugInfo.filename_analysis.push(analysis)
    }

    // Debug sequential pairing
    const uploadsWithNumbers = uploads
      .map(upload => {
        const numberMatch = upload.filename.match(/(\d+)/)
        const number = numberMatch ? parseInt(numberMatch[1]) : null
        return { 
          upload, 
          number,
          extracted_number: numberMatch ? numberMatch[1] : null,
          full_match: numberMatch ? numberMatch[0] : null
        }
      })
      .filter(item => item.number !== null)
      .sort((a, b) => a.number! - b.number!)

    debugInfo.sequential_analysis = {
      total_uploads: uploads.length,
      uploads_with_numbers: uploadsWithNumbers.length,
      sorted_by_number: uploadsWithNumbers.map(item => ({
        filename: item.upload.filename,
        extracted_number: item.extracted_number,
        parsed_number: item.number,
        upload_id: item.upload.id
      })),
      potential_sequential_pairs: []
    }

    // Check for sequential pairs (using fixed algorithm)
    const pairedIds: string[] = []
    let i = 0
    while (i < uploadsWithNumbers.length - 1) {
      const current = uploadsWithNumbers[i]
      const next = uploadsWithNumbers[i + 1]
      
      // Skip if already paired
      if (pairedIds.includes(current.upload.id) || pairedIds.includes(next.upload.id)) {
        i++
        continue
      }
      
      const difference = next.number! - current.number!
      const isSequential = difference === 1
      let wouldPair = isSequential

      debugInfo.sequential_analysis.potential_sequential_pairs.push({
        pair_index: debugInfo.sequential_analysis.potential_sequential_pairs.length,
        first_file: {
          filename: current.upload.filename,
          number: current.number,
          id: current.upload.id
        },
        second_file: {
          filename: next.upload.filename,
          number: next.number,
          id: next.upload.id
        },
        number_difference: difference,
        is_sequential: isSequential,
        would_pair: wouldPair
      })

      if (isSequential) {
        // Mark both as paired and skip them
        pairedIds.push(current.upload.id, next.upload.id)
        i += 2 // Skip both files
      } else {
        i++ // Move to next file
      }
    }

    // Generate pairing recommendations
    debugInfo.pairing_recommendations = []

    // From filename analysis
    for (const analysis of debugInfo.filename_analysis) {
      for (const patternTest of analysis.patterns_tested) {
        for (const potentialMatch of patternTest.potential_matches) {
          if (potentialMatch.found_partner) {
            debugInfo.pairing_recommendations.push({
              type: 'filename_pattern',
              method: patternTest.pattern_name,
              confidence: 0.95,
              front_file: analysis.filename,
              back_file: potentialMatch.found_partner.filename,
              front_id: uploads.find(u => u.filename === analysis.filename)?.id,
              back_id: potentialMatch.found_partner.id
            })
          }
        }
      }
    }

    // From sequential analysis
    for (const pair of debugInfo.sequential_analysis.potential_sequential_pairs) {
      if (pair.would_pair) {
        debugInfo.pairing_recommendations.push({
          type: 'sequential_numbers',
          method: 'auto_sequential',
          confidence: 0.8,
          front_file: pair.first_file.filename,
          back_file: pair.second_file.filename,
          front_id: pair.first_file.id,
          back_id: pair.second_file.id,
          number_difference: pair.number_difference
        })
      }
    }

    return NextResponse.json({
      success: true,
      debug_info: debugInfo,
      summary: {
        total_uploads: uploads.length,
        filename_patterns_found: debugInfo.filename_analysis.filter(a => 
          a.patterns_tested.some(p => p.potential_matches.some(m => m.found_partner))
        ).length,
        sequential_pairs_found: debugInfo.sequential_analysis.potential_sequential_pairs.filter(p => p.would_pair).length,
        total_recommendations: debugInfo.pairing_recommendations.length
      }
    }, { status: 200 })

  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ 
      error: "Debug failed",
      detail: error.message 
    }, { status: 500 })
  }
}
