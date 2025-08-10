// TypeScript types for Fantasy ADP data

export interface ADPPlayer {
    player_id: string
    name: string
    player_position: string
    team: string
    headshot_url: string
    team_color: string
    
    // Consensus data (clean integers)
    consensus_rank: number
    consensus_position_rank: number
    consensus_round: number
    consensus_pick: number
    consensus_draft_position: string
    
    // Platform-specific data (may have fractional ranks)
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
  
  export interface ADPResponse {
    success: boolean
    data: ADPPlayer[]
    error?: string
    meta: {
      total_players: number
      filters: {
        season: number
        team: string | null
        league_size: number
      }
      last_updated: string | null
    }
  }
  
  export interface ADPFiltersState {
    position: string | null
    league_size: number
    search: string
    comparison_mode: 'nfc' | 'consensus'
    visible_platforms: {
      nfc: boolean
      consensus: boolean
      sleeper: boolean
      espn: boolean
      yahoo: boolean
      // CBS removed
    }
    sort_by: 'nfc' | 'consensus' | 'sleeper' | 'espn' | 'yahoo'
    sort_direction: 'asc' | 'desc'
    // Pagination options
    pagination_enabled: boolean
    current_page: number
    page_size: number
  }
  
  export type PositionFilter = 'ALL' | 'QB' | 'RB' | 'WR' | 'TE' | 'FLEX'
  
  export const POSITION_OPTIONS: { value: PositionFilter; label: string }[] = [
    { value: 'ALL', label: 'ALL' },
    { value: 'QB', label: 'QB' },
    { value: 'RB', label: 'RB' },
    { value: 'WR', label: 'WR' },
    { value: 'TE', label: 'TE' },
    { value: 'FLEX', label: 'FLEX' },
  ]
  
  export type ComparisonMode = 'nfc' | 'consensus'
  
  export const COMPARISON_OPTIONS: { value: ComparisonMode; label: string }[] = [
    { value: 'nfc', label: 'Compare to NFC' },
    { value: 'consensus', label: 'Compare to Consensus' },
  ]
  
  export const PLATFORM_INFO = {
    nfc: {
      label: 'NFC',
      description: 'National Fantasy Championships - High stakes, sharper ADP from experienced players',
      color: 'blue'
    },
    consensus: {
      label: 'Consensus',
      description: 'Average ranking across Sleeper, ESPN, and Yahoo platforms',
      color: 'purple'
    },
    sleeper: {
      label: 'Sleeper',
      description: 'Popular fantasy platform known for user-friendly interface and dynasty leagues',
      color: 'green'
    },
    espn: {
      label: 'ESPN',
      description: 'Major sports network with traditional fantasy football rankings',
      color: 'red'
    },
    yahoo: {
      label: 'Yahoo',
      description: 'Established fantasy platform with large user base and reliable rankings',
      color: 'purple'
    }
  }
  
  export const LEAGUE_SIZE_OPTIONS = [
    { value: 8, label: '8 Team' },
    { value: 10, label: '10 Team' },
    { value: 12, label: '12 Team' },
    { value: 14, label: '14 Team' },
    { value: 16, label: '16 Team' },
  ]
  
  export const PAGE_SIZE_OPTIONS = [
    { value: 25, label: "25 per page" },
    { value: 50, label: "50 per page" },
    { value: 100, label: "100 per page" }
  ] as const
  
  // Platform configuration for display
  export interface PlatformConfig {
    key: string
    name: string
    shortName: string
    color: string
    logo?: string
  }
  
  export const PLATFORMS: PlatformConfig[] = [
    { key: 'consensus', name: 'Consensus', shortName: 'CON', color: 'bg-purple-500' },
    { key: 'sleeper', name: 'Sleeper', shortName: 'SLP', color: 'bg-[#15273A]' },
    { key: 'espn', name: 'ESPN', shortName: 'ESPN', color: 'bg-red-500' },
    { key: 'yahoo', name: 'Yahoo', shortName: 'YAH', color: 'bg-purple-600' },
    { key: 'nfc', name: 'NFC', shortName: 'NFC', color: 'bg-blue-500' },
  ]