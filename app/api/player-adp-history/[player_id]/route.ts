import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/libs/supabase/client';

interface NFLTeam {
  team_color: string;
  team_color2: string;
  team_name: string;
}

interface PlayerData {
  player_id: string;
  full_name: string;
  position: string;
  team_abbreviation: string;
  headshot_url: string;
  nfl_teams: NFLTeam;
}

interface Platform {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
}

interface ADPRecord {
  platform_adp: number;
  overall_rank: number;
  position_rank: number;
  created_at: string;
  fantasy_platforms: Platform;
}

interface TransformedADPRecord {
  platform_adp: number;
  overall_rank: number;
  position_rank: number;
  created_at: string;
  platform: Platform;
}

interface PlatformData {
  platform: Platform;
  data: {
    platform_adp: number;
    overall_rank: number;
    position_rank: number;
    created_at: string;
  }[];
}

interface APIResponse {
  player: {
    player_id: string;
    full_name: string;
    position: string;
    team_abbreviation: string;
    headshot_url: string;
    team_color: string;
    team_color2: string;
    team_name: string;
  };
  historical_data: TransformedADPRecord[];
  grouped_by_platform: { [key: string]: PlatformData };
  data_points: number;
  platforms: string[];
}

export async function GET(
  request: NextRequest,
  { params }: { params: { player_id: string } }
) {
  try {
    const { player_id } = params;
    const supabase = createClient();

    if (!player_id) {
      return NextResponse.json(
        { error: 'Player ID is required' },
        { status: 400 }
      );
    }

    // First, get player info with team colors to include in response
    const { data: playerData, error: playerError } = await supabase
      .from('nfl_players')
      .select(`
        player_id, 
        full_name, 
        position, 
        team_abbreviation, 
        headshot_url,
        nfl_teams!inner (
          team_color,
          team_color2,
          team_name
        )
      `)
      .eq('player_id', player_id)
      .single() as unknown as { data: PlayerData | null, error: any };

    if (playerError) {
      console.error('Error fetching player:', playerError);
      return NextResponse.json(
        { error: 'Player not found' },
        { status: 404 }
      );
    }

    // Get historical ADP data with platform information
    const { data: adpData, error: adpError } = await supabase
      .from('adp_values')
      .select(`
        platform_adp,
        overall_rank,
        position_rank,
        created_at,
        platform_id,
        fantasy_platforms!inner(
          id,
          name,
          slug,
          logo_url
        )
      `)
      .eq('player_id', player_id)
      .order('created_at', { ascending: true }) as unknown as { data: ADPRecord[], error: any };

    if (adpError) {
      console.error('Error fetching ADP data:', adpError);
      return NextResponse.json(
        { error: 'Failed to fetch ADP data' },
        { status: 500 }
      );
    }

    // Transform data for easier frontend consumption
    const transformedData = adpData.map((record: ADPRecord) => ({
      platform_adp: record.platform_adp,
      overall_rank: record.overall_rank,
      position_rank: record.position_rank,
      created_at: record.created_at,
      platform: {
        id: record.fantasy_platforms.id,
        name: record.fantasy_platforms.name,
        slug: record.fantasy_platforms.slug,
        logo_url: record.fantasy_platforms.logo_url,
      }
    }));

    // Group data by platform for easier chart rendering
    const groupedByPlatform = transformedData.reduce<{ [key: string]: PlatformData }>((acc, record) => {
      const platformName = record.platform.name;
      if (!acc[platformName]) {
        acc[platformName] = {
          platform: record.platform,
          data: []
        };
      }
      acc[platformName].data.push({
        platform_adp: record.platform_adp,
        overall_rank: record.overall_rank,
        position_rank: record.position_rank,
        created_at: record.created_at,
      });
      return acc;
    }, {});

    // Ensure we have the NFL team data
    const nflTeam = playerData.nfl_teams;
    if (!nflTeam) {
      console.error('NFL team data not found for player:', playerData.player_id);
      return NextResponse.json(
        { error: 'NFL team data not found' },
        { status: 404 }
      );
    }

    const response = {
      player: {
        player_id: playerData.player_id,
        full_name: playerData.full_name,
        position: playerData.position,
        team_abbreviation: playerData.team_abbreviation,
        headshot_url: playerData.headshot_url,
        team_color: nflTeam.team_color,
        team_color2: nflTeam.team_color2,
        team_name: nflTeam.team_name,
      },
      historical_data: transformedData,
      grouped_by_platform: groupedByPlatform,
      data_points: transformedData.length,
      platforms: Object.keys(groupedByPlatform),
    };

    return new NextResponse(
      JSON.stringify(response),
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
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}