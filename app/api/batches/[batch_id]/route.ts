import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export async function GET(
  req: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const supabase = createClient()
    const batch_id = params.batch_id
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get batch info
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batch_id)
      .eq('profile_id', user.id) // Ensure user owns this batch
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Get pairing info
    const { data: pairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select('status')
      .eq('batch_id', batch_id)

    if (pairsError) {
      console.error('Error fetching pairs:', pairsError)
    }

    const pairedCount = pairs?.filter(p => p.status === 'paired').length || 0
    
    // Determine status based on batch status and pairing results
    let status = batch.status
    if (batch.status === 'processing' && pairedCount > 0) {
      status = 'paired'
    }

    return NextResponse.json({
      success: true,
      batch: {
        id: batch.id,
        name: batch.name,
        status: status,
        total_files: batch.total_files,
        progress: batch.progress,
        paired_count: pairedCount,
        created_at: batch.created_at
      }
    })

  } catch (error) {
    console.error('[Batch API] Error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
