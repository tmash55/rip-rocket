import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"
import { CardPairingService } from "@/lib/card-pairing"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { batch_id: string }
}

/**
 * POST /api/batches/[batch_id]/manual-pair
 * Create a manual pair between front and back images
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const batchId = params.batch_id
    const { front_upload_id, back_upload_id } = await req.json()

    if (!front_upload_id) {
      return NextResponse.json({ error: "front_upload_id is required" }, { status: 400 })
    }

    // Verify batch belongs to user
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .eq('profile_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    // Verify uploads belong to this batch and user
    const uploadIds = [front_upload_id]
    if (back_upload_id) uploadIds.push(back_upload_id)

    const { data: uploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('*')
      .eq('batch_id', batchId)
      .eq('profile_id', user.id)
      .in('id', uploadIds)

    if (uploadsError || !uploads || uploads.length !== uploadIds.length) {
      return NextResponse.json({ error: "Invalid upload IDs" }, { status: 400 })
    }

    console.log(`[API] Creating manual pair: front=${front_upload_id}, back=${back_upload_id || 'none'}`)

    // Create manual pair
    const pairingService = new CardPairingService()
    const result = await pairingService.createManualPair(
      front_upload_id,
      back_upload_id,
      batchId,
      user.id
    )

    if (!result.success) {
      return NextResponse.json({ 
        error: "Failed to create manual pair", 
        detail: result.error 
      }, { status: 500 })
    }

    // Get updated pairing status
    const status = await pairingService.getBatchPairingStatus(batchId, user.id)

    return NextResponse.json({
      success: true,
      pair_id: result.pairId,
      status
    })

  } catch (error) {
    console.error('[API] Manual pairing error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
