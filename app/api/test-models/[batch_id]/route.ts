import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/libs/supabase/server'
import { AIVision } from '@/lib/openai-vision'

/**
 * Test multiple AI models on the same batch to compare accuracy
 */
export async function POST(
  request: NextRequest,
  { params }: { params: { batch_id: string } }
) {
  try {
    const { batch_id } = params
    console.log(`[Model Test] Testing batch: ${batch_id}`)

    const supabase = createServiceClient()

    // Get paired cards for this batch
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
      .limit(1) // Test just one pair

    if (pairsError) {
      console.error('[Model Test] Error fetching pairs:', pairsError)
      return NextResponse.json({ error: 'Failed to fetch card pairs' }, { status: 500 })
    }

    if (!pairs || pairs.length === 0) {
      return NextResponse.json({ error: 'No paired cards found in batch' }, { status: 404 })
    }

    const pair = pairs[0]
    console.log(`[Model Test] Testing pair: ${pair.id}`)

    // Test both models
    const results = await Promise.all([
      testModel('gpt-4o-mini', pair),
      testModel('gpt-4o', pair)
    ])

    return NextResponse.json({
      success: true,
      batch_id,
      pair_id: pair.id,
      batch_name: (pair as any).batches.name,
      results: {
        'gpt-4o-mini': results[0],
        'gpt-4o': results[1]
      }
    })

  } catch (error) {
    console.error('[Model Test] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

async function testModel(model: string, pair: any) {
  const startTime = Date.now()
  
  try {
    console.log(`[${model}] Starting analysis...`)
    
    // Create temporary AIVision instance with specific model
    const result = await AIVision.analyzeCardPair(
      pair.front_image_url,
      pair.back_image_url,
      model
    )
    
    const duration = Date.now() - startTime
    console.log(`[${model}] Analysis completed in ${duration}ms`)
    
    return {
      success: true,
      duration,
      model,
      analysis: result,
      cost_estimate: estimateCost(model, result.token_usage || {})
    }
    
  } catch (error) {
    const duration = Date.now() - startTime
    console.error(`[${model}] Error:`, error)
    
    return {
      success: false,
      duration,
      model,
      error: error instanceof Error ? error.message : 'Unknown error',
      cost_estimate: null as ReturnType<typeof estimateCost>
    }
  }
}

function estimateCost(model: string, tokenUsage: any) {
  const rates = {
    'gpt-4o-mini': { input: 0.15, output: 0.60 }, // per 1K tokens
    'gpt-4o': { input: 0.25, output: 1.00 }
  }
  
  const rate = rates[model as keyof typeof rates]
  if (!rate || !tokenUsage.prompt_tokens) return null
  
  const inputCost = (tokenUsage.prompt_tokens / 1000) * rate.input
  const outputCost = (tokenUsage.completion_tokens / 1000) * rate.output
  
  return {
    input_tokens: tokenUsage.prompt_tokens,
    output_tokens: tokenUsage.completion_tokens,
    total_tokens: tokenUsage.total_tokens,
    input_cost: inputCost,
    output_cost: outputCost,
    total_cost: inputCost + outputCost,
    model
  }
}
