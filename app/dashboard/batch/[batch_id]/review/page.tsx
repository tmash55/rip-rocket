'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/libs/supabase/client'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Loader2, Play, CheckCircle, AlertCircle } from 'lucide-react'
import Image from 'next/image'
import BatchHeader from '@/components/results/BatchHeader'

interface CardPair {
  id: string
  method: string
  status: string
  front_upload: {
    id: string
    filename: string
    storage_path: string
  } | any
  back_upload: {
    id: string
    filename: string
    storage_path: string
  } | any
  front_image_url?: string
  back_image_url?: string
}

interface BatchInfo {
  id: string
  name: string
  total_files: number
  paired_count: number
  status: string
  created_at: string
}

export default function ReviewPairingPage() {
  const params = useParams()
  const router = useRouter()
  const batch_id = params.batch_id as string
  
  const [batch, setBatch] = useState<BatchInfo | null>(null)
  const [pairs, setPairs] = useState<CardPair[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchBatchData()
  }, [batch_id])

  const fetchBatchData = async () => {
    try {
      const supabase = createClient()
      
      // Fetch batch info
      const { data: batchData, error: batchError } = await supabase
        .from('batches')
        .select('*')
        .eq('id', batch_id)
        .single()

      if (batchError) throw batchError

      // Fetch card pairs with upload URLs
      const { data: pairsData, error: pairsError } = await supabase
        .from('card_pairs')
        .select(`
          id,
          method,
          status,
          front_upload:uploads!card_pairs_front_upload_id_fkey(
            id,
            filename,
            storage_path
          ),
          back_upload:uploads!card_pairs_back_upload_id_fkey(
            id,
            filename,
            storage_path
          )
        `)
        .eq('batch_id', batch_id)
        .order('created_at')

      if (pairsError) throw pairsError

      setBatch(batchData)
      
      // Generate signed URLs for images
      const pairsWithUrls = await Promise.all(
        (pairsData || []).map(async (pair) => {
          try {
            const { data: frontUrl } = await supabase.storage
              .from('cards-images')
              .createSignedUrl((pair.front_upload as any).storage_path, 3600)
            
            const { data: backUrl } = await supabase.storage
              .from('cards-images') 
              .createSignedUrl((pair.back_upload as any).storage_path, 3600)
            
            return {
              ...pair,
              front_image_url: frontUrl?.signedUrl,
              back_image_url: backUrl?.signedUrl
            }
          } catch (urlError) {
            console.error('Error generating signed URLs:', urlError)
            return pair
          }
        })
      )
      
      setPairs(pairsWithUrls as unknown as CardPair[])
    } catch (error) {
      console.error('Error fetching batch data:', error)
    } finally {
      setLoading(false)
    }
  }

  const startOCRAnalysis = () => {
    console.log('Starting OCR analysis and redirecting immediately...')
    
    // Redirect immediately for better UX
    router.push(`/dashboard/batch/${batch_id}/results`)
    
    // Start the OCR job in the background
    setTimeout(async () => {
      try {
        const response = await fetch(`/api/test-batch-ocr/${batch_id}`, {
          method: 'POST'
        })
        
        if (!response.ok) {
          console.error('Failed to start OCR analysis')
          return
        }
        
        const result = await response.json()
        console.log('OCR job started:', result)
        
      } catch (error) {
        console.error('Error starting OCR:', error)
      }
    }, 100) // Small delay to ensure navigation happens first
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    )
  }

  const pairedCount = pairs.filter(p => p.status === 'paired').length
  const canStartOCR = pairedCount > 0

  const batchInfo = batch ? {
    id: batch.id,
    name: batch.name || '',
    status: batch.status,
    total_files: batch.total_files,
    progress: 100, // Review stage means upload is complete
    paired_count: pairedCount,
    created_at: batch.created_at
  } : null

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Batch Header */}
      <BatchHeader 
        batch={batchInfo} 
        cardCount={pairedCount}
        onBatchUpdate={fetchBatchData}
      />

      {/* Page Description */}
      <div className="mb-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Review Card Pairing</h2>
        <p className="text-muted-foreground">
          Verify that front and back images are correctly paired before running AI analysis
        </p>
      </div>

      {/* Quick Stats & Action */}
      <Card className="mb-8">
        <CardContent className="p-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center mb-6">
            <div>
              <div className="text-2xl font-bold">{batch?.total_files}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">{pairedCount}</div>
              <div className="text-sm text-muted-foreground">Paired Cards</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-orange-600">
                {(batch?.total_files || 0) - (pairedCount * 2)}
              </div>
              <div className="text-sm text-muted-foreground">Unpaired Images</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {pairedCount > 0 ? 'Ready' : 'Waiting'}
              </div>
              <div className="text-sm text-muted-foreground">AI Analysis</div>
            </div>
          </div>
          
          {canStartOCR && (
            <div className="text-center">
              <Button 
                onClick={startOCRAnalysis} 
                size="lg"
                className="bg-green-600 hover:bg-green-700"
              >
                <Play className="mr-2 h-4 w-4" />
                Start AI Analysis ({pairedCount} pairs)
              </Button>
            </div>
          )}

          {!canStartOCR && (
            <div className="text-center">
              <p className="text-muted-foreground">
                No paired cards found. The pairing algorithm couldn&apos;t match front and back images.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card Pairs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pairs.map((pair) => (
          <Card key={pair.id} className="overflow-hidden">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center justify-between">
                <span>Pair {pair.id.slice(0, 8)}</span>
                <div className="flex items-center gap-2">
                  {pair.status === 'paired' ? (
                    <CheckCircle className="h-4 w-4 text-green-600" />
                  ) : (
                    <AlertCircle className="h-4 w-4 text-orange-600" />
                  )}
                  <Badge variant="outline" className="text-xs">
                    {pair.method}
                  </Badge>
                </div>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="grid grid-cols-2 gap-1">
                {/* Front Image */}
                <div className="aspect-[3/4] relative bg-muted">
                  {pair.front_image_url ? (
                    <Image
                      src={pair.front_image_url}
                      alt="Front"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                    Front
                  </div>
                </div>
                
                {/* Back Image */}
                <div className="aspect-[3/4] relative bg-muted">
                  {pair.back_image_url ? (
                    <Image
                      src={pair.back_image_url}
                      alt="Back"
                      fill
                      className="object-cover"
                      sizes="(max-width: 768px) 50vw, (max-width: 1200px) 25vw, 16vw"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                      No Image
                    </div>
                  )}
                  <div className="absolute top-1 left-1 bg-black/70 text-white text-xs px-1 py-0.5 rounded">
                    Back
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {pairs.length === 0 && (
        <Card>
          <CardContent className="text-center py-12">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Card Pairs Found</h3>
            <p className="text-muted-foreground">
              The pairing algorithm couldn&apos;t find any matching front/back pairs in this batch.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
