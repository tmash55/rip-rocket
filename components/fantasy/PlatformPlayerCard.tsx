'use client';

import React from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowUp, ArrowDown } from 'lucide-react';

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

interface PlatformPlayerCardProps {
  player: PlatformPlayerAnalysis;
  rank: number;
  platform: string;
  platformColor: string;
  onPlayerClick: (playerId: string) => void;
  type: 'value' | 'bust';
}

export default function PlatformPlayerCard({ 
  player, 
  rank, 
  platform, 
  platformColor, 
  onPlayerClick, 
  type 
}: PlatformPlayerCardProps) {
  const isValue = type === 'value';
  const colorScheme = isValue 
    ? {
        bg: 'from-green-50/90 to-emerald-50/80 dark:from-green-950/40 dark:to-emerald-950/30',
        border: 'border-green-200/70 dark:border-green-700/40',
        text: 'text-green-700 dark:text-green-200',
        badge: 'bg-green-200/90 dark:bg-green-900/60 text-green-700 dark:text-green-200 border-green-300/70 dark:border-green-600/50',
        arrow: 'text-green-600 dark:text-green-300'
      }
    : {
        bg: 'from-red-50/90 to-rose-50/80 dark:from-red-950/40 dark:to-rose-950/30',
        border: 'border-red-200/70 dark:border-red-700/40',
        text: 'text-red-700 dark:text-red-200',
        badge: 'bg-red-200/90 dark:bg-red-900/60 text-red-700 dark:text-red-200 border-red-300/70 dark:border-red-600/50',
        arrow: 'text-red-600 dark:text-red-300'
      };

  return (
    <Card
      className={`relative p-4 hover:shadow-xl dark:hover:shadow-2xl transition-all duration-300 cursor-pointer group hover:scale-[1.02] hover:-translate-y-1 bg-gradient-to-r ${colorScheme.bg} ${colorScheme.border} border-2 backdrop-blur-sm`}
      onClick={() => onPlayerClick(player.player_id)}
    >
      {/* Rank Badge */}
      <div className="absolute -top-2 -left-2 w-8 h-8 bg-primary dark:bg-primary/90 rounded-full flex items-center justify-center text-xs font-bold text-primary-foreground shadow-lg border-2 border-background dark:border-background/80">
        {rank}
      </div>

      {/* Player Info */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-12 h-12 bg-muted/30 dark:bg-muted/20 rounded-xl flex items-center justify-center overflow-hidden border-2 border-border/30 dark:border-border/20 group-hover:border-primary/50 transition-colors">
          {player.headshot_url ? (
            <img 
              src={player.headshot_url || "/placeholder.svg"} 
              alt={player.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <span className="text-lg">🏈</span>
          )}
        </div>
        
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

      {/* Analysis */}
      <div className="space-y-3">
        {/* NFC Baseline */}
        <div className="bg-white/30 dark:bg-black/20 rounded-lg p-3 border border-white/40 dark:border-white/10">
          <div className="flex justify-between items-center text-sm">
            <span className="text-muted-foreground/90 dark:text-muted-foreground font-medium">NFC Rank</span>
            <span className="font-bold text-foreground">#{player.nfc_rank}</span>
          </div>
        </div>

        {/* Platform Comparison */}
        <div className="bg-white/20 dark:bg-black/10 rounded-lg p-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <div 
                className="w-2.5 h-2.5 rounded-full shadow-sm border border-white/30"
                style={{ backgroundColor: platformColor }}
              />
              <span className={`text-xs font-medium ${colorScheme.text}`}>
                {platform} Rank
              </span>
            </div>
            <Badge className={`text-xs font-bold cursor-help flex items-center gap-1 shadow-sm ${colorScheme.badge}`}>
              {isValue ? (
                <ArrowUp className={`w-3 h-3 ${colorScheme.arrow}`} />
              ) : (
                <ArrowDown className={`w-3 h-3 ${colorScheme.arrow}`} />
              )}
              {isValue ? '+' : ''}{Math.abs(player.difference)}
            </Badge>
          </div>
          
          <div className="text-xs font-mono bg-white/20 dark:bg-black/10 rounded-lg px-2 py-1">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">#{player.nfc_rank}</span>
              <span className={`mx-2 ${colorScheme.arrow}`}>➜</span>
              <span className={`font-bold ${colorScheme.text}`}>#{player.platform_rank}</span>
            </div>
          </div>
        </div>

        {/* Confidence Score */}
        <div className="flex justify-between items-center text-xs">
          <span className="text-muted-foreground/80">
            {isValue ? 'Value Score' : 'Bust Risk'}
          </span>
          <div className="flex items-center gap-1">
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={`w-1.5 h-1.5 rounded-full ${
                    i < Math.min(Math.floor(player.confidence_score / 8), 5)
                      ? isValue ? 'bg-green-500' : 'bg-red-500'
                      : 'bg-muted/40'
                  }`}
                />
              ))}
            </div>
            <span className={`font-bold text-xs ${colorScheme.text}`}>
              {Math.min(Math.floor(player.confidence_score / 8), 5)}/5
            </span>
          </div>
        </div>
      </div>

      {/* Hover Effect */}
      <div className="absolute inset-0 rounded-lg bg-primary/5 dark:bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
    </Card>
  );
}