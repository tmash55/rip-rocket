import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/libs/supabase/server"

/**
 * Clean up duplicate jobs for debugging/maintenance
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createServiceClient() // Use service client for admin operations

    console.log('[Job Cleanup] Starting cleanup of duplicate jobs...')

    // Find all jobs that might be duplicates
    const { data: allJobs, error: findError } = await supabase
      .from('jobs')
      .select('id, batch_id, type, status, created_at')
      .in('status', ['queued', 'processing'])
      .order('batch_id, type, created_at')

    if (findError) {
      throw findError
    }

    // Group jobs by batch_id + type to find duplicates
    const jobGroups = new Map<string, any[]>()
    
    for (const job of allJobs || []) {
      const key = `${job.batch_id}-${job.type}`
      if (!jobGroups.has(key)) {
        jobGroups.set(key, [])
      }
      jobGroups.get(key)!.push(job)
    }

    // Find groups with more than one job
    const duplicateGroups = Array.from(jobGroups.entries()).filter(([key, jobs]) => jobs.length > 1)
    
    console.log(`[Job Cleanup] Found ${duplicateGroups.length} sets of duplicate jobs`)

    let cleanedUp = 0

    for (const [key, jobs] of duplicateGroups) {
      // Keep the first (oldest) job, mark others as cancelled
      const [keepJob, ...cancelJobs] = jobs.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
      const cancelIds = cancelJobs.map(j => j.id)

      const { error: cancelError } = await supabase
        .from('jobs')
        .update({ 
          status: 'cancelled',
          result: { reason: 'Duplicate job cleanup', cancelled_at: new Date().toISOString() }
        })
        .in('id', cancelIds)

      if (cancelError) {
        console.error(`[Job Cleanup] Error cancelling duplicate jobs for ${key}:`, cancelError)
      } else {
        console.log(`[Job Cleanup] Cancelled ${cancelIds.length} duplicate jobs for ${key}`)
        cleanedUp += cancelIds.length
      }
    }

    return NextResponse.json({
      success: true,
      message: `Cleaned up ${cleanedUp} duplicate jobs`,
      duplicates_found: duplicateGroups.length,
      jobs_cancelled: cleanedUp
    })

  } catch (error) {
    console.error('[Job Cleanup] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    )
  }
}
