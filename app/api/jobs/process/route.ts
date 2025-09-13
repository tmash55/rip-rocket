import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/libs/supabase/server"
import { CardPairingService } from "@/lib/card-pairing"
import { OCRProcessor } from "@/lib/ocr-processor"

export const dynamic = "force-dynamic"

/**
 * POST /api/jobs/process
 * Process queued background jobs
 * This could be triggered by a cron job or webhook
 */
export async function POST(req: NextRequest) {
  try {
    // Use service role client to bypass RLS for job processing
    const supabase = createServiceClient()
    
    console.log('[Jobs] Starting job processor...')
    
    // Get queued jobs (pairing and OCR)
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .in('type', ['pairing', 'ocr'])
      .eq('status', 'queued')
      .order('created_at')
      .limit(10) // Process up to 10 jobs at a time

    if (jobsError) {
      console.error('[Jobs] Error fetching jobs:', jobsError)
      return NextResponse.json({ error: "Failed to fetch jobs", detail: jobsError.message }, { status: 500 })
    }

    console.log(`[Jobs] Found ${jobs?.length || 0} queued jobs`)

    if (!jobs || jobs.length === 0) {
      return NextResponse.json({ message: "No jobs to process", checked_types: ['pairing', 'ocr'], checked_status: ['queued'] })
    }

    console.log(`[Jobs] Processing ${jobs.length} jobs`)

    const results = []
    const pairingService = new CardPairingService(supabase) // Pass service client
    const ocrProcessor = new OCRProcessor(supabase) // Pass service client

    for (const job of jobs) {
      try {
        // Mark job as running
        await supabase
          .from('jobs')
          .update({ 
            status: 'running',
            started_at: new Date().toISOString()
          })
          .eq('id', job.id)

        console.log(`[Jobs] Processing ${job.type} job ${job.id} for batch ${job.batch_id}`)

        let result: any

        if (job.type === 'pairing') {
          // Run pairing algorithm
          result = await pairingService.pairBatchImages(job.batch_id, job.profile_id)
        } else if (job.type === 'ocr') {
          // Run OCR processing
          result = await ocrProcessor.processBatchOCR(job.batch_id, job.profile_id)
        } else {
          throw new Error(`Unknown job type: ${job.type}`)
        }

        if (result.success) {
          // Mark job as completed
          await supabase
            .from('jobs')
            .update({ 
              status: 'completed',
              completed_at: new Date().toISOString(),
              result: result
            })
            .eq('id', job.id)

          // Update batch status based on job type
          if (job.type === 'pairing') {
            const needsManualPairing = result.orphaned_uploads?.length > 0
            await supabase
              .from('batches')
              .update({ 
                status: needsManualPairing ? 'needs_pairing' : 'paired'
              })
              .eq('id', job.batch_id)
          } else if (job.type === 'ocr') {
            await supabase
              .from('batches')
              .update({ 
                status: 'ocr_complete'
              })
              .eq('id', job.batch_id)
          }

          // Log job event (fixed column names)
          try {
            let eventMessage: string
            if (job.type === 'pairing') {
              eventMessage = `Pairing completed: ${result.pairs_created} pairs created, ${result.orphaned_uploads?.length || 0} orphaned`
            } else if (job.type === 'ocr') {
              eventMessage = `OCR completed: ${result.cards_created} cards processed, ${result.errors?.length || 0} errors`
            } else {
              eventMessage = `Job completed: ${job.type}`
            }

            const jobEventData = {
              job_id: job.id,
              level: 'info',
              message: eventMessage,
              data: result
              // 'at' field has default value, so we don't need to specify it
            }
            console.log('[Jobs] Inserting job event:', JSON.stringify(jobEventData, null, 2))
            
            const { error: jobEventError } = await supabase
              .from('job_events')
              .insert(jobEventData)
              
            if (jobEventError) {
              console.error('[Jobs] Job event insertion failed:', jobEventError)
            } else {
              console.log('[Jobs] Job event inserted successfully')
            }
          } catch (eventError) {
            console.log('[Jobs] Job event error:', eventError.message)
          }

          results.push({
            job_id: job.id,
            batch_id: job.batch_id,
            status: 'completed',
            pairs_created: result.pairs_created || 0,
            orphaned_count: result.orphaned_uploads?.length || 0
          })

        } else {
          // Mark job as failed
          await supabase
            .from('jobs')
            .update({ 
              status: 'failed',
              completed_at: new Date().toISOString(),
              error: result.errors.join('; ')
            })
            .eq('id', job.id)

          // Log job event
          await supabase
            .from('job_events')
            .insert({
              job_id: job.id,
              level: 'error',
              message: `Pairing failed: ${result.errors.join('; ')}`,
              data: result
            })

          results.push({
            job_id: job.id,
            batch_id: job.batch_id,
            status: 'failed',
            errors: result.errors
          })
        }

      } catch (error) {
        console.error(`[Jobs] Error processing job ${job.id}:`, error)

        // Mark job as failed
        await supabase
          .from('jobs')
          .update({ 
            status: 'failed',
            completed_at: new Date().toISOString(),
            error: error.message
          })
          .eq('id', job.id)

        // Log job event
        await supabase
          .from('job_events')
          .insert({
            job_id: job.id,
            level: 'error',
            message: `Job processing error: ${error.message}`,
            data: { error: error.message }
          })

        results.push({
          job_id: job.id,
          batch_id: job.batch_id,
          status: 'failed',
          error: error.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      processed_jobs: results?.length || 0,
      results: results || []
    })

  } catch (error) {
    console.error('[Jobs] Job processor error:', error)
    return NextResponse.json({ 
      error: "Job processor failed",
      detail: error.message 
    }, { status: 500 })
  }
}
