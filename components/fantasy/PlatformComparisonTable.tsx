'use client';

import React, { useRef, useCallback } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ArrowUp, ArrowDown, TrendingUp, TrendingDown, ChevronUp, ChevronDown } from 'lucide-react';
import PlayerAvatar from './PlayerAvatar';
import { PLATFORM_COLORS, getPlatformColor } from '@/lib/platform-config';

// Simple pagination component (copied from ADPTable.tsx)
const Pagination = ({ 
  currentPage, 
  totalPages, 
  onPageChange,
  pageSize,
  onPageSizeChange 
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  pageSize?: number
  onPageSizeChange?: (size: number) => void
}) => {
  if (totalPages <= 1) return null

  const pages = []
  const showPages = 5 // Show 5 page numbers at a time
  
  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2))
  let endPage = Math.min(totalPages, startPage + showPages - 1)
  
  // Adjust start if we're near the end
  if (endPage - startPage + 1 < showPages) {
    startPage = Math.max(1, endPage - showPages + 1)
  }

  for (let i = startPage; i <= endPage; i++) {
    pages.push(i)
  }

  return (
    <div className="flex items-center justify-between py-4">
      {/* Left side - Page size selector */}
      <div className="flex items-center gap-2">
        {onPageSizeChange && pageSize && (
          <>
            <span className="text-xs text-muted-foreground">Show:</span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2 py-1 text-xs bg-secondary border border-border rounded text-secondary-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
            >
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </>
        )}
      </div>

      {/* Center - Page navigation */}
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
        >
          Previous
        </Button>
        
        {startPage > 1 && (
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(1)}
            >
              1
            </Button>
            {startPage > 2 && <span className="px-2 text-muted-foreground">...</span>}
          </>
        )}
        
        {pages.map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
          >
            {page}
          </Button>
        ))}
        
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="px-2 text-muted-foreground">...</span>}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(totalPages)}
            >
              {totalPages}
            </Button>
          </>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
        >
          Next
        </Button>
      </div>

      {/* Right side - Page info */}
      <div className="text-xs text-muted-foreground">
        Page {currentPage} of {totalPages}
      </div>
    </div>
  )
}

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
  confidence_score: number;
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

interface PlatformComparisonTableProps {
  players: PlatformPlayerAnalysis[];
  platform: string;
  platformColor: string;
  onPlayerClick: (playerId: string) => void;
  type: 'value' | 'bust';
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
  onSortChange?: (sortBy: string, sortDirection: 'asc' | 'desc') => void;
}

export default function PlatformComparisonTable({ 
  players, 
  platform, 
  platformColor, 
  onPlayerClick, 
  type,
  currentPage = 1,
  totalPages = 1,
  pageSize = 25,
  onPageChange,
  onPageSizeChange,
  sortBy = 'difference',
  sortDirection = 'desc',
  onSortChange
}: PlatformComparisonTableProps) {
  const isMobile = useIsMobile();
  const headerScrollRef = useRef<HTMLDivElement>(null);
  const bodyScrollRef = useRef<HTMLDivElement>(null);
  const isValue = type === 'value';

  // Sync horizontal scroll between header and body on mobile
  const syncHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMobile && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, [isMobile]);

  const syncBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMobile && bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  }, [isMobile]);
  
  // Handle sorting
  const handleSort = (column: string) => {
    if (onSortChange) {
      if (sortBy === column) {
        onSortChange(column, sortDirection === 'asc' ? 'desc' : 'asc');
      } else {
        onSortChange(column, 'desc');
      }
    }
  };
  
  if (players.length === 0) {
    return (
      <Card className="overflow-hidden">
        {/* Header */}
        <div className="bg-muted/50 px-4 py-3 border-b border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h3 className="text-lg font-semibold text-foreground">
                {platform} {type === 'value' ? 'Values' : 'Busts'} vs NFC Sharp
              </h3>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span>0 results</span>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="p-12 text-center">
          <div className="text-6xl mb-4">
            {type === 'value' ? '📈' : '📉'}
          </div>
          <h3 className="text-xl font-semibold mb-2">
            No {type === 'value' ? 'values' : 'busts'} found
          </h3>
          <p className="text-muted-foreground">
            No players found with significant {type === 'value' ? 'value opportunities' : 'bust risks'} on {platform}.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <Card className="overflow-hidden">
      {/* Enhanced Header */}
      <div className="bg-gradient-to-r from-muted/60 to-muted/40 dark:from-muted/40 dark:to-muted/20 px-6 py-4 border-b border-border">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border-2"
                style={{ 
                  backgroundColor: `${platformColor}15`,
                  borderColor: `${platformColor}40`
                }}
              >
                <span className="text-lg font-bold" style={{ color: platformColor }}>
                  {platform.charAt(0)}
                </span>
              </div>
              <div>
                <h3 className="text-xl font-bold text-foreground">
                  {platform} {type === 'value' ? 'Values' : 'Busts'}
                </h3>
                <p className="text-sm text-muted-foreground">vs NFC Sharp consensus rankings</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge 
              variant="outline" 
              className={`px-3 py-1.5 font-semibold ${
                type === 'value' 
                  ? 'bg-green-50/80 dark:bg-green-950/40 text-green-700 dark:text-green-300 border-green-200/80 dark:border-green-800/60' 
                  : 'bg-red-50/80 dark:bg-red-950/40 text-red-700 dark:text-red-300 border-red-200/80 dark:border-red-800/60'
              }`}
            >
              {players.length} {type === 'value' ? 'Values' : 'Busts'} Found
            </Badge>
            <div className="text-xs text-muted-foreground bg-muted/40 dark:bg-muted/20 px-3 py-1.5 rounded-full">
              Page {currentPage} of {totalPages}
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced Column Headers */}
      <div className="bg-gradient-to-r from-muted/50 to-muted/30 dark:from-muted/30 dark:to-muted/15 border-b-2 border-border/60 sticky top-0 z-20">
        <div 
          ref={headerScrollRef}
          className={`${isMobile ? 'overflow-x-auto' : ''}`}
          onScroll={isMobile ? syncBodyScroll : undefined}
        >
          <div className={`${isMobile ? 'px-2 py-2' : 'px-6 py-4'}`}>
            <div className={`grid grid-cols-8 ${isMobile ? 'gap-1.5 min-w-[600px]' : 'gap-4'} items-center`}>
              {/* Player Info */}
              <div className={`text-xs font-bold uppercase tracking-wider text-foreground/90 dark:text-white/90 ${
                isMobile ? 'w-28 sticky left-0 bg-muted/30 z-30 border-r border-border pr-3 mr-4' : ''
              }`}>
                {isMobile ? 'Player' : 'Player Info'}
              </div>
            
              {/* Enhanced sortable diff column */}
              <div 
                className={`text-xs font-bold uppercase tracking-wider text-foreground/90 dark:text-white/90 text-center cursor-pointer hover:bg-muted/60 dark:hover:bg-muted/40 transition-colors px-2 py-1.5 rounded-lg ${isMobile ? 'min-w-[50px]' : ''}`}
                onClick={() => handleSort('difference')}
              >
                <div className="flex items-center justify-center gap-1">
                  <span>{isMobile ? 'Diff' : 'Difference'}</span>
                  {sortBy === 'difference' && (
                    <div className="text-primary">
                      {sortDirection === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                    </div>
                  )}
                </div>
              </div>
              
              {/* NFC Overall */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor('NFC')}25`,
                  borderColor: `${getPlatformColor('NFC')}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>NFC</div>
                {!isMobile && <div className="text-[10px] opacity-80">Overall</div>}
              </div>

              {/* Platform Overall */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor(platform)}25`,
                  borderColor: `${getPlatformColor(platform)}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>{platform}</div>
                {!isMobile && <div className="text-[10px] opacity-80">Overall</div>}
              </div>

              {/* NFC Position */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor('NFC')}25`,
                  borderColor: `${getPlatformColor('NFC')}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>NFC</div>
                {!isMobile && <div className="text-[10px] opacity-80">Position</div>}
                {isMobile && <div className="text-[10px] opacity-80">Pos</div>}
              </div>

              {/* Platform Position */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor(platform)}25`,
                  borderColor: `${getPlatformColor(platform)}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>{platform}</div>
                {!isMobile && <div className="text-[10px] opacity-80">Position</div>}
                {isMobile && <div className="text-[10px] opacity-80">Pos</div>}
              </div>

              {/* NFC Round */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor('NFC')}25`,
                  borderColor: `${getPlatformColor('NFC')}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>NFC</div>
                {!isMobile && <div className="text-[10px] opacity-80">Round</div>}
                {isMobile && <div className="text-[10px] opacity-80">Rnd</div>}
              </div>

              {/* Platform Round */}
              <div 
                className="text-xs font-bold uppercase tracking-wider text-center px-2 py-1.5 rounded-lg border"
                style={{ 
                  backgroundColor: `${getPlatformColor(platform)}25`,
                  borderColor: `${getPlatformColor(platform)}50`,
                  color: 'var(--foreground)'
                }}
              >
                <div>{platform}</div>
                {!isMobile && <div className="text-[10px] opacity-80">Round</div>}
                {isMobile && <div className="text-[10px] opacity-80">Rnd</div>}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Table Body */}
      <div 
        ref={bodyScrollRef}
        className={`${isMobile ? 'overflow-x-auto overflow-y-auto' : 'overflow-y-auto'}`}
        style={{ maxHeight: "700px" }}
        onScroll={isMobile ? syncHeaderScroll : undefined}
      >
        {players.map((player, index) => {
          const isValue = type === 'value';
          
          return (
            <div 
              key={player.player_id}
              className={`border-b border-border hover:bg-muted/30 dark:hover:bg-muted/20 cursor-pointer transition-colors ${
                isMobile ? 'px-2 py-2' : 'px-4 py-3 pr-[calc(0.5rem+8px)]'
              }`}
              onClick={() => onPlayerClick(player.player_id)}
            >
                                          <div className={`grid grid-cols-8 ${isMobile ? 'gap-1.5 min-w-[600px]' : 'gap-3'} items-center`}>
                {/* Player Info */}
                <div className={`flex items-center ${
                  isMobile 
                    ? 'gap-1 w-28 sticky left-0 bg-card z-10 border-r border-border pr-3 py-1.5 mr-4' 
                    : 'gap-2.5'
                } min-w-0`}>
                  {!isMobile && (
                    <PlayerAvatar
                      headshotUrl={player.headshot_url}
                      playerName={player.name}
                      team={player.team}
                      teamColor={player.team_color || "#6B7280"}
                      size="sm"
                      className="flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className={`font-semibold text-foreground truncate ${isMobile ? 'text-xs' : 'text-sm'}`}>
                      {player.name}
                    </div>
                    <div className={`flex items-center gap-1 ${isMobile ? 'text-[10px]' : 'text-xs'} text-muted-foreground`}>
                      <span className="font-medium">{player.team}</span>
                      <span>•</span>
                      <Badge variant="outline" className={`${isMobile ? 'text-[8px] h-3 px-0.5' : 'text-[9px] h-3.5 px-1'}`}>
                        {player.player_position}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Difference */}
                <div className="text-center">
                  <Badge 
                    className={`flex items-center gap-1 justify-center w-fit mx-auto ${
                      isValue 
                        ? 'bg-green-200/90 dark:bg-green-900/60 text-green-700 dark:text-green-200' 
                        : 'bg-red-200/90 dark:bg-red-900/60 text-red-700 dark:text-red-200'
                    }`}
                  >
                    {isValue ? (
                      <ArrowUp className="w-3 h-3" />
                    ) : (
                      <ArrowDown className="w-3 h-3" />
                    )}
                    {isValue ? '+' : ''}{Math.abs(player.difference)}
                  </Badge>
                </div>

                {/* NFC Rank */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor('NFC')}15`,
                    borderColor: `${getPlatformColor('NFC')}30`
                  }}
                >
                  <div className={`font-bold text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>#{player.nfc_rank}</div>
                </div>

                {/* Platform Rank */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor(platform)}15`,
                    borderColor: `${getPlatformColor(platform)}30`
                  }}
                >
                  <div className={`font-bold text-foreground ${isMobile ? 'text-xs' : 'text-sm'}`}>#{player.platform_rank}</div>
                </div>

                {/* NFC Position Rank */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor('NFC')}15`,
                    borderColor: `${getPlatformColor('NFC')}30`
                  }}
                >
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>
                    {player.nfc_position_rank ? `${player.player_position}${player.nfc_position_rank}` : '-'}
                  </div>
                </div>

                {/* Platform Position Rank */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor(platform)}15`,
                    borderColor: `${getPlatformColor(platform)}30`
                  }}
                >
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>
                    {player.platform_position_rank ? `${player.player_position}${player.platform_position_rank}` : '-'}
                  </div>
                </div>

                {/* NFC Round */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor('NFC')}15`,
                    borderColor: `${getPlatformColor('NFC')}30`
                  }}
                >
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>
                    {isMobile ? `R${Math.ceil(player.nfc_rank / 12)}` : (player.nfc_draft_position || `R${Math.ceil(player.nfc_rank / 12)}`)}
                  </div>
                </div>

                {/* Platform Round */}
                <div 
                  className="text-center px-2 py-1 rounded border"
                  style={{ 
                    backgroundColor: `${getPlatformColor(platform)}15`,
                    borderColor: `${getPlatformColor(platform)}30`
                  }}
                >
                  <div className={`${isMobile ? 'text-xs' : 'text-sm'} text-foreground`}>
                    {isMobile ? `R${Math.ceil(player.platform_rank / 12)}` : (player.platform_draft_position || `R${Math.ceil(player.platform_rank / 12)}`)}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="bg-muted/50 px-4 py-3 border-t border-border">
        {onPageChange ? (
          // Pagination controls
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={onPageChange}
            pageSize={pageSize}
            onPageSizeChange={onPageSizeChange}
          />
        ) : (
          // Fallback if no pagination handler
          <div className="flex items-center justify-center text-sm text-muted-foreground">
            <span>Page {currentPage} of {totalPages}</span>
          </div>
        )}
      </div>
    </Card>
  );
}
