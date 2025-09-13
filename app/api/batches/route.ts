import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

export const dynamic = "force-dynamic"

export async function GET(req: NextRequest) {
  try {
    const supabase = createClient()
    const url = new URL(req.url)
    
    // Get authenticated user
    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 })
    }

    // Get user profile
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (profileError || !profile) {
      return NextResponse.json({ error: "Profile not found" }, { status: 404 })
    }

    // Parse query parameters
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 100)
    const offset = parseInt(url.searchParams.get('offset') || '0')
    const status = url.searchParams.get('status')

    // Build query
    let query = supabase
      .from('batches')
      .select(`
        *,
        uploads:uploads(count),
        card_pairs:card_pairs(count),
        cards:cards(count),
        listings:listings(count)
      `)
      .eq('profile_id', profile.id)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1)

    // Add status filter if provided
    if (status) {
      query = query.eq('status', status)
    }

    const { data: batches, error: batchesError } = await query

    if (batchesError) {
      console.error('[Batches List] Failed to get batches:', batchesError)
      return NextResponse.json({ error: "Failed to get batches" }, { status: 500 })
    }

    // Get total count for pagination
    let countQuery = supabase
      .from('batches')
      .select('*', { count: 'exact', head: true })
      .eq('profile_id', profile.id)

    if (status) {
      countQuery = countQuery.eq('status', status)
    }

    const { count, error: countError } = await countQuery

    if (countError) {
      console.error('[Batches List] Failed to get count:', countError)
    }

    // Format response
    const formattedBatches = batches?.map(batch => ({
      ...batch,
      upload_count: batch.uploads?.[0]?.count || 0,
      pair_count: batch.card_pairs?.[0]?.count || 0,
      card_count: batch.cards?.[0]?.count || 0,
      listing_count: batch.listings?.[0]?.count || 0
    })) || []

    return NextResponse.json({
      batches: formattedBatches,
      pagination: {
        total: count || 0,
        limit,
        offset,
        has_more: (count || 0) > offset + limit
      }
    })

  } catch (error) {
    console.error('[Batches List] Unexpected error:', error)
    return NextResponse.json({ 
      error: "Internal server error",
      detail: error.message 
    }, { status: 500 })
  }
}
