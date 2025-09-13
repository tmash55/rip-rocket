'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Edit3, Save, X, Calendar, Package, Zap } from 'lucide-react'
import { createClient } from '@/libs/supabase/client'

interface BatchInfo {
  id: string
  name: string
  status: string
  total_files: number
  progress: number
  paired_count: number
  created_at: string
}

interface Props {
  batch: BatchInfo | null
  cardCount: number
  onBatchUpdate: () => void
}

export default function BatchHeader({ batch, cardCount, onBatchUpdate }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editName, setEditName] = useState('')

  if (!batch) return null

  const startEdit = () => {
    setEditName(batch.name || '')
    setIsEditing(true)
  }

  const saveEdit = async () => {
    try {
      const supabase = createClient()
      const { error } = await supabase
        .from('batches')
        .update({ name: editName })
        .eq('id', batch.id)

      if (error) throw error

      setIsEditing(false)
      onBatchUpdate() // Refresh batch data
    } catch (error) {
      console.error('Error updating batch name:', error)
    }
  }

  const cancelEdit = () => {
    setEditName('')
    setIsEditing(false)
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case 'completed': return 'default'
      case 'processing': return 'secondary'
      case 'paired': return 'outline'
      case 'failed': return 'destructive'
      default: return 'secondary'
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            {/* Batch Name */}
            <div className="flex items-center gap-3 mb-4">
              {isEditing ? (
                <div className="flex items-center gap-2 flex-1">
                  <Input
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="text-2xl font-bold h-10"
                    placeholder="Batch name"
                    autoFocus
                  />
                  <Button size="sm" onClick={saveEdit}>
                    <Save className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={cancelEdit}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-3">
                  <h1 className="text-2xl font-bold">
                    {batch.name || `Batch ${batch.id.slice(0, 8)}`}
                  </h1>
                  <Button size="sm" variant="outline" onClick={startEdit}>
                    <Edit3 className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </div>

            {/* Batch Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="flex items-center gap-2">
                <Badge variant={getStatusVariant(batch.status)}>
                  {batch.status.charAt(0).toUpperCase() + batch.status.slice(1)}
                </Badge>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Package className="h-4 w-4" />
                <span>{batch.total_files} images uploaded</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Zap className="h-4 w-4" />
                <span>{cardCount} cards processed</span>
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="h-4 w-4" />
                <span>{formatDate(batch.created_at)}</span>
              </div>
            </div>

            {/* Progress Bar (if processing) */}
            {batch.status === 'processing' && batch.progress > 0 && (
              <div className="mt-4">
                <div className="flex justify-between text-sm text-muted-foreground mb-1">
                  <span>Processing Progress</span>
                  <span>{batch.progress}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-primary h-2 rounded-full transition-all duration-500"
                    style={{ width: `${batch.progress}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
