'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ADPPlayer, ADPResponse, ADPFiltersState } from './types'
import ADPFilters from './ADPFilters'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { TrendingUp, TrendingDown, Target, Zap, AlertTriangle, Star, ArrowUp, ArrowDown } from 'lucide-react'
import PlayerAvatar from './PlayerAvatar'
import PlayerADPModal from './PlayerADPModal'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

// Fetch function for React Query (shared with ADPSmashBoard)
const fetchADPData = async (leagueSize: number): Promise<ADPResponse> => {
  const response = await fetch(`/api/fantasy-adp?league_size=${leagueSize}&limit=300`)
  if (!response.ok) {
    throw new Error('Failed to fetch ADP data')
  }
  return response.json()
}

// Platform mapping for cleaner display
const PLATFORM_NAMES: Record<string, string> = {
  'espn': 'ESPN',
  'yahoo': 'Yahoo',
  'sleeper': 'Sleeper',
  'nfc': 'NFC',
  'consensus': 'Consensus'
}

// Platform colors for consistent theming
const PLATFORM_COLORS: Record<string, string> = {
  'ESPN': '#de0000',
  'Yahoo': '#6002D2', 
  'Sleeper': '#15273A',
  'NFC': '#23A0A0',
  'Consensus': '#F97316'
}

interface PlayerVariance extends ADPPlayer {
  variance_score: number
  best_platform: string
  worst_platform: string
  best_rank: number
  worst_rank: number
  consensus_rank: number
  variance_type: 'value' | 'bust' | 'neutral'
  platform_differences: Record<string, number>
  value_score: number
  value_opportunities: Array<{platform: string, rank: number, difference: number}>
  bust_risks: Array<{platform: string, rank: number, difference: number}>
}

export default function ADPValuesBoard() {
  const [filters, setFilters] = useState<ADPFiltersState>({
    position: null,
    league_size: 12,
    search: '',
    comparison_mode: 'consensus',
    visible_platforms: {
      nfc: true,
      consensus: true,
      sleeper: true,
      espn: true,
      yahoo: true
    },
    sort_by: 'consensus',
    sort_direction: 'asc',
    pagination_enabled: false,
    current_page: 1,
    page_size: 50
  })

  const [selectedPlatform, setSelectedPlatform] = useState<string>('all')
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Use React Query for data fetching with shared cache key
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['adp-data', filters.league_size],
    queryFn: () => fetchADPData(filters.league_size),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const players = data?.data || []

  // Calculate variance analysis with NFC as baseline
  const playersWithVariance = useMemo(() => {
    if (!players.length) return []

    return players.map((player): PlayerVariance => {
      // Use NFC as our baseline (most accurate consensus)
      const nfcRank = player.nfc_rank
      if (!nfcRank) return null // Skip players without NFC rank

      // Get all platform ranks for this player
      const ranks = {
        espn: player.espn_rank,
        yahoo: player.yahoo_rank,
        sleeper: player.sleeper_rank,
        consensus: player.consensus_rank
      }

      // Filter out null ranks and calculate differences from NFC
      const platformDifferences: Record<string, number> = {}
      const validPlatforms: Array<{platform: string, rank: number, difference: number}> = []
      
      Object.entries(ranks).forEach(([platform, rank]) => {
        if (rank !== null) {
          const difference = rank - nfcRank // Positive = worse than NFC, Negative = better than NFC
          platformDifferences[platform] = difference
          validPlatforms.push({ platform, rank, difference })
        }
      })

      if (validPlatforms.length < 2) return null

      // Find best and worst differences
      const bestDiff = Math.min(...validPlatforms.map(p => p.difference))
      const worstDiff = Math.max(...validPlatforms.map(p => p.difference))
      const variance = Math.abs(worstDiff - bestDiff)

      // Find platforms with best and worst differences
      const bestPlatform = validPlatforms.find(p => p.difference === bestDiff)
      const worstPlatform = validPlatforms.find(p => p.difference === worstDiff)

      // Determine value opportunities (platforms where player is ranked worse than NFC = value)
      const valueOpportunities = validPlatforms.filter(p => p.difference >= 8) // 8+ ranks worse than NFC
      const bustRisks = validPlatforms.filter(p => p.difference <= -8) // 8+ ranks better than NFC

      let varianceType: 'value' | 'bust' | 'neutral' = 'neutral'
      if (valueOpportunities.length > 0) {
        varianceType = 'value'
      } else if (bustRisks.length > 0) {
        varianceType = 'bust'
      }

      return {
        ...player,
        variance_score: variance,
        best_platform: PLATFORM_NAMES[bestPlatform?.platform || ''] || bestPlatform?.platform || '',
        worst_platform: PLATFORM_NAMES[worstPlatform?.platform || ''] || worstPlatform?.platform || '',
        best_rank: bestPlatform?.rank || 0,
        worst_rank: worstPlatform?.rank || 0,
        consensus_rank: nfcRank, // Use NFC as our consensus
        variance_type: varianceType,
        platform_differences: platformDifferences,
        value_score: bestDiff, // How much better the best platform difference is
        value_opportunities: valueOpportunities,
        bust_risks: bustRisks
      }
    }).filter(Boolean).filter(player => player.variance_score >= 10) // Only significant variance
}, [players])

  // Filter and sort players based on current filters
  const filteredPlayers = useMemo(() => {
    let filtered = playersWithVariance

    // Position filter
    if (filters.position) {
      filtered = filtered.filter(player => player.player_position === filters.position)
    }

    // Search filter
    if (filters.search) {
      const searchTerm = filters.search.toLowerCase()
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm) ||
        player.team.toLowerCase().includes(searchTerm)
      )
    }

    // Platform specific filter - only show players with opportunities/risks on selected platform
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(player => {
        // Check if player has value opportunities on this platform
        const hasValueOpportunity = player.value_opportunities?.some((opp: {platform: string, rank: number, difference: number}) => 
          opp.platform === selectedPlatform
        )
        
        // Check if player has bust risks on this platform
        const hasBustRisk = player.bust_risks?.some((risk: {platform: string, rank: number, difference: number}) => 
          risk.platform === selectedPlatform
        )
        
        // Player must have either a value opportunity OR a bust risk on the selected platform
        return hasValueOpportunity || hasBustRisk
      })
    }

    return filtered
  }, [playersWithVariance, filters.position, filters.search, selectedPlatform])

  // Separate into values and busts with better sorting
  const values = filteredPlayers
    .filter(player => player.variance_type === 'value')
    .sort((a, b) => a.value_score - b.value_score) // Best values first (most negative)
    
  const busts = filteredPlayers
    .filter(player => player.variance_type === 'bust')
    .sort((a, b) => b.variance_score - a.variance_score) // Highest variance first
    
  const allVariance = filteredPlayers
    .filter(player => player.variance_score >= 15)
    .sort((a, b) => b.variance_score - a.variance_score)

  const handlePlayerClick = (playerId: string) => {
    setIsModalOpen(false)
    setSelectedPlayerId(null)
    setTimeout(() => {
      setSelectedPlayerId(playerId)
      setIsModalOpen(true)
    }, 50)
  }

  const handleCloseModal = () => {
    setIsModalOpen(false)
    setSelectedPlayerId(null)
  }

  const handleFiltersChange = (newFilters: Partial<ADPFiltersState>) => {
    setFilters(prev => ({ ...prev, ...newFilters }))
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading variance analysis...</p>
        </div>
      </div>
    )
  }

  if (queryError) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <p className="text-destructive">Error loading ADP data. Please try again.</p>
      </div>
    )
  }

  return (
    <TooltipProvider>
      {/* Filters */}
      <div className="mb-8">
        <div className="mb-4">
          <ADPFilters 
            filters={filters}
            onFiltersChange={handleFiltersChange}
          />
        </div>
        
        {/* Platform Filter */}
        <Card className="p-4 bg-gradient-to-r from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5 border-l-4 border-l-primary">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-semibold text-muted-foreground mr-2">Focus Platform:</span>
            <Button
              variant={selectedPlatform === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedPlatform('all')}
              className="text-xs font-medium"
            >
              All Platforms
            </Button>
            {Object.entries(PLATFORM_NAMES).map(([key, name]) => (
              <Button
                key={key}
                variant={selectedPlatform === key ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedPlatform(key)}
                className="text-xs font-medium transition-all duration-200"
                style={{
                  borderColor: selectedPlatform === key ? PLATFORM_COLORS[name] : undefined,
                  backgroundColor: selectedPlatform === key ? `${PLATFORM_COLORS[name]}15` : undefined,
                  color: selectedPlatform === key ? PLATFORM_COLORS[name] : undefined
                }}
              >
                <div 
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: PLATFORM_COLORS[name] }}
                />
                {name}
              </Button>
            ))}
          </div>
        </Card>
      </div>

      {/* Enhanced Summary Stats with better theme support */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card className="relative p-6 text-center overflow-hidden bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/60 dark:to-emerald-950/60 border-green-200/80 dark:border-green-700/60 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 dark:bg-green-400/15 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="w-14 h-14 bg-green-500/15 dark:bg-green-400/25 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 border border-green-200/60 dark:border-green-600/50">
            <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-400" />
          </div>
          <h3 className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">{values.length}</h3>
          <p className="text-sm font-semibold text-green-700 dark:text-green-300">Potential Values</p>
          <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">Players ranked lower on some platforms vs NFC</p>
        </Card>
        
        <Card className="relative p-6 text-center overflow-hidden bg-gradient-to-br from-red-50/80 to-rose-50/80 dark:from-red-950/60 dark:to-rose-950/60 border-red-200/80 dark:border-red-700/60 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 dark:bg-red-400/15 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="w-14 h-14 bg-red-500/15 dark:bg-red-400/25 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 border border-red-200/60 dark:border-red-600/50">
            <AlertTriangle className="w-7 h-7 text-red-600 dark:text-red-400" />
          </div>
          <h3 className="text-3xl font-black text-red-600 dark:text-red-400 mb-1">{busts.length}</h3>
          <p className="text-sm font-semibold text-red-700 dark:text-red-300">Potential Busts</p>
          <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">Players ranked higher on some platforms vs NFC</p>
        </Card>
        
        <Card className="relative p-6 text-center overflow-hidden bg-gradient-to-br from-blue-50/80 to-indigo-50/80 dark:from-blue-950/60 dark:to-indigo-950/60 border-blue-200/80 dark:border-blue-700/60 backdrop-blur-sm">
          <div className="absolute top-0 right-0 w-20 h-20 bg-blue-500/5 dark:bg-blue-400/15 rounded-full -translate-y-10 translate-x-10"></div>
          <div className="w-14 h-14 bg-blue-500/15 dark:bg-blue-400/25 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10 border border-blue-200/60 dark:border-blue-600/50">
            <Zap className="w-7 h-7 text-blue-600 dark:text-blue-400" />
          </div>
          <h3 className="text-3xl font-black text-blue-600 dark:text-blue-400 mb-1">{allVariance.length}</h3>
          <p className="text-sm font-semibold text-blue-700 dark:text-blue-300">High Variance</p>
          <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">Significant differences across platforms</p>
        </Card>
      </div>

      {/* Main Content Tabs */}
      <Tabs defaultValue="values" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 h-12">
          <TabsTrigger value="values" className="flex items-center gap-2 font-semibold">
            <TrendingUp className="w-4 h-4" />
            Values
          </TabsTrigger>
          <TabsTrigger value="busts" className="flex items-center gap-2 font-semibold">
            <AlertTriangle className="w-4 h-4" />
            Busts
          </TabsTrigger>
          <TabsTrigger value="all" className="flex items-center gap-2 font-semibold">
            <Zap className="w-4 h-4" />
            All Variance
          </TabsTrigger>
        </TabsList>

        <TabsContent value="values" className="space-y-4">
          <PlayerVarianceGrid 
            players={values.slice(0, 24)} 
            title="🎯 Best Values - Draft These Players Later" 
            onPlayerClick={handlePlayerClick}
            type="value"
            selectedPlatform={selectedPlatform}
          />
        </TabsContent>

        <TabsContent value="busts" className="space-y-4">
          <PlayerVarianceGrid 
            players={busts.slice(0, 24)} 
            title="⚠️ Potential Busts - Avoid Drafting Early" 
            onPlayerClick={handlePlayerClick}
            type="bust"
            selectedPlatform={selectedPlatform}
          />
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          <PlayerVarianceGrid 
            players={allVariance.slice(0, 36)} 
            title="⚡ High Variance Players - Opportunity & Risk" 
            onPlayerClick={handlePlayerClick}
            type="all"
            selectedPlatform={selectedPlatform}
          />
        </TabsContent>
      </Tabs>

      {/* Player ADP History Modal */}
      <PlayerADPModal
        playerId={selectedPlayerId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </TooltipProvider>
  )
}

interface PlayerVarianceGridProps {
  players: PlayerVariance[]
  title: string
  onPlayerClick: (playerId: string) => void
  type?: 'value' | 'bust' | 'all'
  selectedPlatform: string
}

function PlayerVarianceGrid({ players, title, onPlayerClick, type = 'all', selectedPlatform }: PlayerVarianceGridProps) {
  if (players.length === 0) {
    return (
      <Card className="p-12 text-center bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5">
        <div className="w-16 h-16 bg-muted/50 dark:bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Players Found</h3>
        <p className="text-sm text-muted-foreground">Try adjusting your filters to see more results.</p>
      </Card>
    )
  }

  const getTypeConfig = (type: string) => {
    switch (type) {
      case 'value':
        return {
          bgGradient: 'from-green-50 to-emerald-50 dark:from-green-950/20 dark:to-emerald-950/20',
          borderColor: 'border-green-200 dark:border-green-800/60',
          accentColor: 'bg-green-500',
          textColor: 'text-green-600 dark:text-green-400',
          icon: TrendingUp
        }
      case 'bust':
        return {
          bgGradient: 'from-red-50 to-rose-50 dark:from-red-950/20 dark:to-rose-950/20',
          borderColor: 'border-red-200 dark:border-red-800/60',
          accentColor: 'bg-red-500',
          textColor: 'text-red-600 dark:text-red-400',
          icon: AlertTriangle
        }
      default:
        return {
          bgGradient: 'from-blue-50 to-indigo-50 dark:from-blue-950/20 dark:to-indigo-950/20',
          borderColor: 'border-blue-200 dark:border-blue-800/60',
          accentColor: 'bg-blue-500',
          textColor: 'text-blue-600 dark:text-blue-400',
          icon: Zap
        }
    }
  }

  const config = getTypeConfig(type)
  const Icon = config.icon

  return (
    <TooltipProvider>
      <div className="space-y-6">
        {/* Section Header with better theme support */}
        <div className={`p-6 rounded-2xl bg-gradient-to-r ${config.bgGradient} ${config.borderColor} border-2 shadow-sm`}>
          <div className="flex items-center gap-3 mb-2">
            <div className={`w-8 h-8 bg-current/10 dark:bg-current/20 rounded-lg flex items-center justify-center border border-current/20`}>
              <Icon className={`w-5 h-5 ${config.textColor}`} />
            </div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
          </div>
          <div className="flex items-center gap-4">
            <p className="text-sm text-muted-foreground">
              {players.length} players • Showing differences vs NFC rankings
            </p>
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 px-2 py-1 rounded-full cursor-help">
                  <span>ℹ️</span>
                  <span>Lower ADP = Better Value</span>
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="max-w-xs">Higher numbers mean the player is drafted later (worse ADP). When a platform has a higher number than NFC, it&apos;s a value opportunity.</p>
              </TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Player Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {players.map((player: PlayerVariance, index: number) => (
                         <Card
               key={player.player_id}
               className="relative p-4 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:-translate-y-1 bg-card dark:bg-card/90 border-2 hover:border-primary/50 backdrop-blur-sm"
               onClick={() => onPlayerClick(player.player_id)}
             >
              {/* Rank Badge with better contrast */}
              <div className="absolute -top-2 -left-2 w-8 h-8 bg-primary dark:bg-primary/90 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg border-2 border-background dark:border-background/80">
                {index + 1}
              </div>

              {/* Player Header */}
              <div className="flex items-center gap-3 mb-4">
                                  <PlayerAvatar
                    headshotUrl={player.headshot_url}
                    playerName={player.name}
                    team={player.team}
                    teamColor={player.team_color || "#6B7280"}
                    size="lg"
                    className="group-hover:scale-105 transition-transform"
                  />
                
                <div className="flex-1 min-w-0">
                  <h3 className="font-bold text-foreground text-sm truncate group-hover:text-primary transition-colors">
                    {player.name}
                  </h3>
                  <div className="flex items-center gap-1 mt-1">
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-background/60 dark:bg-background/40 border-border/40 dark:border-border/30">
                      {player.player_position}
                    </Badge>
                    <Badge variant="outline" className="text-xs px-2 py-0.5 bg-background/60 dark:bg-background/40 border-border/40 dark:border-border/30">
                      {player.team}
                    </Badge>
                  </div>
                </div>
              </div>

                             {/* NFC Baseline */}
               <div className="mb-4 p-3 bg-gradient-to-r from-primary/8 to-primary/4 dark:from-primary/15 dark:to-primary/8 rounded-xl border border-primary/20 dark:border-primary/25 backdrop-blur-sm">
                 <div className="flex items-center gap-2 mb-2">
                   <div className="w-3 h-3 rounded-full bg-primary shadow-sm"></div>
                   <span className="text-xs font-semibold text-primary dark:text-primary-foreground">NFC Baseline</span>
                 </div>
                 <div className="flex justify-between text-sm">
                   <span className="text-muted-foreground/80 dark:text-muted-foreground">Overall Rank</span>
                   <span className="font-bold text-foreground dark:text-foreground">#{player.consensus_rank}</span>
                 </div>
               </div>

              {/* Platform Comparisons with Side-by-Side Diff Format */}
              <div className="space-y-2">
                                {/* Value Opportunities for Values */}
                {type === 'value' && player.value_opportunities && player.value_opportunities
                  .filter((opp: {platform: string, rank: number, difference: number}) => 
                    selectedPlatform === 'all' || opp.platform === selectedPlatform
                  ).length > 0 && (
                  <>
                    <div className="flex items-center gap-2 mb-2">
                      <ArrowUp className="w-3 h-3 text-green-600 dark:text-green-400" />
                      <span className="text-xs font-semibold text-green-600 dark:text-green-400">Value Opportunities</span>
                    </div>
                    {player.value_opportunities
                      .filter((opp: {platform: string, rank: number, difference: number}) => 
                        selectedPlatform === 'all' || opp.platform === selectedPlatform
                      )
                      .slice(0, 3).map((opp: {platform: string, rank: number, difference: number}) => (
                                            <div key={opp.platform} className="bg-gradient-to-r from-green-50/90 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/30 border border-green-200/70 dark:border-green-700/40 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/30"
                              style={{ backgroundColor: PLATFORM_COLORS[PLATFORM_NAMES[opp.platform]] || '#6b7280' }}
                            />
                            <span className="text-xs font-medium text-green-700 dark:text-green-200">
                              {PLATFORM_NAMES[opp.platform] || opp.platform}
                            </span>
                          </div>
                          <Tooltip>
                             <TooltipTrigger asChild>
                               <Badge className="text-xs font-bold bg-green-200/90 dark:bg-green-900/60 text-green-700 dark:text-green-200 border-green-300/70 dark:border-green-600/50 cursor-help flex items-center gap-1 shadow-sm">
                                 <ArrowUp className="w-3 h-3 text-green-600 dark:text-green-300" />
                                 +{opp.difference}
                               </Badge>
                             </TooltipTrigger>
                            <TooltipContent>
                              <p>This player is drafted {opp.difference} spots later on {PLATFORM_NAMES[opp.platform]} vs NFC</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-xs text-green-600/90 dark:text-green-300/90 font-mono bg-white/20 dark:bg-black/10 rounded-lg px-2 py-1">
                          <div className="flex justify-between items-center">
                            <span>NFC: #{player.consensus_rank}</span>
                            <span className="text-green-600 dark:text-green-300 mx-2">➜</span>
                            <span>{PLATFORM_NAMES[opp.platform]}: #{opp.rank}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {player.value_opportunities
                      .filter((opp: {platform: string, rank: number, difference: number}) => 
                        selectedPlatform === 'all' || opp.platform === selectedPlatform
                      ).length > 3 && (
                      <div className="text-xs text-center text-muted-foreground bg-gradient-to-r from-muted/30 to-muted/20 dark:from-muted/25 dark:to-muted/15 rounded-lg p-2 backdrop-blur-sm border border-border/30 dark:border-border/20">
                        +{player.value_opportunities
                          .filter((opp: {platform: string, rank: number, difference: number}) => 
                            selectedPlatform === 'all' || opp.platform === selectedPlatform
                          ).length - 3} more platforms
                      </div>
                    )}
                  </>
                )}

                {/* Platform Risks for Busts */}
                {type === 'bust' && player.bust_risks && player.bust_risks
                  .filter((risk: {platform: string, rank: number, difference: number}) => 
                    selectedPlatform === 'all' || risk.platform === selectedPlatform
                  ).length > 0 && (
                  <>
                                         <div className="flex items-center gap-2 mb-2">
                       <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-400" />
                       <span className="text-xs font-semibold text-red-600 dark:text-red-400">Bust Risks</span>
                     </div>
                    {player.bust_risks
                      .filter((risk: {platform: string, rank: number, difference: number}) => 
                        selectedPlatform === 'all' || risk.platform === selectedPlatform
                      )
                      .slice(0, 3).map((risk: {platform: string, rank: number, difference: number}) => (
                                            <div key={risk.platform} className="bg-gradient-to-r from-red-50/90 to-rose-50/80 dark:from-red-950/40 dark:to-rose-950/30 border border-red-200/70 dark:border-red-700/40 rounded-xl p-3 backdrop-blur-sm">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div 
                              className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/30"
                              style={{ backgroundColor: PLATFORM_COLORS[PLATFORM_NAMES[risk.platform]] || '#6b7280' }}
                            />
                            <span className="text-xs font-medium text-red-700 dark:text-red-200">
                              {PLATFORM_NAMES[risk.platform] || risk.platform}
                            </span>
                          </div>
                          <Tooltip>
                             <TooltipTrigger asChild>
                               <Badge className="text-xs font-bold bg-red-200/90 dark:bg-red-900/60 text-red-700 dark:text-red-200 border-red-300/70 dark:border-red-600/50 cursor-help flex items-center gap-1 shadow-sm">
                                 <ArrowDown className="w-3 h-3 text-red-600 dark:text-red-300" />
                                 {risk.difference}
                               </Badge>
                             </TooltipTrigger>
                            <TooltipContent>
                              <p>This player is drafted {Math.abs(risk.difference)} spots earlier on {PLATFORM_NAMES[risk.platform]} vs NFC</p>
                            </TooltipContent>
                          </Tooltip>
                        </div>
                        <div className="text-xs text-red-600/90 dark:text-red-300/90 font-mono bg-white/20 dark:bg-black/10 rounded-lg px-2 py-1">
                          <div className="flex justify-between items-center">
                            <span>NFC: #{player.consensus_rank}</span>
                            <span className="text-red-600 dark:text-red-300 mx-2">➜</span>
                            <span>{PLATFORM_NAMES[risk.platform]}: #{risk.rank}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                    {player.bust_risks
                      .filter((risk: {platform: string, rank: number, difference: number}) => 
                        selectedPlatform === 'all' || risk.platform === selectedPlatform
                      ).length > 3 && (
                      <div className="text-xs text-center text-muted-foreground bg-gradient-to-r from-muted/30 to-muted/20 dark:from-muted/25 dark:to-muted/15 rounded-lg p-2 backdrop-blur-sm border border-border/30 dark:border-border/20">
                        +{player.bust_risks
                          .filter((risk: {platform: string, rank: number, difference: number}) => 
                            selectedPlatform === 'all' || risk.platform === selectedPlatform
                          ).length - 3} more platforms
                      </div>
                    )}
                  </>
                )}

                {/* Overall Variance for All tab */}
                {type === 'all' && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-2">
                      <Zap className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Platform Variance</span>
                    </div>
                                         <div className="bg-gradient-to-r from-blue-50/90 to-indigo-50/80 dark:from-blue-950/40 dark:to-indigo-950/30 border border-blue-200/70 dark:border-blue-700/40 rounded-xl p-3 backdrop-blur-sm">
                       <div className="flex justify-between text-xs mb-2">
                         <span className="text-muted-foreground dark:text-muted-foreground">Total Variance</span>
                         <Badge variant="secondary" className="text-xs bg-blue-200/90 dark:bg-blue-900/60 text-blue-700 dark:text-blue-200 border-blue-300/70 dark:border-blue-600/50 shadow-sm">
                           {player.variance_score} ranks
                         </Badge>
                       </div>
                       <div className="text-xs space-y-1 font-mono bg-white/20 dark:bg-black/10 rounded-lg px-2 py-2">
                         <div className="flex justify-between items-center">
                           <span className="text-green-600 dark:text-green-300">Best: {player.best_platform}</span>
                           <span className="text-green-600 dark:text-green-300 font-bold">#{player.best_rank}</span>
                         </div>
                         <div className="flex justify-between items-center">
                           <span className="text-red-600 dark:text-red-300">Worst: {player.worst_platform}</span>
                           <span className="text-red-600 dark:text-red-300 font-bold">#{player.worst_rank}</span>
                         </div>
                       </div>
                     </div>
                  </div>
                )}
              </div>

              {/* Hover Effect with theme support */}
              <div className="absolute inset-0 rounded-lg bg-primary/5 dark:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
            </Card>
          ))}
        </div>
      </div>
    </TooltipProvider>
  )
}
