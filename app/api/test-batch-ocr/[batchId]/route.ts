import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/libs/supabase/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const batchId = params.batchId
    const supabase = createServiceClient() // Use service client to bypass auth

    console.log(`[Test OCR] Testing OCR for batch ${batchId}`)

    // Get batch info
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found", detail: batchError?.message }, { status: 404 })
    }

    console.log(`[Test OCR] Found batch:`, batch.name, 'Status:', batch.status)

    // Check for paired cards
    const { data: pairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select('id')
      .eq('batch_id', batchId)
      .eq('status', 'paired')

    if (pairsError) {
      return NextResponse.json({ error: "Failed to check card pairs", detail: pairsError.message }, { status: 500 })
    }

    console.log(`[Test OCR] Found ${pairs?.length || 0} paired cards`)

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ 
        error: "No paired cards found for OCR processing",
        batch_status: batch.status 
      }, { status: 400 })
    }

    // Check for existing OCR jobs for this batch
    const { data: existingJobs, error: jobCheckError } = await supabase
      .from('jobs')
      .select('id, status, created_at')
      .eq('batch_id', batchId)
      .eq('type', 'ocr')
      .order('created_at', { ascending: false })

    if (jobCheckError) {
      return NextResponse.json({ 
        error: "Failed to check existing jobs",
        detail: jobCheckError.message 
      }, { status: 500 })
    }

    let job
    const activeJob = existingJobs?.find(j => ['queued', 'processing'].includes(j.status))
    
    if (activeJob) {
      // Reuse existing active job
      job = activeJob
      console.log(`[Test OCR] Reusing existing ${activeJob.status} job:`, job.id)
    } else {
      // Create new OCR job only if no active jobs exist
      const { data: newJob, error: jobError } = await supabase
        .from('jobs')
        .insert({
          profile_id: batch.profile_id,
          batch_id: batchId,
          type: 'ocr',
          status: 'queued',
          payload: { batch_id: batchId }
        })
        .select()
        .single()

      if (jobError) {
        return NextResponse.json({ 
          error: "Failed to create OCR job",
          detail: jobError.message 
        }, { status: 500 })
      }
      
      job = newJob
      console.log(`[Test OCR] Created new OCR job:`, job.id)
    }


    // Update batch status
    await supabase
      .from('batches')
      .update({ status: 'ocr_processing' })
      .eq('id', batchId)

    // Trigger job processing regardless of whether job is new or reused
    try {
      const processingResponse = await fetch(`${req.nextUrl.origin}/api/jobs/process`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        }
      })
      
      if (processingResponse.ok) {
        console.log(`[Test OCR] Job processing triggered for job ${job.id}`)
      } else {
        console.error(`[Test OCR] Failed to trigger job processing`)
      }
    } catch (processError) {
      console.error('[Test OCR] Error triggering job processing:', processError)
    }

    return NextResponse.json({ 
      success: true,
      message: "OCR job queued successfully",
      job_id: job.id,
      pairs_to_process: pairs.length,
      batch_name: batch.name
    })

  } catch (error) {
    console.error('[Test OCR] Error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
