import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"
import { CardPairingService } from "@/lib/card-pairing"

export const dynamic = "force-dynamic"

interface RouteParams {
  params: { batch_id: string }
}

/**
 * POST /api/batches/[batch_id]/pair
 * Trigger automatic pairing for a batch
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

    console.log(`[API] Starting pairing for batch ${batchId}`)

    // Run pairing algorithm
    const pairingService = new CardPairingService()
    const result = await pairingService.pairBatchImages(batchId, user.id)

    if (!result.success) {
      return NextResponse.json({ 
        error: "Pairing failed", 
        details: result.errors 
      }, { status: 500 })
    }

    // Get final pairing status
    const status = await pairingService.getBatchPairingStatus(batchId, user.id)

    console.log(`[API] Pairing complete: ${result.pairs_created} pairs created, ${result.orphaned_uploads.length} orphaned`)

    return NextResponse.json({
      success: true,
      pairs_created: result.pairs_created,
      orphaned_count: result.orphaned_uploads.length,
      status
    })

  } catch (error) {
    console.error('[API] Pairing error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}

/**
 * GET /api/batches/[batch_id]/pair
 * Get current pairing status for a batch
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const batchId = params.batch_id

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

    // Get pairing status
    const pairingService = new CardPairingService()
    const status = await pairingService.getBatchPairingStatus(batchId, user.id)

    return NextResponse.json(status)

  } catch (error) {
    console.error('[API] Get pairing status error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
