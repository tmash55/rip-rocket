'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Edit3, Trash2, X } from 'lucide-react'

interface Props {
  selectedCount: number
  onBulkEdit: () => void
  onBulkDelete?: () => void
  onClearSelection: () => void
}

export default function BulkActionsToolbar({ selectedCount, onBulkEdit, onBulkDelete, onClearSelection }: Props) {
  if (selectedCount === 0) return null

  return (
    <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg px-4 py-3 flex items-center gap-4 z-50">
      <div className="flex items-center gap-2">
        <Badge variant="secondary">{selectedCount}</Badge>
        <span className="text-sm font-medium">
          card{selectedCount !== 1 ? 's' : ''} selected
        </span>
      </div>
      
      <div className="flex items-center gap-2">
        <Button size="sm" onClick={onBulkEdit}>
          <Edit3 className="h-4 w-4 mr-2" />
          Bulk Edit
        </Button>
        
        {onBulkDelete && (
          <Button size="sm" variant="destructive" onClick={onBulkDelete}>
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </Button>
        )}
        
        <Button size="sm" variant="outline" onClick={onClearSelection}>
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  )
}
