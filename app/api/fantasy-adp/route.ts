import { NextResponse } from 'next/server'
import { createClient } from '@/libs/supabase/server'
import { z } from 'zod'

// Force dynamic rendering for this route
export const dynamic = 'force-dynamic'

// Validation schema for request parameters  
const RequestSchema = z.object({
  season: z.string().nullable().optional().transform(val => val ? parseInt(val) : 2025),
  team: z.string().nullable().optional(),
  limit: z.string().nullable().optional().transform(val => val ? parseInt(val) : 300),
  league_size: z.string().nullable().optional().transform(val => val ? parseInt(val) : 12),
}).transform(data => ({
  season_year: data.season,
  position_filter: null as string | null, // Always null - let frontend handle position filtering
  team_filter: data.team || null,
  limit_count: data.limit,
  league_size: data.league_size,
}))

interface ADPPlayer {
  player_id: string
  name: string
  player_position: string
  team: string
  headshot_url: string
  team_color: string
  consensus_rank: number
  consensus_position_rank: number
  consensus_round: number
  consensus_pick: number
  consensus_draft_position: string
  sleeper_rank: number | null
  sleeper_position_rank: number | null
  sleeper_round: number | null
  sleeper_pick: number | null
  sleeper_draft_position: string | null
  espn_rank: number | null
  espn_position_rank: number | null
  espn_round: number | null
  espn_pick: number | null
  espn_draft_position: string | null
  yahoo_rank: number | null
  yahoo_position_rank: number | null
  yahoo_round: number | null
  yahoo_pick: number | null
  yahoo_draft_position: string | null
  nfc_rank: number | null
  nfc_position_rank: number | null
  nfc_round: number | null
  nfc_pick: number | null
  nfc_draft_position: string | null
  // CBS removed
  last_updated: string
}

export async function GET(request: Request) {
  try {
    // Parse and validate URL parameters
    const { searchParams } = new URL(request.url)
    const params = {
      season: searchParams.get('season'),
      team: searchParams.get('team'),
      limit: searchParams.get('limit'),
      league_size: searchParams.get('league_size'),
    }

    console.log('[/api/fantasy-adp] Request params:', params)

    // Validate parameters
    const validatedParams = RequestSchema.parse(params)
    console.log('[/api/fantasy-adp] Validated params:', validatedParams)

    // Create Supabase client
    const supabase = createClient()

    // Call the RPC function
    const { data, error } = await supabase.rpc('get_fantasy_values_enhanced', validatedParams)

    if (error) {
      console.error('[/api/fantasy-adp] Supabase RPC error:', error)
      return NextResponse.json(
        { error: 'Failed to fetch ADP data', details: error.message },
        { status: 500 }
      )
    }

    if (!data || data.length === 0) {
      console.log('[/api/fantasy-adp] No data returned from RPC function')
      return NextResponse.json(
        { error: 'No ADP data found for the given parameters' },
        { status: 404 }
      )
    }

    console.log(`[/api/fantasy-adp] Successfully fetched ${data.length} players`)

    // Transform the data to ensure consistent structure
    const transformedData: ADPPlayer[] = data.map((player: any) => ({
      player_id: player.player_id,
      name: player.name,
      player_position: player.player_position,
      team: player.team,
      headshot_url: player.headshot_url,
      team_color: player.team_color,
      consensus_rank: player.consensus_rank,
      consensus_position_rank: player.consensus_position_rank,
      consensus_round: player.consensus_round,
      consensus_pick: player.consensus_pick,
      consensus_draft_position: player.consensus_draft_position,
      sleeper_rank: player.sleeper_rank,
      sleeper_position_rank: player.sleeper_position_rank,
      sleeper_round: player.sleeper_round,
      sleeper_pick: player.sleeper_pick,
      sleeper_draft_position: player.sleeper_draft_position,
      espn_rank: player.espn_rank,
      espn_position_rank: player.espn_position_rank,
      espn_round: player.espn_round,
      espn_pick: player.espn_pick,
      espn_draft_position: player.espn_draft_position,
      yahoo_rank: player.yahoo_rank,
      yahoo_position_rank: player.yahoo_position_rank,
      yahoo_round: player.yahoo_round,
      yahoo_pick: player.yahoo_pick,
      yahoo_draft_position: player.yahoo_draft_position,
      nfc_rank: player.nfc_rank,
      nfc_position_rank: player.nfc_position_rank,
      nfc_round: player.nfc_round,
      nfc_pick: player.nfc_pick,
      nfc_draft_position: player.nfc_draft_position,
      last_updated: player.last_updated,
    }))

    // Return the data with metadata and caching headers
    return new NextResponse(
      JSON.stringify({
        success: true,
        data: transformedData,
        meta: {
          total_players: transformedData.length,
          filters: {
            season: validatedParams.season_year,
            team: validatedParams.team_filter,
            league_size: validatedParams.league_size,
          },
          last_updated: transformedData[0]?.last_updated || null,
        }
      }),
      {
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'public, max-age=300, stale-while-revalidate=60', // Cache for 5 minutes, allow stale content for 1 minute while revalidating
          'CDN-Cache-Control': 'public, max-age=300', // Cache on CDN for 5 minutes
          'Vercel-CDN-Cache-Control': 'public, max-age=300', // Vercel-specific CDN caching
          'Surrogate-Control': 'public, max-age=300', // Legacy CDN caching header
          'stale-while-revalidate': '60', // Allow serving stale content while revalidating
          'stale-if-error': '86400', // Serve stale content for 24 hours if there's an error
        }
      }
    )

  } catch (error) {
    console.error('[/api/fantasy-adp] Unexpected error:', error)
    
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { 
          error: 'Invalid request parameters', 
          details: error.errors.map(e => `${e.path.join('.')}: ${e.message}`)
        },
        { status: 400 }
      )
    }

    // Handle other errors
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}