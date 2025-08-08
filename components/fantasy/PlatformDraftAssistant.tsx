'use client';

import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TrendingUp, TrendingDown, Target, Zap } from 'lucide-react';
import { ADPResponse, ADPPlayer } from './types';
import PlatformComparisonTable from './PlatformComparisonTable';
import PlayerADPModal from './PlayerADPModal';

// Platform configurations
const PLATFORMS = [
  { id: 'ESPN', name: 'ESPN', color: '#de0000', icon: '🔴' },
  { id: 'Sleeper', name: 'Sleeper', color: '#0B4F71', icon: '🔵' },
  { id: 'Yahoo', name: 'Yahoo', color: '#6002D2', icon: '🟣' },
  { id: 'CBS Sports', name: 'CBS', color: '#004ACD', icon: '🔵' },
];

// Fetch function for React Query (shared with ADPSmashBoard)
const fetchADPData = async (leagueSize: number): Promise<ADPResponse> => {
  const response = await fetch(`/api/fantasy-adp?league_size=${leagueSize}&limit=300`);
  if (!response.ok) {
    throw new Error('Failed to fetch ADP data');
  }
  return response.json();
};

interface PlatformPlayerAnalysis {
  player_id: string;
  name: string;
  player_position: string;
  team: string;
  team_color?: string;
  headshot_url: string | null;
  nfc_rank: number;
  platform_rank: number;
  difference: number;
  analysis_type: 'value' | 'bust';
  confidence_score: number; // How significant the difference is
  // Add draft position data
  nfc_round?: number;
  nfc_pick?: number;
  nfc_draft_position?: string;
  platform_round?: number;
  platform_pick?: number;
  platform_draft_position?: string;
  platform_position_rank?: number;
  nfc_position_rank?: number;
}

export default function PlatformDraftAssistant() {
  const isMobile = useIsMobile();
  const queryClient = useQueryClient();
  const [selectedPlatform, setSelectedPlatform] = useState('ESPN');
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isChangingPlatform, setIsChangingPlatform] = useState(false);
  const [selectedPosition, setSelectedPosition] = useState<string | null>(null);

  const positions = ['QB', 'RB', 'WR', 'TE'];

  // Use same query as ADPValuesBoard for caching
  const { data: adpData, isLoading, error } = useQuery<ADPResponse>({
    queryKey: ['adp-data', 12], // Default to 12-team for now - matches ADPValuesBoard
    queryFn: () => fetchADPData(12),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchOnMount: true, // Ensure fresh data on mount
    retry: 2, // Retry failed requests
    initialData: queryClient.getQueryData(['adp-data', 12])
  });

  // Process data for platform-specific analysis
  const platformAnalysis = React.useMemo(() => {
    if (!adpData || !('data' in adpData)) return { values: [], busts: [], totalPlayers: 0 };

    // Filter by position first if selected
    const positionFilteredData = selectedPosition
      ? adpData.data.filter(player => player.player_position === selectedPosition)
      : adpData.data;

    const analysis: PlatformPlayerAnalysis[] = [];

    positionFilteredData.forEach((player: ADPPlayer) => {
      // Find NFC rank (baseline)
      const nfcRank = player.nfc_rank;
      
      // Find selected platform rank and position data based on platform
      let platformRank: number | null = null;
      let platformPositionRank: number | null = null;
      let platformRound: number | null = null;
      let platformPick: number | null = null;
      let platformDraftPosition: string | null = null;
      
      switch (selectedPlatform.toLowerCase()) {
        case 'espn':
          platformRank = player.espn_rank;
          platformPositionRank = player.espn_position_rank;
          platformRound = player.espn_round;
          platformPick = player.espn_pick;
          platformDraftPosition = player.espn_draft_position;
          break;
        case 'yahoo':
          platformRank = player.yahoo_rank;
          platformPositionRank = player.yahoo_position_rank;
          platformRound = player.yahoo_round;
          platformPick = player.yahoo_pick;
          platformDraftPosition = player.yahoo_draft_position;
          break;
        case 'sleeper':
          platformRank = player.sleeper_rank;
          platformPositionRank = player.sleeper_position_rank;
          platformRound = player.sleeper_round;
          platformPick = player.sleeper_pick;
          platformDraftPosition = player.sleeper_draft_position;
          break;
        case 'cbs sports':
          platformRank = player.cbs_rank;
          platformPositionRank = player.cbs_position_rank;
          platformRound = player.cbs_round;
          platformPick = player.cbs_pick;
          platformDraftPosition = player.cbs_draft_position;
          break;
      }

      if (!nfcRank || !platformRank) return;

      const difference = platformRank - nfcRank;
      const absDifference = Math.abs(difference);

      // Only include players with significant differences (8+ ranks)
      if (absDifference >= 8) {
        analysis.push({
          player_id: player.player_id,
          name: player.name,
          player_position: player.player_position,
          team: player.team,
          team_color: (player as any).team_color,
          headshot_url: player.headshot_url,
          nfc_rank: nfcRank,
          platform_rank: platformRank,
          difference: difference,
          analysis_type: difference > 0 ? 'value' : 'bust',
          confidence_score: absDifference,
          // Add draft position data
          nfc_round: player.nfc_round,
          nfc_pick: player.nfc_pick,
          nfc_draft_position: player.nfc_draft_position,
          platform_round: platformRound,
          platform_pick: platformPick,
          platform_draft_position: platformDraftPosition,
          platform_position_rank: platformPositionRank,
          nfc_position_rank: player.nfc_position_rank,
        });
      }
    });

    // Separate and sort
    const values = analysis
      .filter(p => p.analysis_type === 'value')
      .sort((a, b) => b.confidence_score - a.confidence_score); // Biggest values first

    const busts = analysis
      .filter(p => p.analysis_type === 'bust')
      .sort((a, b) => b.confidence_score - a.confidence_score); // Biggest busts first

    return {
      values,
      busts,
      totalPlayers: analysis.length
    };
  }, [adpData && 'data' in adpData ? adpData.data : null, selectedPlatform, selectedPosition]);

  const handlePlayerClick = (playerId: string) => {
    setSelectedPlayerId(playerId);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedPlayerId(null);
  };

  const selectedPlatformConfig = PLATFORMS.find(p => p.id === selectedPlatform);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading platform analysis...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <p className="text-destructive">Error loading data: {error instanceof Error ? error.message : 'Unknown error'}</p>
      </div>
    );
  }

  return (
    <div className={`space-y-${isMobile ? '6' : '8'}`}>
      {/* Platform Selection Section */}
      <div className="space-y-6">
        {/* Platform Selector Card */}
        <Card className="p-8 bg-gradient-to-br from-muted/40 to-muted/20 dark:from-muted/30 dark:to-muted/10 border-2 border-border/50">
          <div className="space-y-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Choose Your Platform</h2>
              <p className="text-muted-foreground">Select the platform you&apos;re drafting on to see personalized recommendations</p>
            </div>
            
            <div className={`${
              isMobile 
                ? 'flex flex-col gap-3 px-2' 
                : 'flex flex-wrap items-center justify-center gap-4'
            }`}>
              {PLATFORMS.map((platform) => (
                <Button
                  key={platform.id}
                  variant={selectedPlatform === platform.id ? "default" : "outline"}
                  size="lg"
                  onClick={() => {
                    setIsChangingPlatform(true);
                    setSelectedPlatform(platform.id);
                    setTimeout(() => setIsChangingPlatform(false), 300);
                  }}
                  className={`flex items-center gap-3 ${
                    isMobile 
                      ? 'w-full px-4 py-3' 
                      : 'px-6 py-4'
                  } h-auto transition-all duration-300 ${
                    selectedPlatform === platform.id 
                      ? "shadow-xl scale-105 border-2" 
                      : "hover:scale-105 hover:shadow-lg"
                  }`}
                  style={{
                    borderColor: selectedPlatform === platform.id ? platform.color : undefined,
                    backgroundColor: selectedPlatform === platform.id ? `${platform.color}15` : undefined,
                    color: selectedPlatform === platform.id ? platform.color : undefined
                  } as React.CSSProperties}
                >
                  <span className="text-2xl">{platform.icon}</span>
                  <div className="text-left">
                    <div className="font-bold text-base">{platform.name}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
        </Card>

        {/* Position Filter */}
        <Card className="p-4 bg-background/60 dark:bg-background/40 border border-border/60">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-muted/50 dark:bg-muted/30 rounded-lg flex items-center justify-center">
                <Zap className="w-4 h-4 text-muted-foreground" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">Position Filter</h3>
                <p className="text-xs text-muted-foreground">Focus on specific positions</p>
              </div>
            </div>
            <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2">
              <Button
                variant={selectedPosition === null ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedPosition(null)}
                className="font-medium"
              >
                All Positions
              </Button>
              {positions.map((position) => (
                <Button
                  key={position}
                  variant={selectedPosition === position ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedPosition(position)}
                  className="font-medium transition-all duration-200"
                >
                  {position}
                </Button>
              ))}
            </div>
          </div>
        </Card>
      </div>

      {/* Enhanced Summary Stats - Hidden on Mobile */}
      {!isMobile && (
        <div className="space-y-4 mb-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Analysis Summary</h2>
            <p className="text-muted-foreground">
              Comparing <span className="font-semibold text-foreground">{selectedPlatform}</span> rankings vs NFC Sharp consensus
              {selectedPosition && <span> • <span className="font-semibold text-foreground">{selectedPosition}</span> only</span>}
            </p>
          </div>

          <div className="grid grid-cols-3 gap-6">
            <Card 
              className="relative p-6 text-center overflow-hidden border-2"
              style={{ borderColor: `${selectedPlatformConfig?.color}30` }}
            >
              <div className="absolute top-0 right-0 w-20 h-20 rounded-full -translate-y-10 translate-x-10 opacity-10"
                   style={{ backgroundColor: selectedPlatformConfig?.color }}></div>
              <div 
                className="w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10"
                style={{ backgroundColor: `${selectedPlatformConfig?.color}20` }}
              >
                <Target className="w-7 h-7" style={{ color: selectedPlatformConfig?.color }} />
              </div>
              <h3 className="text-3xl font-black mb-1" style={{ color: selectedPlatformConfig?.color }}>
                {platformAnalysis.totalPlayers}
              </h3>
              <p className="text-sm font-semibold text-muted-foreground">Total Opportunities</p>
              <p className="text-xs text-muted-foreground/80 mt-1">Significant differences vs NFC</p>
            </Card>
            
            <Card className="relative p-6 text-center overflow-hidden bg-gradient-to-br from-green-50/80 to-emerald-50/80 dark:from-green-950/60 dark:to-emerald-950/60 border-green-200/80 dark:border-green-700/60">
              <div className="absolute top-0 right-0 w-20 h-20 bg-green-500/5 dark:bg-green-400/15 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="w-14 h-14 bg-green-500/15 dark:bg-green-400/25 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10">
                <TrendingUp className="w-7 h-7 text-green-600 dark:text-green-400" />
              </div>
              <h3 className="text-3xl font-black text-green-600 dark:text-green-400 mb-1">
                {platformAnalysis.values.length}
              </h3>
              <p className="text-sm font-semibold text-green-700 dark:text-green-300">Best Values</p>
              <p className="text-xs text-green-600/80 dark:text-green-400/80 mt-1">Draft these players later</p>
            </Card>
            
            <Card className="relative p-6 text-center overflow-hidden bg-gradient-to-br from-red-50/80 to-rose-50/80 dark:from-red-950/60 dark:to-rose-950/60 border-red-200/80 dark:border-red-700/60">
              <div className="absolute top-0 right-0 w-20 h-20 bg-red-500/5 dark:bg-red-400/15 rounded-full -translate-y-10 translate-x-10"></div>
              <div className="w-14 h-14 bg-red-500/15 dark:bg-red-400/25 rounded-2xl flex items-center justify-center mx-auto mb-4 relative z-10">
                <TrendingDown className="w-7 h-7 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-3xl font-black text-red-600 dark:text-red-400 mb-1">
                {platformAnalysis.busts.length}
              </h3>
              <p className="text-sm font-semibold text-red-700 dark:text-red-300">Potential Busts</p>
              <p className="text-xs text-red-600/80 dark:text-red-400/80 mt-1">Avoid drafting early</p>
            </Card>
          </div>
        </div>
      )}

      {/* Enhanced Tabs Section */}
      <div className="space-y-6">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold text-foreground">Draft Recommendations</h2>
          <p className="text-muted-foreground">Players with significant ADP differences (8+ ranks) vs NFC consensus</p>
        </div>

        <Tabs defaultValue="values" className="space-y-6">
          <TabsList className={`grid w-full grid-cols-2 ${isMobile ? 'h-20' : 'h-14'} p-1`}>
            <TabsTrigger value="values" className="flex items-center gap-3 font-semibold text-base h-full">
              <div className="w-8 h-8 bg-green-500/10 dark:bg-green-400/20 rounded-lg flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
              <div className="text-left">
                <div>Best Values</div>
                <div className="text-xs opacity-70">({platformAnalysis.values.length})</div>
              </div>
            </TabsTrigger>
            <TabsTrigger value="busts" className="flex items-center gap-3 font-semibold text-base h-full">
              <div className="w-8 h-8 bg-red-500/10 dark:bg-red-400/20 rounded-lg flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
              <div className="text-left">
                <div>Potential Busts</div>
                <div className="text-xs opacity-70">({platformAnalysis.busts.length})</div>
              </div>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="values" className="space-y-4">
            {isChangingPlatform ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <PlatformComparisonTable 
                players={platformAnalysis.values}
                platform={selectedPlatform}
                platformColor={selectedPlatformConfig?.color || '#6b7280'}
                onPlayerClick={handlePlayerClick}
                type="value"
              />
            )}
          </TabsContent>

          <TabsContent value="busts" className="space-y-4">
            {isChangingPlatform ? (
              <div className="flex items-center justify-center py-8">
                <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              </div>
            ) : (
              <PlatformComparisonTable 
                players={platformAnalysis.busts}
                platform={selectedPlatform}
                platformColor={selectedPlatformConfig?.color || '#6b7280'}
                onPlayerClick={handlePlayerClick}
                type="bust"
              />
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Player ADP History Modal */}
      <PlayerADPModal
        playerId={selectedPlayerId}
        isOpen={isModalOpen}
        onClose={handleCloseModal}
      />
    </div>
  );
}
