'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ADPPlayer, ADPResponse, ADPFiltersState } from './types'
import ADPFilters from './ADPFilters'
import ADPTable from './ADPTable'

// Fetch function for React Query
const fetchADPData = async (leagueSize: number): Promise<ADPResponse> => {
  const response = await fetch(`/api/fantasy-adp?league_size=${leagueSize}&limit=300`)
  if (!response.ok) {
    throw new Error('Failed to fetch ADP data')
  }
  return response.json()
}

export default function ADPSmashboard() {
  const [filters, setFilters] = useState<ADPFiltersState>({
    position: null,
    league_size: 12,
    search: '',
    comparison_mode: 'nfc', // Default to comparing against NFC
    visible_platforms: {
      nfc: true,
      consensus: true,
      sleeper: true,
      espn: true,
      yahoo: true
    },
    sort_by: 'consensus', // Default sort by consensus
    sort_direction: 'asc', // Default ascending (best rank first)
    // Pagination defaults
    pagination_enabled: true, // Default to pagination
    current_page: 1,
    page_size: 50
  })

  // Use React Query for data fetching with caching
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['adp-data', filters.league_size],
    queryFn: () => fetchADPData(filters.league_size),
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
    refetchOnWindowFocus: false,
    retry: 2,
  })

  const players = data?.data || []
  const lastUpdated = data?.meta?.last_updated || null
  const error = queryError?.message || data?.error || null



  // Filter and paginate players based on current filters
  const { filteredPlayers, paginatedPlayers, totalPages } = useMemo(() => {
    let filtered = [...players]

    // Position filter
    if (filters.position) {
      if (filters.position === 'FLEX') {
        // FLEX includes WR, RB, TE
        filtered = filtered.filter(player => 
          player.player_position === 'WR' || 
          player.player_position === 'RB' || 
          player.player_position === 'TE'
        )
      } else {
        filtered = filtered.filter(player => player.player_position === filters.position)
      }
    }

    // Search filter
    if (filters.search.trim()) {
      const searchTerm = filters.search.toLowerCase().trim()
      filtered = filtered.filter(player => 
        player.name.toLowerCase().includes(searchTerm) ||
        player.team.toLowerCase().includes(searchTerm)
      )
    }

    // Sort players based on selected column (rank or value vs NFC)
    filtered.sort((a, b) => {
      const getValueForSort = (player: any, key: string) => {
        const diff = (pr: number | null, nfc: number | null) =>
          pr == null || nfc == null ? null : pr - nfc

        switch (key) {
          // Rank columns
          case 'nfc': return player.nfc_rank
          case 'consensus': return player.consensus_rank
          case 'sleeper': return player.sleeper_rank
          case 'espn': return player.espn_rank
          case 'yahoo': return player.yahoo_rank
          // Value columns (delta vs NFC)
          case 'consensus_value': return diff(player.consensus_rank, player.nfc_rank)
          case 'sleeper_value': return diff(player.sleeper_rank, player.nfc_rank)
          case 'espn_value': return diff(player.espn_rank, player.nfc_rank)
          case 'yahoo_value': return diff(player.yahoo_rank, player.nfc_rank)
          default: return player.consensus_rank
        }
      }

      const aVal = getValueForSort(a, filters.sort_by as string)
      const bVal = getValueForSort(b, filters.sort_by as string)

      // Handle null values (put them at the end)
      if (aVal == null && bVal == null) return 0
      if (aVal == null) return 1
      if (bVal == null) return -1

      const comparison = aVal - bVal
      return filters.sort_direction === 'asc' ? comparison : -comparison
    })

    // Calculate pagination
    const totalPages = Math.ceil(filtered.length / filters.page_size)
    const startIndex = (filters.current_page - 1) * filters.page_size
    const endIndex = startIndex + filters.page_size
    const paginated = filtered.slice(startIndex, endIndex)

    return {
      filteredPlayers: filtered,
      paginatedPlayers: paginated,
      totalPages
    }
  }, [players, filters.position, filters.search, filters.sort_by, filters.sort_direction, filters.page_size, filters.current_page])

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg text-muted-foreground">
            Loading ADP data...
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (error) {
    return (
      <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-6">
        <div className="flex items-center">
          <div className="text-destructive text-2xl mr-3">⚠️</div>
          <div>
            <h3 className="text-lg font-semibold text-destructive mb-1">
              Error Loading Data
            </h3>
            <p className="text-destructive">
              {error}
            </p>
            <button
              onClick={() => fetchADPData(filters.league_size)}
              className="mt-3 px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              Try Again
            </button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Filters */}
      <ADPFilters
        filters={filters}
        onFiltersChange={setFilters}
        filteredPlayers={filteredPlayers}
      />

      {/* Table */}
      <ADPTable 
        players={paginatedPlayers}
        leagueSize={filters.league_size}
        comparisonMode={filters.comparison_mode}
        visiblePlatforms={filters.visible_platforms}
        sortBy={filters.sort_by}
        sortDirection={filters.sort_direction}
        lastUpdated={lastUpdated}
        paginationEnabled={true}
        currentPage={filters.current_page}
        totalPages={totalPages}
        totalResults={filteredPlayers.length}
        pageSize={filters.page_size}
        onSortChange={(sortBy: ADPFiltersState["sort_by"], sortDirection: ADPFiltersState["sort_direction"]) => {
          setFilters(prev => ({
            ...prev,
            sort_by: sortBy,
            sort_direction: sortDirection
          }))
        }}
        onPageChange={(page: number) => {
          setFilters(prev => ({
            ...prev,
            current_page: page
          }))
        }}
        onPageSizeChange={(size: number) => {
          setFilters(prev => ({
            ...prev,
            page_size: size,
            current_page: 1 // Reset to first page when changing page size
          }))
        }}
      />

      {/* Additional Info */}
      <div className="bg-primary/10 border border-primary/20 rounded-lg p-4">
        <h4 className="font-semibold text-foreground mb-2">
          💡 How to Use ADP Smashboard
        </h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• <strong>Consensus Rank:</strong> Average ranking across ESPN, Sleeper, and Yahoo</li>
          <li>• <strong>Draft Position:</strong> Round.Pick format (e.g., 1.05 = 1st round, 5th pick)</li>
          <li>• <strong>Find Value:</strong> Look for big differences between platforms</li>
          <li>• <strong>League Size:</strong> Adjust to match your league for accurate draft positions</li>
        </ul>
      </div>
    </div>
  )
}