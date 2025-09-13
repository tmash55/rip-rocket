'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/libs/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Loader2, RefreshCw, Edit3, Save, X, CheckCircle2 } from 'lucide-react'
import ResultsTable, { ResultsCardData } from '@/components/results/ResultsTable'
import ResultsGrid from '@/components/results/ResultsGrid'
import BulkEditModal from '@/components/results/BulkEditModal'
import BulkActionsToolbar from '@/components/results/BulkActionsToolbar'
import BatchHeader from '@/components/results/BatchHeader'

// Use the shared interface from the components
type CardData = ResultsCardData

interface JobStatus {
  id: string
  status: string
  progress: number
  attempts: number
}

interface BatchInfo {
  id: string
  name: string
  status: string
  total_files: number
  progress: number
  paired_count: number
  created_at: string
}

export default function ResultsDashboardPage() {
  const params = useParams()
  const batch_id = params.batch_id as string
  
  const [cards, setCards] = useState<ResultsCardData[]>([])
  const [jobStatus, setJobStatus] = useState<JobStatus | null>(null)
  const [batchInfo, setBatchInfo] = useState<BatchInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [editingCard, setEditingCard] = useState<string | null>(null)
  const [editForm, setEditForm] = useState<Partial<ResultsCardData>>({})
  const [previousCardCount, setPreviousCardCount] = useState(0)
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table')
  const [selectedCards, setSelectedCards] = useState<string[]>([])
  const [showBulkEdit, setShowBulkEdit] = useState(false)

  useEffect(() => {
    fetchData()
    // Poll more frequently during active processing
    const interval = setInterval(() => {
      fetchJobStatus()
      if (jobStatus?.status === 'processing') {
        fetchCards() // Refresh cards during processing to show real-time updates
      }
    }, 1000) // Poll every 1 second for real-time updates
    return () => clearInterval(interval)
  }, [batch_id, jobStatus?.status])

  const fetchData = async () => {
    await Promise.all([fetchCards(), fetchJobStatus(), fetchBatchInfo()])
    setLoading(false)
  }

  const fetchCards = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('cards')
        .select(`
          id,
          player,
          year,
          card_number,
          set_name,
          title,
          price,
          currency,
          condition,
          status,
          rarity_confidence,
          ocr_raw,
          is_graded,
          grading_company,
          grade,
          certification_number,
          parallel_type,
          insert_type,
          card_pairs!inner(
            id,
            front_upload:uploads!card_pairs_front_upload_id_fkey(storage_path),
            back_upload:uploads!card_pairs_back_upload_id_fkey(storage_path)
          )
        `)
        .eq('card_pairs.batch_id', batch_id)
        .order('created_at')

      if (error) throw error

      // Flatten the data structure and generate signed URLs
      const cardsWithUrls = await Promise.all(
        (data || []).map(async (card) => {
          try {
            const { data: frontUrl } = await supabase.storage
              .from('cards-images')
              .createSignedUrl((card.card_pairs as any).front_upload.storage_path, 3600)
            
            const { data: backUrl } = await supabase.storage
              .from('cards-images')
              .createSignedUrl((card.card_pairs as any).back_upload.storage_path, 3600)
            
            return {
              ...card,
              front_image_url: frontUrl?.signedUrl || '',
              back_image_url: backUrl?.signedUrl || ''
            }
          } catch (urlError) {
            console.error('Error generating signed URLs:', urlError)
            return {
              ...card,
              front_image_url: '',
              back_image_url: ''
            }
          }
        })
      )

      // Check for new cards and show notification
      if (cardsWithUrls.length > previousCardCount && previousCardCount > 0) {
        const newCardsCount = cardsWithUrls.length - previousCardCount
        console.log(`🎉 ${newCardsCount} new card${newCardsCount > 1 ? 's' : ''} analyzed!`)
      }
      
      setPreviousCardCount(cardsWithUrls.length)
      setCards(cardsWithUrls)
    } catch (error) {
      console.error('Error fetching cards:', error)
    }
  }

  const fetchJobStatus = async () => {
    try {
      const supabase = createClient()
      
      const { data, error } = await supabase
        .from('jobs')
        .select('id, status, progress, attempts')
        .eq('batch_id', batch_id)
        .eq('type', 'ocr')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (error && error.code !== 'PGRST116') throw error // Ignore not found
      setJobStatus(data)
    } catch (error) {
      console.error('Error fetching job status:', error)
    }
  }

  const fetchBatchInfo = async () => {
    try {
      const response = await fetch(`/api/batches/${batch_id}`)
      if (!response.ok) throw new Error('Failed to fetch batch info')
      
      const result = await response.json()
      if (result.success) {
        setBatchInfo(result.batch)
      }
    } catch (error) {
      console.error('Error fetching batch info:', error)
    }
  }

  const startEdit = (card: ResultsCardData) => {
    setEditingCard(card.id)
    setEditForm({
      player: card.player || '',
      year: card.year || '',
      card_number: card.card_number || '',
      set_name: card.set_name || '',
      title: card.title || '',
      price: card.price ?? null,
      condition: card.condition || '',
      is_graded: !!card.is_graded,
      grading_company: card.grading_company || '',
      grade: card.grade || '',
      certification_number: card.certification_number || '',
      parallel_type: card.parallel_type || '',
      insert_type: card.insert_type || ''
    })
  }

  const saveEdit = async () => {
    if (!editingCard) return

    try {
      const supabase = createClient()
      
      const { error } = await supabase
        .from('cards')
        .update(editForm)
        .eq('id', editingCard)

      if (error) throw error

      await fetchCards() // Refresh data
      setEditingCard(null)
      setEditForm({})
    } catch (error) {
      console.error('Error saving card:', error)
    }
  }

  const cancelEdit = () => {
    setEditingCard(null)
    setEditForm({})
  }

  const processMoreJobs = async () => {
    try {
      const response = await fetch('/api/jobs/process', {
        method: 'POST'
      })
      
      if (!response.ok) {
        throw new Error('Failed to process jobs')
      }
      
      await fetchJobStatus()
    } catch (error) {
      console.error('Error processing jobs:', error)
    }
  }

  // Selection handlers
  const handleSelectCard = (cardId: string, selected: boolean) => {
    setSelectedCards(prev => 
      selected 
        ? [...prev, cardId]
        : prev.filter(id => id !== cardId)
    )
  }

  const handleSelectAll = (selected: boolean) => {
    setSelectedCards(selected ? cards.map(card => card.id) : [])
  }

  const handleClearSelection = () => {
    setSelectedCards([])
  }

  // Bulk edit handlers
  const handleBulkEdit = () => {
    setShowBulkEdit(true)
  }

  const handleBulkSave = async (bulkData: any, enabledFields: string[]) => {
    try {
      const supabase = createClient()
      
      // Create update object with only enabled fields
      const updateData: any = {}
      enabledFields.forEach(field => {
        if (bulkData[field] !== undefined) {
          updateData[field] = bulkData[field]
        }
      })

      // Update all selected cards
      const { error } = await supabase
        .from('cards')
        .update(updateData)
        .in('id', selectedCards)

      if (error) throw error

      await fetchCards() // Refresh data
      setSelectedCards([]) // Clear selection
      console.log(`Successfully updated ${selectedCards.length} cards with bulk edit`)
    } catch (error) {
      console.error('Error bulk saving cards:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const completedCards = cards.filter(c => c.status === 'completed').length
  const lowConfidenceCards = cards.filter(c => (c.rarity_confidence || 0) < 0.7).length

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Batch Header */}
      <BatchHeader 
        batch={batchInfo} 
        cardCount={cards.length}
        onBatchUpdate={fetchBatchInfo}
      />

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{completedCards}</div>
            <div className="text-sm text-muted-foreground">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-orange-600">{lowConfidenceCards}</div>
            <div className="text-sm text-muted-foreground">Low Confidence</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold">{jobStatus?.progress || 0}%</div>
            <div className="text-sm text-muted-foreground">Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <Badge variant={jobStatus?.status === 'completed' ? 'default' : 'secondary'}>
              {jobStatus?.status || 'unknown'}
            </Badge>
            <div className="text-sm text-muted-foreground">Job Status</div>
          </CardContent>
        </Card>
      </div>

        {/* Actions */}
      <div className="mb-6 flex gap-4 items-center">
        <Button onClick={fetchData} variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
        <div className="ml-auto flex items-center gap-2">
          {viewMode === 'cards' && cards.length > 0 && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handleSelectAll(selectedCards.length !== cards.length)}
            >
              {selectedCards.length === cards.length ? 'Unselect All' : 'Select All'}
            </Button>
          )}
          <Button variant={viewMode === 'table' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('table')}>
            Table
          </Button>
          <Button variant={viewMode === 'cards' ? 'default' : 'outline'} size="sm" onClick={() => setViewMode('cards')}>
            Cards
          </Button>
        </div>
        {jobStatus?.status === 'processing' && (
          <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-950/20 rounded-lg">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <span className="text-sm text-blue-700 dark:text-blue-400">
              AI analysis in progress... Cards will appear as they're completed
            </span>
          </div>
        )}
      </div>

      {/* Cards Table */}
      <Card>
        <CardHeader>
          <CardTitle>Extracted Card Data</CardTitle>
        </CardHeader>
        <CardContent>
          {viewMode === 'table' ? (
            <ResultsTable
              cards={cards}
              editingCard={editingCard}
              editForm={editForm}
              selectedCards={selectedCards}
              onStartEdit={startEdit}
              onChange={(patch) => setEditForm(prev => ({ ...prev, ...patch }))}
              onSave={saveEdit}
              onCancel={cancelEdit}
              onSelectCard={handleSelectCard}
              onSelectAll={handleSelectAll}
            />
          ) : (
            <ResultsGrid 
              cards={cards}
              selectedCards={selectedCards}
              onSelectCard={handleSelectCard}
              onSave={async (cardId, cardData) => {
                try {
                  const supabase = createClient()
                  const { error } = await supabase
                    .from('cards')
                    .update(cardData)
                    .eq('id', cardId)
                  
                  if (error) throw error
                  await fetchCards() // Refresh data
                } catch (error) {
                  console.error('Error saving card:', error)
                }
              }}
            />
          )}

          {cards.length === 0 && (
            <div className="text-center py-12">
              <Loader2 className="h-12 w-12 text-muted-foreground mx-auto mb-4 animate-spin" />
              <h3 className="text-lg font-semibold mb-2">
                {jobStatus?.status === 'processing' ? 'AI Analysis in Progress...' : 
                 jobStatus?.status === 'queued' ? 'Starting AI Analysis...' :
                 'Processing Cards...'}
              </h3>
              <p className="text-muted-foreground">
                {jobStatus?.status === 'processing' ? 
                  'Cards will appear here as the AI completes analysis of each pair.' :
                  jobStatus?.status === 'queued' ?
                  'Your job is queued and will start processing shortly.' :
                  'AI analysis is in progress. Results will appear here as they\'re completed.'
                }
              </p>
              {jobStatus?.progress !== undefined && jobStatus.progress > 0 && (
                <div className="mt-4 w-full max-w-xs mx-auto">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className="bg-primary h-2 rounded-full transition-all duration-500"
                      style={{ width: `${jobStatus.progress}%` }}
                    />
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{jobStatus.progress}% complete</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedCards.length}
        onBulkEdit={handleBulkEdit}
        onClearSelection={handleClearSelection}
      />

      {/* Bulk Edit Modal */}
      <BulkEditModal
        selectedCards={cards.filter(card => selectedCards.includes(card.id))}
        isOpen={showBulkEdit}
        onClose={() => setShowBulkEdit(false)}
        onSave={handleBulkSave}
      />
    </div>
  )
}
