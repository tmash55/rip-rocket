import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/libs/supabase/server'
import { OpenAIVisionOCR } from '@/lib/openai-vision'

/**
 * Test GPT-4o model specifically
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const { batch_id } = params
    console.log(`[GPT-4o Test] Testing batch: ${batch_id}`)

    const supabase = createServerClient()

    // Get one paired card for this batch
    const { data: pairs, error: pairsError } = await supabase
      .from('card_pairs')
      .select(`
        id,
        front_image_url,
        back_image_url,
        batches!inner(name)
      `)
      .eq('batch_id', batch_id)
      .eq('pairing_status', 'paired')
      .limit(1)

    if (pairsError) {
      console.error('[GPT-4o Test] Error fetching pairs:', pairsError)
      return NextResponse.json({ error: 'Failed to fetch card pairs' }, { status: 500 })
    }

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: 'No paired cards found in batch' }, { status: 404 })
    }

    const pair = pairs[0]
    console.log(`[GPT-4o Test] Testing pair: ${pair.id}`)

    // Test GPT-4o model
    const result = await OpenAIVisionOCR.analyzeCard(pair.front_image_url, 'gpt-4o')

    return NextResponse.json({
      success: true,
      batch_id,
      pair_id: pair.id,
      batch_name: (pair as any).batches.name,
      model: 'gpt-4o',
      result,
      cost_analysis: result.token_usage ? {
        prompt_tokens: result.token_usage.prompt_tokens,
        completion_tokens: result.token_usage.completion_tokens,
        total_tokens: result.token_usage.total_tokens,
        estimated_cost: (result.token_usage.prompt_tokens / 1000 * 0.25) + (result.token_usage.completion_tokens / 1000 * 1.00)
      } : null
    })

  } catch (error) {
    console.error('[GPT-4o Test] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}
