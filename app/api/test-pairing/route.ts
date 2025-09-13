import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"
import { CardPairingService } from "@/lib/card-pairing"

export const dynamic = "force-dynamic"

/**
 * POST /api/test-pairing
 * Test pairing for the most recent batch
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    console.log(`[Test] Testing pairing for user ${user.id}`)

    // Get the most recent batch for this user
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('profile_id', user.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (batchError || !batch) {
      return NextResponse.json({ error: "No batches found" }, { status: 404 })
    }

    console.log(`[Test] Testing pairing for batch ${batch.id}`)

    // Run pairing algorithm
    const pairingService = new CardPairingService()
    const result = await pairingService.pairBatchImages(batch.id, user.id)

    console.log(`[Test] Pairing result:`, result)

    // Get final pairing status
    const status = await pairingService.getBatchPairingStatus(batch.id, user.id)

    // Update batch status based on result
    const needsManualPairing = result.orphaned_uploads.length > 0
    const newBatchStatus = needsManualPairing ? 'needs_pairing' : 'paired'
    
    await supabase
      .from('batches')
      .update({ status: newBatchStatus })
      .eq('id', batch.id)

    return NextResponse.json({
      success: true,
      batch_id: batch.id,
      batch_name: batch.name,
      pairing_result: result,
      final_status: status,
      batch_status: newBatchStatus
    })

  } catch (error) {
    console.error('[Test] Pairing test error:', error)
    return NextResponse.json({ 
      error: "Test pairing failed",
      detail: error.message 
    }, { status: 500 })
  }
}
