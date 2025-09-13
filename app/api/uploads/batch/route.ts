import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"
import { CardStorage } from "@/lib/storage"

export const dynamic = "force-dynamic"

interface BatchUploadRequest {
  batch_name?: string
  note?: string
}

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Use user.id directly (matches auth.uid() in RLS policies)
    const profileId = user.id

    // Parse form data
    const formData = await req.formData()
    const files: File[] = []
    const batch_name = formData.get('batch_name') as string || 'Untitled Batch'
    const note = formData.get('note') as string || null

    // Extract files from form data
    // Use getAll to handle multiple files properly
    const allEntries = Array.from(formData.entries())
    console.log(`[Upload] FormData entries: ${allEntries.map(([key, value]) => `${key}: ${value instanceof File ? value.name : value}`).join(', ')}`)
    
    for (const [key, value] of allEntries) {
      if (key.startsWith('file_') && value instanceof File) {
        files.push(value)
      }
    }

    // Deduplicate files by name (in case there are duplicate form entries)
    const uniqueFiles = files.filter((file, index, arr) => 
      arr.findIndex(f => f.name === file.name && f.size === file.size) === index
    )
    
    console.log(`[Upload] Original files count: ${files.length}, Unique files count: ${uniqueFiles.length}`)

    if (uniqueFiles.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    // Generate batch ID
    const batchId = crypto.randomUUID()

    console.log(`[Upload] Starting batch upload for user ${profileId}: ${uniqueFiles.length} files`)

    // 1. Create batch record (total_files will be set by trigger)
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .insert({
        id: batchId,
        profile_id: profileId,
        name: batch_name,
        note: note,
        status: 'uploaded',
        total_files: 0, // Will be incremented by trigger
        progress: 0
      })
      .select()
      .single()

    if (batchError) {
      console.error('[Upload] Failed to create batch:', batchError)
      return NextResponse.json({ error: "Failed to create batch" }, { status: 500 })
    }

    // 2. Upload files to storage
    let uploadedFiles
    try {
      uploadedFiles = await CardStorage.uploadBatch(profileId, batchId, uniqueFiles)
      console.log(`[Upload] Successfully uploaded ${uploadedFiles.length} files to storage`)
    } catch (storageError) {
      console.error('[Upload] Storage upload failed:', storageError)
      
      // Clean up batch record on storage failure
      await supabase.from('batches').delete().eq('id', batchId)
      
      return NextResponse.json({ 
        error: "File upload failed", 
        detail: storageError.message 
      }, { status: 500 })
    }

    // 3. Create upload records in database
    const uploadRecords = uploadedFiles.map(file => ({
      id: file.id,
      profile_id: profileId,
      batch_id: batchId,
      filename: file.filename,
      storage_path: file.storage_path,
      mime_type: file.mime_type,
      file_size: file.size,
      status: 'uploaded' as const
    }))

    const { error: uploadsError } = await supabase
      .from('uploads')
      .insert(uploadRecords)

    if (uploadsError) {
      console.error('[Upload] Failed to create upload records:', uploadsError)
      
      // Clean up storage and batch on database failure
      try {
        await CardStorage.deleteBatch(profileId, batchId)
        await supabase.from('batches').delete().eq('id', batchId)
      } catch (cleanupError) {
        console.error('[Upload] Cleanup failed:', cleanupError)
      }
      
      return NextResponse.json({ error: "Failed to save upload records" }, { status: 500 })
    }

    // 4. Update batch progress to 100% (upload complete)
    await supabase
      .from('batches')
      .update({ progress: 100, status: 'processing' })
      .eq('id', batchId)

    console.log(`[Upload] Batch ${batchId} completed successfully`)

    // 5. Trigger pairing job and process it immediately
    try {
      // Check for existing pairing jobs for this batch
      const { data: existingJobs, error: jobCheckError } = await supabase
        .from('jobs')
        .select('id, status')
        .eq('batch_id', batchId)
        .eq('type', 'pairing')
        .order('created_at', { ascending: false })

      if (jobCheckError) {
        console.error('[Upload] Failed to check existing pairing jobs:', jobCheckError)
      }

      const activeJob = existingJobs?.find(j => ['queued', 'processing'].includes(j.status))
      
      if (activeJob) {
        console.log(`[Upload] Reusing existing ${activeJob.status} pairing job for batch ${batchId}`)
      } else {
        // Create new pairing job only if no active jobs exist
        const { error: jobError } = await supabase
          .from('jobs')
          .insert({
            profile_id: profileId,
            batch_id: batchId,
            type: 'pairing',
            status: 'queued',
            payload: { batch_id: batchId }
          })

        if (jobError) {
          console.error('[Upload] Failed to create pairing job:', jobError)
          // Don't fail the upload, just log the error
        } else {
          console.log(`[Upload] New pairing job queued for batch ${batchId}`)
        }
      }
      
      // Immediately process pairing jobs (both new and existing)
      try {
        const processingResponse = await fetch(`${req.nextUrl.origin}/api/jobs/process`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          }
        })
        
        if (processingResponse.ok) {
          console.log(`[Upload] Pairing job processing triggered for batch ${batchId}`)
        } else {
          console.error(`[Upload] Failed to trigger pairing job processing`)
        }
      } catch (processError) {
        console.error('[Upload] Error triggering job processing:', processError)
      }
    } catch (jobError) {
      console.error('[Upload] Error in pairing job logic:', jobError)
    }

    // 6. Return success response
    return NextResponse.json({
      success: true,
      batch: {
        id: batchId,
        name: batch_name,
        total_files: uniqueFiles.length,
        status: 'uploaded'
      },
      uploads: uploadRecords.map(upload => ({
        id: upload.id,
        filename: upload.filename,
        size: upload.file_size,
        status: upload.status
      }))
    })

  } catch (error) {
    console.error('[Upload] Unexpected error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
