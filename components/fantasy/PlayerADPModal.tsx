'use client';

import React, { useState, useEffect } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import PlayerAvatar from './PlayerAvatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { TrendingUp } from 'lucide-react';
import { PLATFORM_COLORS } from '@/lib/platform-config';

// Utility functions for better color contrast and modern styling
const getContrastColor = (hexColor: string, isDark: boolean = false) => {
  // Convert hex to RGB
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return appropriate contrast color based on theme and luminance
  if (isDark) {
    return luminance > 0.5 ? '#000000' : '#ffffff';
  } else {
    return luminance > 0.5 ? '#1f2937' : '#f9fafb';
  }
};

const getReadableTextColor = (hexColor: string) => {
  // For text that needs to be readable on both light and dark backgrounds
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 7);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  // Return a more neutral version of the color for better readability
  if (luminance < 0.3) {
    // Dark colors - lighten them
    return `hsl(${Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI)}, 70%, 60%)`;
  } else if (luminance > 0.7) {
    // Light colors - darken them
    return `hsl(${Math.round(Math.atan2(Math.sqrt(3) * (g - b), 2 * r - g - b) * 180 / Math.PI)}, 70%, 40%)`;
  }
  return hexColor;
};

interface Platform {
  id: number;
  name: string;
  slug: string;
  logo_url: string;
}

interface HistoricalDataPoint {
  platform_adp: number | null;
  overall_rank: number | null;
  position_rank: number | null;
  created_at: string;
  platform: Platform;
}

interface PlayerInfo {
  player_id: string;
  full_name: string;
  position: string;
  team_abbreviation: string;
  headshot_url: string | null;
  team_color: string;
  team_color2: string;
  team_name: string;
}

interface PlayerADPData {
  player: PlayerInfo;
  historical_data: HistoricalDataPoint[];
  grouped_by_platform: Record<string, { platform: Platform; data: any[] }>;
  data_points: number;
  platforms: string[];
}

interface PlayerADPModalProps {
  playerId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function PlayerADPModal({ playerId, isOpen, onClose }: PlayerADPModalProps) {
  const isMobile = useIsMobile();
  const [data, setData] = useState<PlayerADPData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPositionRank, setShowPositionRank] = useState(false);
  const [visiblePlatforms, setVisiblePlatforms] = useState<Record<string, boolean>>({});

  // Fetch player ADP data
  useEffect(() => {
    if (!playerId || !isOpen) {
      // Clear data when modal is closed or no player selected
      setData(null);
      setError(null);
      setLoading(false);
      setShowPositionRank(false); // Reset toggle
      setVisiblePlatforms({});
      return;
    }

    const fetchPlayerData = async () => {
      setLoading(true);
      setError(null);
      setData(null); // Clear previous data immediately
      setShowPositionRank(false); // Reset toggle for new player
      
      try {
        const response = await fetch(`/api/player-adp-history/${playerId}`);
        if (!response.ok) {
          throw new Error('Failed to fetch player data');
        }
        
        const playerData: PlayerADPData = await response.json();
        setData(playerData);
        
        // Initialize all platforms as visible
        const initialVisibility = playerData.platforms.reduce((acc, platform) => {
          acc[platform] = true;
          return acc;
        }, {} as Record<string, boolean>);
        setVisiblePlatforms(initialVisibility);
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'An error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchPlayerData();
  }, [playerId, isOpen]);

  // Prepare chart data
  const chartData = React.useMemo(() => {
    if (!data) return [];

    // Group data points that are within 10 minutes of each other
    const timeGroups: Record<string, any[]> = {};
    const TEN_MINUTES = 10 * 60 * 1000; // 10 minutes in milliseconds

    data.historical_data.forEach(point => {
      const pointTime = new Date(point.created_at).getTime();
      
      // Find existing group within 10 minutes
      let groupKey = '';
      for (const [key, group] of Object.entries(timeGroups)) {
        const groupTime = new Date(group[0].created_at).getTime();
        if (Math.abs(pointTime - groupTime) <= TEN_MINUTES) {
          groupKey = key;
          break;
        }
      }
      
      // If no group found, create new one
      if (!groupKey) {
        groupKey = point.created_at;
        timeGroups[groupKey] = [];
      }
      
      timeGroups[groupKey].push(point);
    });

    // Convert groups to chart data points
    return Object.entries(timeGroups)
      .sort(([keyA], [keyB]) => new Date(keyA).getTime() - new Date(keyB).getTime())
      .map(([groupKey, points]) => {
        // Use the earliest timestamp in the group for display
        const earliestPoint = points.reduce((earliest, current) => 
          new Date(current.created_at).getTime() < new Date(earliest.created_at).getTime() 
            ? current : earliest
        );
        
        const date = new Date(earliestPoint.created_at);
        const displayTime = date.toLocaleString('en-US', { 
          month: 'short', 
          day: 'numeric',
          hour: 'numeric',
          hour12: true 
        });

        const dataPoint: any = { 
          date: displayTime,
          timestamp: date.getTime()
        };

        // Add data for each platform in this time group
        points.forEach(point => {
          const rankValue = showPositionRank ? point.position_rank : point.overall_rank;
          if (rankValue !== null) {
            dataPoint[point.platform.name] = rankValue;
          }
        });

        return dataPoint;
      });
  }, [data, showPositionRank]);

  const togglePlatformVisibility = (platform: string) => {
    setVisiblePlatforms(prev => ({
      ...prev,
      [platform]: !prev[platform]
    }));
  };

  if (!isOpen) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 md:p-8">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">
            Player ADP History
          </DialogTitle>
        </DialogHeader>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading player data...</p>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
            <p className="text-destructive">Error: {error}</p>
          </div>
        )}

        {data && (
          <div className="space-y-6">
            {/* Player Header */}
            <div 
              className="relative p-6 bg-card border-2 rounded-2xl shadow-xl overflow-hidden backdrop-blur-sm"
              style={{
                borderColor: data.player.team_color,
                background: `linear-gradient(135deg, ${data.player.team_color}08 0%, ${data.player.team_color2}05 50%, ${data.player.team_color}03 100%)`
              }}
            >
              {/* Modern mesh gradient background */}
              <div 
                className="absolute inset-0 opacity-[0.02]"
                style={{
                  background: `
        radial-gradient(circle at 20% 80%, ${data.player.team_color} 0%, transparent 50%), 
        radial-gradient(circle at 80% 20%, ${data.player.team_color2} 0%, transparent 50%),
        radial-gradient(circle at 40% 40%, ${data.player.team_color} 0%, transparent 30%)
      `
                }}
              />
              
              {/* Animated accent bars with glow */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1 rounded-r-full shadow-lg"
                style={{ 
                  backgroundColor: data.player.team_color,
                  boxShadow: `0 0 10px ${data.player.team_color}60`
                }}
              />
              <div 
                className="absolute right-0 top-0 bottom-0 w-0.5 rounded-l-full opacity-60"
                style={{ backgroundColor: data.player.team_color2 }}
              />
              
              <div className={`flex ${isMobile ? 'flex-col gap-4' : 'items-center gap-8'} relative z-10`}>
                {/* Enhanced player headshot */}
                <div className="relative group">
                  <div className="relative">
                    <div className="w-32 h-32 relative">
                      <img
                        src={data.player.headshot_url || '/player-placeholder.png'}
                        alt={data.player.full_name}
                        className="w-full h-full object-cover rounded-2xl group-hover:scale-105 transition-transform shadow-xl"
                      />
                    </div>
                    {/* Subtle overlay for better contrast */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent rounded-2xl"></div>
                  </div>
                  
                  {/* Team badge */}
                  <div 
                    className="absolute -bottom-4 -right-4 w-12 h-12 bg-background rounded-full border-4 flex items-center justify-center shadow-xl transition-transform group-hover:scale-110"
                    style={{ borderColor: data.player.team_color }}
                  >
                    <div 
                      className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white shadow-inner"
                      style={{ backgroundColor: data.player.team_color }}
                    >
                      {data.player.team_abbreviation}
                    </div>
                  </div>
                </div>
                
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-foreground mb-3 tracking-tight">{data.player.full_name}</h2>
                  <div className="flex items-center gap-3 mb-3">
                    <Badge 
                      className="px-4 py-1.5 text-sm font-bold shadow-lg border-0"
                      style={{ 
                        backgroundColor: data.player.team_color, 
                        color: getContrastColor(data.player.team_color),
                        boxShadow: `0 4px 12px ${data.player.team_color}40`
                      }}
                    >
                      {data.player.position}
                    </Badge>
                    <Badge 
                      variant="outline" 
                      className="px-4 py-1.5 text-sm font-bold border-2 backdrop-blur-sm"
                      style={{ 
                        borderColor: data.player.team_color, 
                        color: data.player.team_color,
                        backgroundColor: `${data.player.team_color}15`
                      }}
                    >
                      {data.player.team_abbreviation}
                    </Badge>
                    <div className="flex items-center gap-2 text-sm text-muted-foreground bg-muted/60 px-4 py-1.5 rounded-full backdrop-blur-sm border border-border/50">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-sm"></div>
                      <span className="font-medium">{data.platforms.length} platforms</span>
                    </div>
                  </div>
                  <div className="text-lg font-semibold text-muted-foreground">
                    {data.player.team_name}
                  </div>
                </div>
              </div>
            </div>

            {/* Enhanced Controls */}
            <div 
              className={`flex flex-col ${isMobile ? 'gap-6 p-4' : 'sm:flex-row items-start sm:items-center justify-between gap-4 p-6'} bg-gradient-to-r from-muted/30 to-muted/10 rounded-2xl border-l-4 shadow-sm backdrop-blur-sm`}
              style={{ borderLeftColor: data.player.team_color }}
            >
              <div className="flex items-center space-x-4">
                <div 
                  className="w-3 h-3 rounded-full animate-pulse shadow-sm"
                  style={{ 
                    backgroundColor: data.player.team_color,
                    boxShadow: `0 0 8px ${data.player.team_color}60`
                  }}
                />
                <Switch 
                  id="rank-type" 
                  checked={showPositionRank}
                  onCheckedChange={setShowPositionRank}
                  className="data-[state=checked]:bg-primary"
                />
                <Label htmlFor="rank-type" className="text-sm font-semibold cursor-pointer select-none">
                  {showPositionRank ? 'Position Rank' : 'ADP'}
                </Label>
              </div>
              
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-muted-foreground mr-2">Platforms:</span>
                {data.platforms.map((platform) => (
                  <Button
                    key={platform}
                    variant={visiblePlatforms[platform] ? "default" : "outline"}
                    size="sm"
                    onClick={() => togglePlatformVisibility(platform)}
                    className={`text-xs font-semibold transition-all duration-300 backdrop-blur-sm ${
                      visiblePlatforms[platform] 
                        ? "opacity-100 shadow-lg scale-105 border-2" 
                        : "opacity-70 hover:opacity-100 hover:scale-105"
                    }`}
                    style={{
                      borderColor: visiblePlatforms[platform] 
                        ? PLATFORM_COLORS[platform] || '#6b7280'
                        : undefined,
                      backgroundColor: visiblePlatforms[platform]
                        ? `${PLATFORM_COLORS[platform] || '#6b7280'}15`
                        : undefined,
                      color: visiblePlatforms[platform]
                        ? PLATFORM_COLORS[platform] || '#6b7280'
                        : undefined
                    }}
                  >
                    <div 
                      className="w-2.5 h-2.5 rounded-full mr-2 shadow-sm"
                      style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6b7280' }}
                    />
                    {platform}
                  </Button>
                ))}
              </div>
            </div>

            {/* Enhanced Chart */}
            <div className="bg-card border-2 border-border rounded-2xl p-6 shadow-xl relative overflow-hidden backdrop-blur-sm">
              {/* Subtle background pattern */}
              <div 
                className="absolute top-0 right-0 w-40 h-40 opacity-[0.02] rounded-full -translate-y-20 translate-x-20"
                style={{ backgroundColor: data.player.team_color }}
              />
              <div 
                className="absolute bottom-0 left-0 w-32 h-32 opacity-[0.02] rounded-full translate-y-16 -translate-x-16"
                style={{ backgroundColor: data.player.team_color2 }}
              />
              
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold flex items-center gap-3">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm"
                    style={{ 
                      backgroundColor: `${data.player.team_color}20`,
                      border: `1px solid ${data.player.team_color}30`
                    }}
                  >
                    <TrendingUp className="w-5 h-5" style={{ color: data.player.team_color }} />
                  </div>
                  {showPositionRank ? 'Position Rank Trends' : 'ADP Trends'}
                </h3>
                <div className="flex items-center gap-2">
                  <Badge 
                    variant="secondary" 
                    className="text-xs px-3 py-1.5 font-medium border backdrop-blur-sm"
                    style={{ 
                      backgroundColor: 'hsl(var(--muted))',
                      borderColor: `${data.player.team_color}40`,
                      color: 'hsl(var(--muted-foreground))'
                    }}
                  >
                    Lower is better
                  </Badge>
                  <div className="flex items-center gap-1 text-xs text-muted-foreground bg-muted/50 px-2 py-1 rounded-full">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
                    Live data
                  </div>
                </div>
              </div>
              
              <div className={`${isMobile ? 'h-[300px]' : 'h-96'} relative`}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.3} />
                    <XAxis 
                      dataKey="date" 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={isMobile ? 8 : 10}
                      angle={-45}
                      textAnchor="end"
                      height={isMobile ? 50 : 70}
                      interval={isMobile ? 1 : "preserveStartEnd"}
                      tick={{ fontSize: isMobile ? 8 : 10 }}
                    />
                    <YAxis 
                      stroke="hsl(var(--muted-foreground))"
                      fontSize={12}
                      domain={['dataMin - 10', 'dataMax + 10']}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: `2px solid ${data.player.team_color}`,
                        borderRadius: '12px',
                        color: 'hsl(var(--foreground))',
                        boxShadow: `0 8px 32px ${data.player.team_color}20`
                      }}
                      formatter={(value: any, name: string) => [
                        showPositionRank ? `${data.player.position}${value}` : `#${value}`,
                        `${name} ${showPositionRank ? 'Position Rank' : 'ADP'}`
                      ]}
                      labelFormatter={(label) => `${label}`}
                    />
                    <Legend />
                    
                    {data.platforms.map((platform) => (
                      visiblePlatforms[platform] && (
                        <Line
                          key={platform}
                          type="monotone"
                          dataKey={platform}
                          stroke={PLATFORM_COLORS[platform] || '#6b7280'}
                          strokeWidth={3}
                          dot={false}
                          activeDot={false}
                          connectNulls={false}
                          name={platform}
                        />
                      )
                    ))}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-border"></div>
            
            {/* Enhanced Platform Legend */}
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'}`}>
              {data.platforms.map((platform) => {
                const platformData = data.grouped_by_platform[platform];
                const latestData = platformData?.data[platformData.data.length - 1];
                const firstData = platformData?.data[0];
                
                const latestRank = showPositionRank ? latestData?.position_rank : latestData?.overall_rank;
                const firstRank = showPositionRank ? firstData?.position_rank : firstData?.overall_rank;
                const trendRaw =
                  latestRank != null && firstRank != null ? latestRank - firstRank : 0;
                const trendAbsRounded = Number(Math.abs(trendRaw).toFixed(2));
                
                return (
                  <div 
                    key={platform}
                    className={`relative p-4 md:p-5 rounded-xl border transition-colors duration-200 ${
                      visiblePlatforms[platform]
                        ? 'bg-card/70 border-border/60 shadow-sm hover:shadow-md'
                        : 'bg-muted/30 border-border/40 opacity-75'
                    }`}
                    style={{
                      background: visiblePlatforms[platform]
                        ? `linear-gradient(135deg, ${PLATFORM_COLORS[platform]}0A 0%, transparent 100%)`
                        : undefined
                    }}
                  >
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: PLATFORM_COLORS[platform] || '#6b7280' }}
                        />
                        <span className="font-semibold text-sm">{platform}</span>
                      </div>
                      {trendRaw !== 0 && (
                        <div className={`flex items-center gap-1 text-xs font-bold px-3 py-1.5 rounded-full shadow-sm border ${
                          trendRaw > 0 
                            ? 'text-red-700 bg-red-50 border-red-200 dark:text-red-400 dark:bg-red-950 dark:border-red-800' 
                            : 'text-green-700 bg-green-50 border-green-200 dark:text-green-400 dark:bg-green-950 dark:border-green-800'
                        }`}>
                          {trendRaw > 0 ? '↓' : '↑'} {trendAbsRounded}
                        </div>
                      )}
                    </div>
                    {latestRank && (
                      <p className="text-3xl font-black mb-2 tracking-tight" style={{ color: PLATFORM_COLORS[platform] }}>
                        {showPositionRank ? `${data.player.position}${latestRank}` : `#${latestRank}`}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground flex items-center gap-2 font-medium">
                      <div className="w-2 h-2 bg-muted-foreground/60 rounded-full"></div>
                      {showPositionRank 
                        ? `Overall: #${latestData?.overall_rank || 'N/A'}` 
                        : `Position: ${data.player.position}${latestData?.position_rank || 'N/A'}`
                      }
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
