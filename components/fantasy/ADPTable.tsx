"use client"

import type React from "react"

import { useState, useMemo, useCallback, useEffect, useRef, memo } from "react"
import { ChevronUp, ChevronDown } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { useIsMobile } from "@/hooks/use-mobile"
import PlayerADPModal from "./PlayerADPModal"


// Mock types (replace with your actual imports)
interface ADPPlayer {
  player_id: string
  name: string
  team: string
  team_color: string
  player_position: string
  headshot_url: string
  nfc_rank: number | null
  nfc_draft_position: string | null
  nfc_position_rank: number | null
  consensus_rank: number | null
  consensus_draft_position: string | null
  consensus_position_rank: number | null
  sleeper_rank: number | null
  sleeper_draft_position: string | null
  sleeper_position_rank: number | null
  espn_rank: number | null
  espn_draft_position: string | null
  espn_position_rank: number | null
  yahoo_rank: number | null
  yahoo_draft_position: string | null
  yahoo_position_rank: number | null
  cbs_rank: number | null
  cbs_draft_position: string | null
  cbs_position_rank: number | null
}

interface ADPFiltersState {
  visible_platforms: {
    nfc: boolean
    consensus: boolean
    sleeper: boolean
    espn: boolean
    yahoo: boolean
    cbs: boolean
  }
  sort_by: string
  sort_direction: "asc" | "desc"
}

import { PLATFORM_INFO } from '@/lib/platform-config';

interface ADPTableProps {
  players: ADPPlayer[]
  leagueSize: number
  comparisonMode: "nfc" | "consensus"
  visiblePlatforms: ADPFiltersState["visible_platforms"]
  sortBy: ADPFiltersState["sort_by"]
  sortDirection: ADPFiltersState["sort_direction"]
  lastUpdated: string | null
  paginationEnabled?: boolean
  currentPage?: number
  totalPages?: number
  totalResults?: number
  pageSize?: number
  onSortChange: (sortBy: ADPFiltersState["sort_by"], sortDirection: ADPFiltersState["sort_direction"]) => void
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

// Enhanced virtualization hook with throttling for better performance
function useVirtualization(itemHeight: number, containerHeight: number, totalItems: number) {
  const [scrollTop, setScrollTop] = useState(0)
  const [visibleRange, setVisibleRange] = useState({ start: 0, end: 20 })
  const rafId = useRef<number>()

  useEffect(() => {
    const startIndex = Math.floor(scrollTop / itemHeight)
    const endIndex = Math.min(startIndex + Math.ceil(containerHeight / itemHeight) + 5, totalItems)

    setVisibleRange({ start: Math.max(0, startIndex - 2), end: endIndex })
  }, [scrollTop, itemHeight, containerHeight, totalItems])

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    // Cancel previous frame
    if (rafId.current) {
      cancelAnimationFrame(rafId.current)
    }
    
    // Capture scroll value immediately before it becomes stale
    const scrollValue = e.currentTarget.scrollTop
    
    // Schedule update for next frame
    rafId.current = requestAnimationFrame(() => {
      setScrollTop(scrollValue)
    })
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current)
      }
    }
  }, [])

  return { visibleRange, handleScroll, scrollTop }
}

// Optimized player avatar component with caching
const PlayerAvatar = memo(({ 
  headshotUrl, 
  playerName, 
  team, 
  teamColor,
  isVisible,
  showAvatar = true
}: {
  headshotUrl: string
  playerName: string
  team: string
  teamColor: string
  isVisible: boolean
  showAvatar?: boolean
}) => {
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageFailed, setImageFailed] = useState(false)

  // Reset state when URL changes
  useEffect(() => {
    if (headshotUrl) {
      setImageLoaded(false)
      setImageFailed(false)
    }
  }, [headshotUrl])

  // Don't render image if not visible in viewport or if showAvatar is false
  if (!showAvatar || !isVisible || !headshotUrl || imageFailed) {
    return showAvatar ? (
      <div
        className="w-10 h-10 rounded-full flex items-center justify-center text-xs font-bold text-white ring-2 ring-background shadow-sm"
        style={{ backgroundColor: teamColor || "#6B7280" }}
      >
        {team}
      </div>
    ) : null
  }

  return (
    <div className="relative">
      <div
        className="w-10 h-10 rounded-full p-0.5 ring-2 ring-background shadow-sm"
        style={{ backgroundColor: teamColor }}
      >
        {/* Fallback while loading */}
        {!imageLoaded && (
          <div className="w-full h-full rounded-full flex items-center justify-center text-xs font-bold text-white"
               style={{ backgroundColor: teamColor || "#6B7280" }}>
            {team}
          </div>
        )}
        
        <img
          src={headshotUrl}
          alt={playerName}
          className={`w-full h-full rounded-full object-cover transition-opacity duration-200 ${
            imageLoaded ? 'opacity-100' : 'opacity-0 absolute inset-0'
          }`}
          loading="lazy"
          decoding="async"
          fetchPriority="low"
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageFailed(true)}
          style={{ 
            contentVisibility: 'auto',
            containIntrinsicSize: '40px 40px'
          }}
        />
      </div>
    </div>
  )
})

PlayerAvatar.displayName = 'PlayerAvatar'

// Improved player row component
const PlayerRow = memo(({
  player,
  index,
  isVisible,
  comparisonMode,
  visiblePlatforms,
  isMobile,
  onPlayerClick,
}: {
  player: ADPPlayer
  index: number
  isVisible: boolean
  comparisonMode: "nfc" | "consensus"
  visiblePlatforms: ADPFiltersState["visible_platforms"]
  isMobile: boolean
  onPlayerClick: (playerId: string) => void
}) => {
  // Helper function to get comparison colors and trend indicators
  const getComparisonData = (currentRank: number | null, baseRank: number | null, platformName: string) => {
    if (!currentRank || !baseRank || platformName === comparisonMode) {
      return {
        bgColor: "bg-muted/50",
        textColor: "text-muted-foreground",
        trend: null,
        delta: null,
      }
    }

    const difference = currentRank - baseRank

    if (difference <= -15)
      return {
        bgColor: "bg-red-200/90 dark:bg-red-950 border-2 border-red-300 dark:border-red-800",
        textColor: "text-red-800 dark:text-red-300 font-medium",
        trend: "reach-high",
        delta: difference,
      }
    if (difference <= -8)
      return {
        bgColor: "bg-red-100/90 dark:bg-red-900/70 border border-red-200 dark:border-red-700",
        textColor: "text-red-700 dark:text-red-400 font-medium",
        trend: "reach",
        delta: difference,
      }
    if (difference >= 15)
      return {
        bgColor: "bg-emerald-200/90 dark:bg-emerald-950 border-2 border-emerald-300 dark:border-emerald-800",
        textColor: "text-emerald-800 dark:text-emerald-300 font-medium",
        trend: "value-high",
        delta: difference,
      }
    if (difference >= 8)
      return {
        bgColor: "bg-emerald-100/90 dark:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-700",
        textColor: "text-emerald-700 dark:text-emerald-400 font-medium",
        trend: "value",
        delta: difference,
      }

    return {
      bgColor: "bg-muted/30 border border-border",
      textColor: "text-foreground",
      trend: "similar",
      delta: difference,
    }
  }

  const getRankDisplay = (
    rank: number | null,
    draftPosition: string | null,
    positionRank: number | null,
    position: string,
    platformName: string,
  ) => {
    if (!rank || !draftPosition) {
      return (
        <div
          className={`relative rounded-md ${isMobile ? 'p-1' : 'p-1.5'} hover:shadow-sm text-center bg-muted/30 text-muted-foreground border border-border h-11 md:h-14 flex items-center justify-center`}
        >
          <span className="text-sm">-</span>
        </div>
      )
    }

    const baseRank = comparisonMode === "nfc" ? player.nfc_rank : player.consensus_rank
    const comparisonData = getComparisonData(rank, baseRank, platformName)

    return (
      <TooltipProvider>
        <Tooltip>
          <TooltipTrigger asChild>
            <div
              className={`
               relative rounded-md ${isMobile ? 'p-1' : 'p-1.5'} hover:shadow-sm cursor-help transition-all duration-200
               ${comparisonData.bgColor} ${comparisonData.textColor} h-11 md:h-14 flex flex-col items-center justify-center
             `}
            >
              {/* Rank as main focal point */}
              <div className="text-center">
                <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold leading-none mb-0.5`}>{rank}</div>
                {/* Draft position and position rank - mobile: stacked, desktop: same line */}
                {isMobile ? (
                  <div className="flex flex-col items-center gap-0.5">
                    <div className="text-[9px] opacity-75 leading-none">{draftPosition}</div>
                    {positionRank && (
                      <div className="text-[8px] opacity-60 leading-none font-medium">
                        {position}
                        {positionRank}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center gap-1">
                    <div className="text-xs opacity-75 leading-none">{draftPosition}</div>
                    {positionRank && (
                      <>
                        <div className="text-[9px] opacity-40">•</div>
                        <div className="text-[11px] opacity-60 leading-none font-medium">
                          {position}
                          {positionRank}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs z-50" sideOffset={5}>
            <div className="text-center">
              <div className="font-semibold">
                {PLATFORM_INFO[platformName as keyof typeof PLATFORM_INFO]?.label} Ranking
              </div>
              <div className="text-sm opacity-90">
                Overall: #{rank} • Draft: {draftPosition}
                {positionRank && (
                  <>
                    <br />
                    Position: {position}
                    {positionRank}
                  </>
                )}
              </div>
              {comparisonData.delta && platformName !== comparisonMode && (
                <div className="text-xs mt-1 pt-1 border-t border-border/50">
                  {comparisonData.delta > 0 ? "+" : ""}
                  {comparisonData.delta} vs {comparisonMode.toUpperCase()}
                </div>
              )}
            </div>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
    )
  }

  // Render delta vs NFC for a given platform
  const getValueDisplay = (
    platformRank: number | null,
    platformKey: 'consensus' | 'sleeper' | 'espn' | 'yahoo' | 'cbs'
  ) => {
    const baseRank = comparisonMode === 'consensus'
      ? (platformKey === 'consensus' ? player.nfc_rank : player.consensus_rank)
      : player.nfc_rank
    if (!platformRank || !baseRank) {
      return (
        <div className="flex items-center justify-center h-full py-1">
          <span className="text-muted-foreground text-sm">-</span>
        </div>
      )
    }
    const diff = platformRank - baseRank
    // Reuse color thresholds from getComparisonData with current baseline
    const styles = getComparisonData(platformRank, baseRank, 'value')
    return (
      <div
        className={`relative rounded-md ${isMobile ? 'p-1' : 'p-1.5'} text-center ${styles.bgColor} ${styles.textColor} h-11 md:h-14 flex flex-col items-center justify-center`}
      >
        <div className={`${isMobile ? 'text-lg' : 'text-xl'} font-bold leading-none mb-0.5`}>
          {diff > 0 ? '+' : ''}{diff}
        </div>
        {!isMobile && (
          <div className="text-[10px] opacity-75 leading-none mt-0.5">vs {(baseRank === player.nfc_rank ? 'NFC' : 'CONSENSUS')}</div>
        )}
      </div>
    )
  }



  if (!isVisible) {
    return <div className="h-13 border-b border-border" style={{ minHeight: "52px" }} />
  }

  return (
    <div 
      className="border-b border-border hover:bg-muted/50 relative cursor-pointer transition-all duration-200 hover:shadow-sm group"
      onClick={() => onPlayerClick(player.player_id)}
    >
      <div className={`flex items-center ${isMobile ? 'px-2 py-1.5 gap-1.5' : 'px-4 py-2 gap-3'}`}>
        {/* Player Info - Fixed width and sticky on mobile */}
        <div className={`flex items-center ${isMobile ? 'gap-1 w-32 sticky left-0 bg-background z-50 border-r border-border pr-2 py-1.5' : 'gap-2.5 w-72'} flex-shrink-0`}>
          <PlayerAvatar 
            headshotUrl={player.headshot_url}
            playerName={player.name}
            team={player.team}
            teamColor={player.team_color}
            isVisible={isVisible}
            showAvatar={!isMobile}
          />
          <div className="min-w-0 flex-1">
            <div className={`font-semibold text-foreground truncate group-hover:text-primary transition-colors ${isMobile ? 'text-xs' : 'text-sm'}`}>
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

        {/* Rankings - Responsive grid (add value columns next to each platform) */}
        <div className={`flex-1 grid ${isMobile ? 'grid-cols-[repeat(11,minmax(80px,1fr))] gap-1 min-w-[980px]' : 'grid-cols-[repeat(11,minmax(0,1fr))] gap-1.5'} items-start`}>
          {visiblePlatforms.nfc && (
            <div className="min-w-0">
              {getRankDisplay(
                player.nfc_rank,
                player.nfc_draft_position,
                player.nfc_position_rank,
                player.player_position,
                "nfc",
              )}
            </div>
          )}

          {visiblePlatforms.consensus && (
            <div className="min-w-0 border-l border-border pl-1 md:pl-2 bg-muted/10 dark:bg-muted/5 rounded-sm relative">
              {getRankDisplay(
                player.consensus_rank,
                player.consensus_draft_position,
                player.consensus_position_rank,
                player.player_position,
                "consensus",
              )}
            </div>
          )}
          {visiblePlatforms.consensus && (
            <div className="min-w-0 bg-muted/10 dark:bg-muted/5 rounded-sm relative">
              {getValueDisplay(
                player.consensus_rank,
                'consensus'
              )}
            </div>
          )}

          {visiblePlatforms.sleeper && (
            <div className="min-w-0 border-l border-border pl-1 md:pl-2">
              {getRankDisplay(
                player.sleeper_rank,
                player.sleeper_draft_position,
                player.sleeper_position_rank,
                player.player_position,
                "sleeper",
              )}
            </div>
          )}
          {visiblePlatforms.sleeper && (
            <div className="min-w-0">
              {getValueDisplay(
                player.sleeper_rank,
                'sleeper'
              )}
            </div>
          )}

          {visiblePlatforms.espn && (
            <div className="min-w-0 border-l border-border pl-1 md:pl-2 bg-muted/10 dark:bg-muted/5 rounded-sm">
              {getRankDisplay(
                player.espn_rank,
                player.espn_draft_position,
                player.espn_position_rank,
                player.player_position,
                "espn",
              )}
            </div>
          )}
          {visiblePlatforms.espn && (
            <div className="min-w-0 bg-muted/10 dark:bg-muted/5 rounded-sm">
              {getValueDisplay(
                player.espn_rank,
                'espn'
              )}
            </div>
          )}

          {visiblePlatforms.yahoo && (
            <div className="min-w-0 border-l border-border pl-1 md:pl-2">
              {getRankDisplay(
                player.yahoo_rank,
                player.yahoo_draft_position,
                player.yahoo_position_rank,
                player.player_position,
                "yahoo",
              )}
            </div>
          )}
          {visiblePlatforms.yahoo && (
            <div className="min-w-0">
              {getValueDisplay(
                player.yahoo_rank,
                'yahoo'
              )}
            </div>
          )}

          {visiblePlatforms.cbs && (
            <div className="min-w-0 border-l border-border pl-1 md:pl-2 bg-muted/10 dark:bg-muted/5 rounded-sm">
              {getRankDisplay(
                player.cbs_rank,
                player.cbs_draft_position,
                player.cbs_position_rank,
                player.player_position,
                "cbs",
              )}
            </div>
          )}
          {visiblePlatforms.cbs && (
            <div className="min-w-0 bg-muted/10 dark:bg-muted/5 rounded-sm">
              {getValueDisplay(
                player.cbs_rank,
                'cbs'
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
})

PlayerRow.displayName = 'PlayerRow'

// Simple pagination component
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

export default function ADPTable({
  players,
  leagueSize,
  comparisonMode,
  visiblePlatforms,
  sortBy,
  sortDirection,
  lastUpdated,
  paginationEnabled = false,
  currentPage = 1,
  totalPages = 1,
  totalResults = 0,
  pageSize = 50,
  onSortChange,
  onPageChange,
  onPageSizeChange,
}: ADPTableProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const headerScrollRef = useRef<HTMLDivElement>(null)
  const bodyScrollRef = useRef<HTMLDivElement>(null)
  const isMobile = useIsMobile()

  // Modal state for player ADP history
  const [selectedPlayerId, setSelectedPlayerId] = useState<string | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)

  const handlePlayerClick = useCallback((playerId: string) => {
    // Always close modal first to ensure clean state
    setIsModalOpen(false)
    setSelectedPlayerId(null)
    
    // Use a small delay to ensure the modal closes completely
    setTimeout(() => {
      setSelectedPlayerId(playerId)
      setIsModalOpen(true)
    }, 50)
  }, [])

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false)
    setSelectedPlayerId(null)
  }, [])

  const ITEM_HEIGHT = 52 // Reduced from 68px for tighter layout like competitor
  const CONTAINER_HEIGHT = 800

  const { visibleRange, handleScroll } = useVirtualization(ITEM_HEIGHT, CONTAINER_HEIGHT, players.length)

  // Sync horizontal scroll between header and body on mobile
  const syncHeaderScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMobile && headerScrollRef.current) {
      headerScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [isMobile])

  const syncBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    if (isMobile && bodyScrollRef.current) {
      bodyScrollRef.current.scrollLeft = e.currentTarget.scrollLeft
    }
  }, [isMobile])

  // Combined scroll handler for body
  const handleBodyScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    handleScroll(e) // Original virtualization scroll
    syncHeaderScroll(e) // Sync header scroll
  }, [handleScroll, syncHeaderScroll])

  // Keep header columns aligned with body when body shows vertical scrollbar
  useEffect(() => {
    const updateHeaderPadding = () => {
      if (!headerScrollRef.current || !bodyScrollRef.current) return
      const el = bodyScrollRef.current
      const scrollbarWidth = el.offsetWidth - el.clientWidth
      headerScrollRef.current.style.paddingRight = scrollbarWidth > 0 ? `${scrollbarWidth}px` : '0px'
    }
    updateHeaderPadding()
    window.addEventListener('resize', updateHeaderPadding)
    return () => window.removeEventListener('resize', updateHeaderPadding)
  }, [players.length, isMobile])

  // Preload images for better performance
  useEffect(() => {
    const preloadImages = () => {
      // Only preload images that will be visible soon
      const preloadStart = Math.max(0, visibleRange.start - 10)
      const preloadEnd = Math.min(players.length, visibleRange.end + 10)
      
      for (let i = preloadStart; i < preloadEnd; i++) {
        const player = players[i]
        if (player?.headshot_url) {
          const img = new Image()
          img.src = player.headshot_url
        }
      }
    }

    // Debounce preloading
    const timeoutId = setTimeout(preloadImages, 100)
    return () => clearTimeout(timeoutId)
  }, [visibleRange, players])

  // Convert timestamp to Central Time
  const getCentralTime = (timestamp: string | null) => {
    if (!timestamp) return null

    try {
      // Parse the timestamp - the database returns TIMESTAMP WITHOUT TIME ZONE
      // We need to explicitly treat it as UTC since that's what's stored in the database
      let date: Date

      if (timestamp.includes("T")) {
        // ISO format - treat as UTC if no timezone specified
        if (timestamp.includes("Z") || timestamp.includes("+") || timestamp.includes("-")) {
          date = new Date(timestamp)
        } else {
          // Add Z to indicate UTC
          date = new Date(timestamp + "Z")
        }
      } else {
        // Handle space-separated format (YYYY-MM-DD HH:MM:SS) by treating as UTC
        // Replace space with T and add Z to make it a proper UTC ISO string
        const isoString = timestamp.replace(" ", "T") + "Z"
        date = new Date(isoString)
      }

      // Check if date is valid
      if (isNaN(date.getTime())) {
        return "Invalid time"
      }

      const result = date.toLocaleString("en-US", {
        timeZone: "America/Chicago", // Central Time
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      })
      return result
    } catch (error) {
      return "Invalid time"
    }
  }

  // Handle column sorting
  const handleSort = (platform: ADPFiltersState["sort_by"]) => {
    if (sortBy === platform) {
      onSortChange(platform, sortDirection === "asc" ? "desc" : "asc")
    } else {
      onSortChange(platform, "asc")
    }
  }

  // Render sortable header
  const renderSortableHeader = (platform: ADPFiltersState["sort_by"], label: string, description: string) => (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort(platform)}
            className={`h-auto ${isMobile ? 'p-1' : 'p-2'} flex flex-col items-center gap-1 hover:bg-muted/50`}
          >
            <div className="flex items-center gap-1">
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wider`}>
                {isMobile ? label.slice(0, 3) : label}
              </span>
              {sortBy === platform && (
                <div className="text-primary">
                  {sortDirection === "asc" ? <ChevronDown className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} /> : <ChevronUp className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />}
                </div>
              )}
            </div>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>{description}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )

  // Render paired header: platform name (static) + two sortable sub-headers (Rank, Value)
  const renderPlatformPairHeader = (platformKey: ADPFiltersState["sort_by"], label: string, zebra?: boolean) => {
    const isActiveRank = sortBy === platformKey
    const valueKey = `${platformKey}_value` as ADPFiltersState["sort_by"]
    const isActiveValue = sortBy === valueKey
    return (
      <div className={`col-span-2 border-l border-border pl-1 md:pl-2 ${zebra ? 'bg-muted/10 dark:bg-muted/5 rounded-sm' : ''}`}> 
        <div className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wider text-muted-foreground text-center mb-1`}>
          {label}
        </div>
        <div className="grid grid-cols-2 gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort(platformKey)}
            className={`h-auto ${isMobile ? 'p-1' : 'p-2'} flex items-center justify-center gap-1 hover:bg-muted/50`}
          >
            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold uppercase`}>Rank</span>
            {isActiveRank && (
              <span className="text-primary">{sortDirection === 'asc' ? <ChevronDown className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} /> : <ChevronUp className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />}</span>
            )}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleSort(valueKey)}
            className={`h-auto ${isMobile ? 'p-1' : 'p-2'} flex items-center justify-center gap-1 hover:bg-muted/50`}
          >
            <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold uppercase`}>Value</span>
            {isActiveValue && (
              <span className="text-primary">{sortDirection === 'asc' ? <ChevronDown className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} /> : <ChevronUp className={`${isMobile ? 'w-2 h-2' : 'w-3 h-3'}`} />}</span>
            )}
          </Button>
        </div>
      </div>
    )
  }

  // Determine which players to render with stable reference
  const visiblePlayers = useMemo(() => {
    return players.slice(visibleRange.start, visibleRange.end)
  }, [players, visibleRange.start, visibleRange.end])

  // Memoize platform visibility check for better performance
  const visiblePlatformKeys = useMemo(() => {
    return Object.entries(visiblePlatforms)
      .filter(([, isVisible]) => isVisible)
      .map(([key]) => key)
  }, [visiblePlatforms])

  if (players.length === 0) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <div className="text-6xl mb-4">🔍</div>
          <h3 className="text-xl font-semibold mb-2">No players found</h3>
          <p className="text-muted-foreground">Try adjusting your filters to see more results.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
    <Card className="overflow-hidden">
      {/* Header */}
      <div className="bg-muted/50 px-4 py-3 border-b border-border">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <h3 className="text-lg font-semibold text-foreground">Fantasy ADP Rankings</h3>
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground">
            <span>
              {currentPage}/{totalPages}
            </span>
            {lastUpdated && <span>Updated: {getCentralTime(lastUpdated)} CT</span>}
          </div>
        </div>
      </div>

      {/* Column Headers */}
      <div className="bg-muted/30 border-b border-border sticky top-0 z-20">
        <div 
          ref={headerScrollRef}
          className={`${isMobile ? 'overflow-x-auto' : ''}`}
          onScroll={isMobile ? syncBodyScroll : undefined}
        >
          <div className={`flex items-center ${isMobile ? 'px-2 py-2 gap-1.5' : 'px-4 py-3 gap-4'}`}>
            <div className={`${isMobile ? 'w-32 sticky left-0 bg-background z-[60] border-r border-border pr-2 py-2 flex items-center' : 'w-72'} flex-shrink-0`}>
              <span className={`${isMobile ? 'text-[10px]' : 'text-xs'} font-semibold uppercase tracking-wider text-muted-foreground`}>Player</span>
            </div>
            <div className={`flex-1 grid ${isMobile ? 'grid-cols-[repeat(11,minmax(80px,1fr))] gap-1 min-w-[980px]' : 'grid-cols-11 gap-3'}`}>
            {visiblePlatforms.nfc && (
              <div className="col-span-1 flex items-center justify-center h-full">
                {renderSortableHeader("nfc", PLATFORM_INFO.nfc.label, PLATFORM_INFO.nfc.description)}
              </div>
            )}
            {visiblePlatforms.consensus && renderPlatformPairHeader("consensus", PLATFORM_INFO.consensus.label, true)}
            {visiblePlatforms.sleeper && renderPlatformPairHeader("sleeper", PLATFORM_INFO.sleeper.label, false)}
            {visiblePlatforms.espn && renderPlatformPairHeader("espn", PLATFORM_INFO.espn.label, true)}
            {visiblePlatforms.yahoo && renderPlatformPairHeader("yahoo", PLATFORM_INFO.yahoo.label, false)}
            {visiblePlatforms.cbs && renderPlatformPairHeader("cbs", PLATFORM_INFO.cbs.label, true)}
          </div>
        </div>
        </div>
      </div>

      {/* Table Body */}
      <div 
        ref={bodyScrollRef}
        className={`${isMobile ? 'overflow-x-auto overflow-y-auto' : 'overflow-y-auto'}`} 
        style={{ maxHeight: "700px" }}
        onScroll={isMobile ? handleBodyScroll : handleScroll}
      >
        {players.map((player, index) => (
          <PlayerRow
            key={player.player_id}
            player={player}
            index={index}
            isVisible={true}
            comparisonMode={comparisonMode}
            visiblePlatforms={visiblePlatforms}
            isMobile={isMobile}
            onPlayerClick={handlePlayerClick}
          />
        ))}
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

    {/* Player ADP History Modal */}
    <PlayerADPModal
      playerId={selectedPlayerId}
      isOpen={isModalOpen}
      onClose={handleCloseModal}
    />
  </>
  )
}
