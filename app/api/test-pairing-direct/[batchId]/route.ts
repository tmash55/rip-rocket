import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"
import { CardPairingService } from "@/lib/card-pairing"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { batchId: string }
}

/**
 * POST /api/test-pairing-direct/[batchId]
 * Test pairing directly with full console logging
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const batchId = params.batchId

    // Verify batch exists
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .eq('profile_id', user.id)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "Batch not found" }, { status: 404 })
    }

    console.log(`[Test] Starting direct pairing test for batch ${batchId}`)
    console.log(`[Test] User ID: ${user.id}`)
    console.log(`[Test] Batch name: ${batch.name}`)

    // Run pairing algorithm with full logging
    const pairingService = new CardPairingService()
    const result = await pairingService.pairBatchImages(batchId, user.id)

    console.log(`[Test] Pairing result:`, JSON.stringify(result, null, 2))

    // Get final status
    const status = await pairingService.getBatchPairingStatus(batchId, user.id)
    console.log(`[Test] Final status:`, JSON.stringify(status, null, 2))

    // Update batch status manually
    const needsManualPairing = result.orphaned_uploads.length > 0
    const newBatchStatus = needsManualPairing ? 'needs_pairing' : 'paired'
    
    console.log(`[Test] Updating batch status to: ${newBatchStatus}`)
    
    const { error: updateError } = await supabase
      .from('batches')
      .update({ status: newBatchStatus })
      .eq('id', batchId)
      .eq('profile_id', user.id)

    if (updateError) {
      console.error('[Test] Error updating batch status:', updateError)
    }

    return NextResponse.json({
      success: true,
      test_completed: true,
      batch_id: batchId,
      user_id: user.id,
      pairing_result: result,
      final_status: status,
      batch_status: newBatchStatus,
      console_logs: "Check server console for detailed logs"
    })

  } catch (error) {
    console.error('[Test] Direct pairing test error:', error)
    return NextResponse.json({ 
      error: "Test failed",
      detail: error.message 
    }, { status: 500 })
  }
}
