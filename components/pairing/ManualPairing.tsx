"use client"

import { useState, useEffect } from 'react'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { Image as ImageIcon, RotateCcw, Check, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'
import Image from 'next/image'

interface Upload {
  id: string
  filename: string
  storage_path: string
  status: string
}

interface CardPair {
  id: string
  front_upload: Upload
  back_upload?: Upload
  method: string
  confidence?: number
}

interface PairingStatus {
  total_uploads: number
  paired_uploads: number
  orphaned_uploads: number
  pairs_created: number
  pairs: CardPair[]
  orphaned_files: Upload[]
}

interface ManualPairingProps {
  batchId: string
}

export default function ManualPairing({ batchId }: ManualPairingProps) {
  const [pairingStatus, setPairingStatus] = useState<PairingStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [orphanedUploads, setOrphanedUploads] = useState<Upload[]>([])
  const [pairs, setPairs] = useState<CardPair[]>([])

  useEffect(() => {
    loadPairingStatus()
  }, [batchId])

  const loadPairingStatus = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/batches/${batchId}/pair`)
      
      if (!response.ok) {
        throw new Error('Failed to load pairing status')
      }

      const status: PairingStatus = await response.json()
      setPairingStatus(status)
      setOrphanedUploads(status.orphaned_files)
      setPairs(status.pairs)
      
    } catch (error) {
      console.error('Error loading pairing status:', error)
      toast.error('Failed to load pairing status')
    } finally {
      setLoading(false)
    }
  }

  const handleDragEnd = async (result: any) => {
    const { destination, source, draggableId } = result

    if (!destination) return

    // If dropped on orphaned area, do nothing
    if (destination.droppableId === 'orphaned') return

    // If dropped on existing pair area
    if (destination.droppableId.startsWith('pair-')) {
      const pairIndex = parseInt(destination.droppableId.split('-')[1])
      const targetPair = pairs[pairIndex]

      // If dropping on front position and it's empty
      if (destination.index === 0 && !targetPair.front_upload) {
        await createManualPair(draggableId, targetPair.back_upload?.id || null)
      }
      // If dropping on back position
      else if (destination.index === 1) {
        await createManualPair(targetPair.front_upload.id, draggableId)
      }
    }
    // If dropped on new pair area
    else if (destination.droppableId === 'new-pair') {
      // Create new pair with just the front image
      await createManualPair(draggableId, null)
    }
  }

  const createManualPair = async (frontUploadId: string, backUploadId: string | null) => {
    try {
      const response = await fetch(`/api/batches/${batchId}/manual-pair`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          front_upload_id: frontUploadId,
          back_upload_id: backUploadId
        })
      })

      if (!response.ok) {
        throw new Error('Failed to create manual pair')
      }

      const result = await response.json()
      
      if (result.success) {
        toast.success('Pair created successfully!')
        // Reload status to get updated data
        await loadPairingStatus()
        
        // Show success message when all pairing is complete
        if (result.status.orphaned_uploads === 0) {
          toast.success('All images have been paired! Ready for OCR processing.')
        }
      } else {
        throw new Error(result.error || 'Failed to create pair')
      }

    } catch (error) {
      console.error('Error creating manual pair:', error)
      toast.error('Failed to create pair')
    }
  }

  const markAsSingleSided = async (uploadId: string) => {
    await createManualPair(uploadId, null)
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </CardContent>
      </Card>
    )
  }

  if (!pairingStatus) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-center">
            <AlertCircle className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">Failed to load pairing status</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Pairing Status Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ImageIcon className="h-5 w-5" />
            Card Pairing Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{pairingStatus.total_uploads}</div>
              <div className="text-sm text-muted-foreground">Total Images</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{pairingStatus.pairs_created}</div>
              <div className="text-sm text-muted-foreground">Pairs Created</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{pairingStatus.paired_uploads}</div>
              <div className="text-sm text-muted-foreground">Paired Images</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{pairingStatus.orphaned_uploads}</div>
              <div className="text-sm text-muted-foreground">Need Pairing</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {pairingStatus.orphaned_uploads > 0 && (
        <DragDropContext onDragEnd={handleDragEnd}>
          {/* Existing Pairs */}
          {pairs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Existing Pairs</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4">
                  {pairs.map((pair, index) => (
                    <div key={pair.id} className="border rounded-lg p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={pair.method === 'manual' ? 'default' : 'secondary'}>
                          {pair.method.replace('auto_', '')}
                        </Badge>
                        {pair.confidence && (
                          <Badge variant="outline">
                            {Math.round(pair.confidence * 100)}% confidence
                          </Badge>
                        )}
                      </div>
                      
                      <Droppable droppableId={`pair-${index}`} direction="horizontal">
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            className="flex gap-4"
                          >
                            {/* Front Image */}
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">Front</div>
                              {pair.front_upload ? (
                                <div className="relative h-32 bg-gray-100 rounded border">
                                  <Image
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cards-images/${pair.front_upload.storage_path}`}
                                    alt={pair.front_upload.filename}
                                    fill
                                    className="object-cover rounded"
                                  />
                                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                    {pair.front_upload.filename}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                                  <span className="text-sm text-gray-500">Drop front image here</span>
                                </div>
                              )}
                            </div>

                            {/* Back Image */}
                            <div className="flex-1">
                              <div className="text-sm font-medium mb-1">Back</div>
                              {pair.back_upload ? (
                                <div className="relative h-32 bg-gray-100 rounded border">
                                  <Image
                                    src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cards-images/${pair.back_upload.storage_path}`}
                                    alt={pair.back_upload.filename}
                                    fill
                                    className="object-cover rounded"
                                  />
                                  <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                    {pair.back_upload.filename}
                                  </div>
                                </div>
                              ) : (
                                <div className="h-32 border-2 border-dashed border-gray-300 rounded flex items-center justify-center">
                                  <span className="text-sm text-gray-500">Drop back image here or leave empty</span>
                                </div>
                              )}
                            </div>
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Orphaned Images */}
          <Card>
            <CardHeader>
              <CardTitle>Unpaired Images</CardTitle>
              <p className="text-sm text-muted-foreground">
                Drag images to create pairs or mark as single-sided cards
              </p>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="orphaned" direction="horizontal">
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 min-h-[100px]"
                  >
                    {orphanedUploads.map((upload, index) => (
                      <Draggable key={upload.id} draggableId={upload.id} index={index}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                            className={`relative group ${snapshot.isDragging ? 'opacity-50' : ''}`}
                          >
                            <div className="relative h-32 bg-gray-100 rounded border cursor-move">
                              <Image
                                src={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/cards-images/${upload.storage_path}`}
                                alt={upload.filename}
                                fill
                                className="object-cover rounded"
                              />
                              <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1 rounded">
                                {upload.filename}
                              </div>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="mt-1 w-full opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => markAsSingleSided(upload.id)}
                            >
                              Single-sided
                            </Button>
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>

          {/* New Pair Drop Zone */}
          <Card>
            <CardHeader>
              <CardTitle>Create New Pair</CardTitle>
            </CardHeader>
            <CardContent>
              <Droppable droppableId="new-pair">
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                      snapshot.isDraggingOver ? 'border-primary bg-primary/5' : 'border-gray-300'
                    }`}
                  >
                    <ImageIcon className="h-8 w-8 mx-auto mb-2 text-gray-400" />
                    <p className="text-gray-600">
                      Drop an image here to start a new pair
                    </p>
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </CardContent>
          </Card>
        </DragDropContext>
      )}

      {pairingStatus.orphaned_uploads === 0 && (
        <Card>
          <CardContent className="flex items-center justify-center h-32">
            <div className="text-center">
              <Check className="h-8 w-8 text-green-600 mx-auto mb-2" />
              <p className="text-green-600 font-medium">All images have been paired!</p>
              <p className="text-sm text-muted-foreground">Ready for OCR processing</p>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex gap-2">
        <Button onClick={loadPairingStatus} variant="outline">
          <RotateCcw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
        
        {pairingStatus.orphaned_uploads === 0 && (
          <Button onClick={() => toast.success('Ready for OCR processing!')}>
            Continue to OCR
          </Button>
        )}
      </div>
    </div>
  )
}
