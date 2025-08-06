'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, Target } from 'lucide-react';
import PlatformPlayerCard from './PlatformPlayerCard';

interface PlatformPlayerAnalysis {
  player_id: string;
  name: string;
  player_position: string;
  team: string;
  headshot_url: string | null;
  nfc_rank: number;
  platform_rank: number;
  difference: number;
  analysis_type: 'value' | 'bust';
  confidence_score: number;
}

interface PlatformValuesListProps {
  players: PlatformPlayerAnalysis[];
  platform: string;
  platformColor: string;
  onPlayerClick: (playerId: string) => void;
}

export default function PlatformValuesList({ 
  players, 
  platform, 
  platformColor, 
  onPlayerClick 
}: PlatformValuesListProps) {
  if (players.length === 0) {
    return (
      <Card className="p-12 text-center bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5">
        <div className="w-16 h-16 bg-muted/50 dark:bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Target className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Value Opportunities Found</h3>
        <p className="text-sm text-muted-foreground">
          No players show significant value opportunities on {platform} compared to NFC rankings.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-green-50/90 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/30 border-green-200/70 dark:border-green-700/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-green-500/15 dark:bg-green-400/25 rounded-lg flex items-center justify-center">
            <ArrowUp className="w-5 h-5 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">🎯 Best Values on {platform}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          These players are ranked significantly lower on {platform} than their NFC consensus ranking. 
          They could provide excellent value if you can draft them later than expected.
        </p>
        <div className="flex items-center gap-2">
          <Badge className="bg-green-200/90 dark:bg-green-900/60 text-green-700 dark:text-green-200 border-green-300/70 dark:border-green-600/50">
            {players.length} opportunities found
          </Badge>
          <Badge variant="outline" className="text-xs">
            Sorted by value potential
          </Badge>
        </div>
      </Card>

      {/* Players Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {players.map((player, index) => (
          <PlatformPlayerCard
            key={player.player_id}
            player={player}
            rank={index + 1}
            platform={platform}
            platformColor={platformColor}
            onPlayerClick={onPlayerClick}
            type="value"
          />
        ))}
      </div>

      {/* Footer Tips */}
      <Card className="p-4 bg-gradient-to-r from-green-50/50 to-emerald-50/30 dark:from-green-950/20 dark:to-emerald-950/10 border-green-200/50 dark:border-green-700/30">
        <div className="text-sm text-green-700 dark:text-green-300">
          <p className="font-semibold mb-1">💡 Draft Strategy Tips:</p>
          <ul className="text-xs space-y-1 text-green-600/90 dark:text-green-400/90">
            <li>• Target these players 1-2 rounds later than their NFC ranking suggests</li>
            <li>• Higher difference = better value opportunity</li>
            <li>• Check player history modal for consistency across time</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}