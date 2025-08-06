'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowDown, AlertTriangle } from 'lucide-react';
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

interface PlatformBustsListProps {
  players: PlatformPlayerAnalysis[];
  platform: string;
  platformColor: string;
  onPlayerClick: (playerId: string) => void;
}

export default function PlatformBustsList({ 
  players, 
  platform, 
  platformColor, 
  onPlayerClick 
}: PlatformBustsListProps) {
  if (players.length === 0) {
    return (
      <Card className="p-12 text-center bg-gradient-to-br from-muted/30 to-muted/10 dark:from-muted/20 dark:to-muted/5">
        <div className="w-16 h-16 bg-muted/50 dark:bg-muted/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8 text-muted-foreground" />
        </div>
        <h3 className="text-lg font-semibold text-muted-foreground mb-2">No Bust Risks Found</h3>
        <p className="text-sm text-muted-foreground">
          No players show significant bust risk on {platform} compared to NFC rankings.
        </p>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card className="p-6 bg-gradient-to-r from-red-50/90 to-rose-50/80 dark:from-red-950/40 dark:to-rose-950/30 border-red-200/70 dark:border-red-700/40">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 bg-red-500/15 dark:bg-red-400/25 rounded-lg flex items-center justify-center">
            <ArrowDown className="w-5 h-5 text-red-600 dark:text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-foreground">⚠️ Potential Busts on {platform}</h2>
        </div>
        <p className="text-sm text-muted-foreground mb-3">
          These players are ranked significantly higher on {platform} than their NFC consensus ranking. 
          Consider avoiding them or drafting them later than {platform} suggests.
        </p>
        <div className="flex items-center gap-2">
          <Badge className="bg-red-200/90 dark:bg-red-900/60 text-red-700 dark:text-red-200 border-red-300/70 dark:border-red-600/50">
            {players.length} risks identified
          </Badge>
          <Badge variant="outline" className="text-xs">
            Sorted by bust potential
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
            type="bust"
          />
        ))}
      </div>

      {/* Footer Tips */}
      <Card className="p-4 bg-gradient-to-r from-red-50/50 to-rose-50/30 dark:from-red-950/20 dark:to-rose-950/10 border-red-200/50 dark:border-red-700/30">
        <div className="text-sm text-red-700 dark:text-red-300">
          <p className="font-semibold mb-1">⚠️ Draft Strategy Tips:</p>
          <ul className="text-xs space-y-1 text-red-600/90 dark:text-red-400/90">
            <li>• Avoid drafting these players at their {platform} suggested position</li>
            <li>• Higher difference = higher bust risk</li>
            <li>• Consider waiting 1-2 rounds later or target alternatives</li>
            <li>• Check other platforms for better values</li>
          </ul>
        </div>
      </Card>
    </div>
  );
}