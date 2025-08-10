'use client'

import { useState } from 'react'
import { Download } from 'lucide-react'
import { ADPFiltersState, POSITION_OPTIONS, LEAGUE_SIZE_OPTIONS, COMPARISON_OPTIONS, PLATFORM_INFO, PAGE_SIZE_OPTIONS, PositionFilter, ComparisonMode, ADPPlayer } from './types'

interface ADPFiltersProps {
  filters: ADPFiltersState
  onFiltersChange: (filters: ADPFiltersState) => void
  filteredPlayers?: ADPPlayer[]
}

export default function ADPFilters({ 
  filters, 
  onFiltersChange,
  filteredPlayers = []
}: ADPFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search)

  // CSV Export function
  const exportToCSV = () => {
    if (!filteredPlayers || filteredPlayers.length === 0) {
      alert('No data to export')
      return
    }

    // Define CSV headers
    const headers = [
      'Player Name',
      'Team',
      'Position',
      'NFC Rank',
      'NFC Draft Position',
      'NFC Position Rank',
      'Consensus Rank',
      'Consensus Draft Position', 
      'Consensus Position Rank',
      'Sleeper Rank',
      'Sleeper Draft Position',
      'Sleeper Position Rank',
      'ESPN Rank',
      'ESPN Draft Position',
      'ESPN Position Rank',
      'Yahoo Rank',
      'Yahoo Draft Position',
      'Yahoo Position Rank'
    ]

    // Convert data to CSV format
    const csvData = filteredPlayers.map(player => [
      player.name,
      player.team,
      player.player_position,
      player.nfc_rank || '',
      player.nfc_draft_position || '',
      player.nfc_position_rank || '',
      player.consensus_rank || '',
      player.consensus_draft_position || '',
      player.consensus_position_rank || '',
      player.sleeper_rank || '',
      player.sleeper_draft_position || '',
      player.sleeper_position_rank || '',
      player.espn_rank || '',
      player.espn_draft_position || '',
      player.espn_position_rank || '',
      player.yahoo_rank || '',
      player.yahoo_draft_position || '',
      player.yahoo_position_rank || ''
    ])

    // Create CSV content
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(field => 
        // Escape commas and quotes in field values
        typeof field === 'string' && (field.includes(',') || field.includes('"')) 
          ? `"${field.replace(/"/g, '""')}"` 
          : field
      ).join(','))
    ].join('\n')

    // Create and download file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    
    // Generate filename with current filters
    const positionFilter = filters.position || 'ALL'
    const leagueSize = filters.league_size
    const timestamp = new Date().toISOString().slice(0, 10)
    const filename = `ADP_Rankings_${positionFilter}_${leagueSize}team_${timestamp}.csv`
    
    link.setAttribute('download', filename)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const handlePositionChange = (position: PositionFilter) => {
    onFiltersChange({
      ...filters,
      position: position === 'ALL' ? null : position
    })
  }

  const handleLeagueSizeChange = (leagueSize: number) => {
    onFiltersChange({
      ...filters,
      league_size: leagueSize
    })
  }

  const handleComparisonModeChange = (mode: ComparisonMode) => {
    onFiltersChange({
      ...filters,
      comparison_mode: mode
    })
  }

  const handlePlatformVisibilityChange = (platform: keyof ADPFiltersState['visible_platforms'], visible: boolean) => {
    onFiltersChange({
      ...filters,
      visible_platforms: {
        ...filters.visible_platforms,
        [platform]: visible
      }
    })
  }

  const handleSearchChange = (search: string) => {
    setLocalSearch(search)
    onFiltersChange({
      ...filters,
      search
    })
  }

  return (
    <div className="bg-card rounded-lg shadow-lg p-4 mb-4 border border-border">
      {/* Header with Download Button */}
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-foreground">Filters</h3>
        <button
          onClick={exportToCSV}
          disabled={!filteredPlayers || filteredPlayers.length === 0}
          className="inline-flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-primary-foreground text-sm font-medium rounded-lg transition-colors"
        >
          <Download className="w-4 h-4" />
          Export CSV ({filteredPlayers?.length || 0})
        </button>
      </div>
      
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Position Filter */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Position
          </label>
          <div className="flex flex-wrap gap-2">
            {POSITION_OPTIONS.map((option) => (
              <button
                key={option.value}
                onClick={() => handlePositionChange(option.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  (option.value === 'ALL' && !filters.position) || 
                  (option.value === filters.position)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* League Size Filter */}
        <div className="w-full lg:w-48">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            League Size
          </label>
          <select
            value={filters.league_size}
            onChange={(e) => handleLeagueSizeChange(Number(e.target.value))}
            className="w-full px-3 py-1.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {LEAGUE_SIZE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Comparison Mode */}
        <div className="flex-1 lg:max-w-xs">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Color Comparison
          </label>
          <select
            value={filters.comparison_mode}
            onChange={(e) => handleComparisonModeChange(e.target.value as ComparisonMode)}
            className="w-full px-3 py-1.5 border border-input rounded-lg bg-background text-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          >
            {COMPARISON_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Platform Visibility Checkboxes */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Platforms
          </label>
          <div className="flex flex-wrap gap-1.5">
            {Object.entries(PLATFORM_INFO).map(([key, info]) => {
              const platformKey = key as keyof ADPFiltersState['visible_platforms']
              const isVisible = filters.visible_platforms[platformKey]
              
              return (
                <label key={key} className="flex items-center cursor-pointer group">
                  <input
                    type="checkbox"
                    checked={isVisible}
                    onChange={(e) => handlePlatformVisibilityChange(platformKey, e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`px-2 py-1 rounded text-sm font-medium transition-colors ${
                    isVisible 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
                  }`}>
                    {info.label}
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Search Filter */}
        <div className="flex-1 lg:max-w-xs">
          <label className="block text-sm font-medium text-foreground mb-1.5">
            Search Players
          </label>
          <input
            type="text"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search by name..."
            className="w-full px-3 py-1.5 border border-input rounded-lg bg-background text-foreground placeholder:text-muted-foreground focus:ring-2 focus:ring-ring focus:border-transparent"
          />
        </div>


      </div>
    </div>
  )
}