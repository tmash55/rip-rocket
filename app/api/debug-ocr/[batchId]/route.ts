import { NextRequest, NextResponse } from "next/server"
import { createServiceClient } from "@/libs/supabase/server"
import { OCRProcessor } from "@/lib/ocr-processor"

export async function GET(
  req: NextRequest,
  { params }: { params: { batchId: string } }
) {
  try {
    const batchId = params.batchId
    const supabase = createServiceClient()

    console.log(`[Debug OCR] Debugging batch ${batchId}`)

    // Get batch info
    const { data: batch, error: batchError } = await supabase
      .from('batches')
      .select('*')
      .eq('id', batchId)
      .single()

    if (batchError) {
      return NextResponse.json({ error: "Batch error", detail: batchError }, { status: 500 })
    }

    console.log('[Debug OCR] Batch found:', batch)

    // Get card pairs with full upload info
    const { data: cardPairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select(`
        *,
        front_upload:uploads!card_pairs_front_upload_id_fkey(*),
        back_upload:uploads!card_pairs_back_upload_id_fkey(*)
      `)
      .eq('batch_id', batchId)
      .eq('status', 'paired')

    if (pairsError) {
      return NextResponse.json({ error: "Pairs error", detail: pairsError }, { status: 500 })
    }

    console.log('[Debug OCR] Card pairs found:', cardPairs?.length)
    console.log('[Debug OCR] First pair structure:', JSON.stringify(cardPairs?.[0], null, 2))

    // Test getting a signed URL for the first pair
    if (cardPairs && cardPairs.length > 0) {
      try {
        const firstPair = cardPairs[0]
        console.log('[Debug OCR] Testing signed URL for:', firstPair.front_upload?.storage_path)
        
        // Import CardStorage here to avoid circular imports
        const { CardStorage } = await import('@/lib/storage')
        const signedUrl = await CardStorage.getSignedUrl(
          firstPair.front_upload.storage_path,
          3600,
          supabase
        )
        
        console.log('[Debug OCR] ✅ Signed URL generated successfully')
        
        return NextResponse.json({
          success: true,
          batch,
          pairs_count: cardPairs.length,
          first_pair: firstPair,
          signed_url_test: "SUCCESS",
          signed_url_length: signedUrl.length
        })

      } catch (urlError) {
        console.error('[Debug OCR] ❌ Signed URL failed:', urlError)
        
        return NextResponse.json({
          success: false,
          batch,
          pairs_count: cardPairs.length,
          first_pair: cardPairs[0],
          signed_url_test: "FAILED",
          signed_url_error: urlError.message
        })
      }
    }

    return NextResponse.json({
      success: true,
      batch,
      pairs_count: cardPairs?.length || 0,
      pairs: cardPairs
    })

  } catch (error) {
    console.error('[Debug OCR] Error:', error)
    return NextResponse.json({ 
      error: "Debug failed",
      detail: error.message 
    }, { status: 500 })
  }
}
