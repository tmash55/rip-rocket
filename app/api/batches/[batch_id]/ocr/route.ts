import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export async function POST(
  req: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const batchId = params.batch_id
    const supabase = createClient()

    // Get the authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Verify the batch belongs to this user and is ready for OCR
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .eq('profile_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    if (batch.status !== 'paired') {
      return NextResponse.json({ 
        error: "Batch must be paired before OCR processing",
        current_status: batch.status 
      }, { status: 400 })
    }

    // Check if there are any paired cards to process
    const { data: pairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select('id')
      .eq('batch_id', batchId)
      .eq('profile_id', user.id)
      .eq('status', 'paired')

    if (pairsError) {
      return NextResponse.json({ error: "Failed to check card pairs" }, { status: 500 })
    }

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ 
        error: "No paired cards found for OCR processing" 
      }, { status: 400 })
    }

    // Create OCR job
    const { error: jobError } = await supabase
      .from('jobs')
      .insert({
        profile_id: user.id,
        batch_id: batchId,
        type: 'ocr',
        status: 'queued',
        payload: { batch_id: batchId }
      })

    if (jobError) {
      return NextResponse.json({ 
        error: "Failed to create OCR job",
        detail: jobError.message 
      }, { status: 500 })
    }

    // Update batch status
    await supabase
      .from('batches')
      .update({ status: 'ocr_processing' })
      .eq('id', batchId)

    return NextResponse.json({ 
      success: true,
      message: "OCR job queued successfully",
      pairs_to_process: pairs.length
    })

  } catch (error) {
    console.error('OCR trigger error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
