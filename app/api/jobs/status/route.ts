import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/libs/supabase/server"

/**
 * Get status of all jobs for debugging
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = createServiceClient()

    const { data: jobs, error } = await supabase
      .from('jobs')
      .select('id, batch_id, type, status, created_at')
      .order('created_at', { ascending: false })
      .limit(20)

    if (error) {
      throw error
    }

    return NextResponse.json({
      success: true,
      jobs: jobs || [],
      total: jobs?.length || 0
    })

  } catch (error) {
    console.error('[Job Status] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', detail: error.message },
      { status: 500 }
    )
  }
}
