import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export const dynamic = "force-dynamic"

/**
 * POST /api/test-db-insert
 * Test database insertion directly
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    const { batch_id, front_upload_id, back_upload_id } = await req.json()

    if (!batch_id || !front_upload_id || !back_upload_id) {
      return NextResponse.json({ 
        error: "Missing required fields: batch_id, front_upload_id, back_upload_id" 
      }, { status: 400 })
    }

    console.log(`[Test] Testing database insertion with user ${user.id}`)
    console.log(`[Test] Batch ID: ${batch_id}`)
    console.log(`[Test] Front Upload ID: ${front_upload_id}`)
    console.log(`[Test] Back Upload ID: ${back_upload_id}`)

    // Test 1: Insert card_pairs record
    console.log(`[Test] Step 1: Inserting card_pairs record...`)
    const { data: pairData, error: pairError } = await supabase
      .from('card_pairs')
      .insert({
        profile_id: user.id,
        batch_id: batch_id,
        front_upload_id: front_upload_id,
        back_upload_id: back_upload_id,
        status: 'paired',
        method: 'manual',
        confidence: 1.0
      })
      .select()
      .single()

    if (pairError) {
      console.error('[Test] Card pairs insertion error:', pairError)
      return NextResponse.json({ 
        error: "Failed to insert card pair",
        detail: pairError.message,
        step: "card_pairs_insert"
      }, { status: 500 })
    }

    console.log(`[Test] ✅ Card pair inserted successfully:`, pairData)

    // Test 2: Update upload statuses
    console.log(`[Test] Step 2: Updating upload statuses...`)
    const { error: updateError } = await supabase
      .from('uploads')
      .update({ status: 'paired' })
      .in('id', [front_upload_id, back_upload_id])

    if (updateError) {
      console.error('[Test] Upload status update error:', updateError)
      return NextResponse.json({ 
        error: "Failed to update upload statuses",
        detail: updateError.message,
        step: "uploads_update",
        pair_created: true,
        pair_id: pairData.id
      }, { status: 500 })
    }

    console.log(`[Test] ✅ Upload statuses updated successfully`)

    // Test 3: Verify the results
    const { data: finalPair, error: verifyError } = await supabase
      .from('card_pairs')
      .select('*')
      .eq('id', pairData.id)
      .single()

    const { data: finalUploads, error: uploadsError } = await supabase
      .from('uploads')
      .select('*')
      .in('id', [front_upload_id, back_upload_id])

    return NextResponse.json({
      success: true,
      test_completed: true,
      pair_created: pairData,
      uploads_updated: finalUploads,
      verification: {
        pair_exists: !!finalPair,
        uploads_paired: finalUploads?.every(u => u.status === 'paired')
      }
    })

  } catch (error) {
    console.error('[Test] Database test error:', error)
    return NextResponse.json({ 
      error: "Test failed",
      detail: error.message 
    }, { status: 500 })
  }
}
