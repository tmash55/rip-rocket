import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { id: string }
}

/**
 * GET /api/debug-batch/[id]
 * Debug info about a batch - uploads, pairs, jobs, etc.
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const batchId = params.id

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
      .order('filename')

    // Get card pairs
    const { data: pairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select('*')
      .eq('batch_id', batchId)
      .eq('profile_id', user.id)

    // Get jobs
    const { data: jobs, error: jobsError } = await supabase
      .from('jobs')
      .select('*')
      .eq('batch_id', batchId)
      .eq('profile_id', user.id)
      .order('created_at')

    // Get job events
    const { data: jobEvents, error: eventsError } = await supabase
      .from('job_events')
      .select('*')
      .in('job_id', jobs?.map(j => j.id) || [])
      .order('created_at')

    return NextResponse.json({
      batch,
      uploads: uploads || [],
      pairs: pairs || [],
      jobs: jobs || [],
      job_events: jobEvents || [],
      counts: {
        total_uploads: uploads?.length || 0,
        paired_uploads: uploads?.filter(u => u.status === 'paired').length || 0,
        orphaned_uploads: uploads?.filter(u => u.status === 'orphaned').length || 0,
        pairs_created: pairs?.length || 0,
        jobs_count: jobs?.length || 0
      }
    })

  } catch (error) {
    console.error('[Debug] Error:', error)
    return NextResponse.json({ 
      error: "Debug failed",
      detail: error.message 
    }, { status: 500 })
  }
}
