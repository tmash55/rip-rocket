'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Save, X, Users } from 'lucide-react'
import type { ResultsCardData } from './ResultsTable'

interface BulkEditData {
  // Fields that can be bulk edited
  year?: string
  condition?: string
  price?: number | null
  is_graded?: boolean
  grading_company?: string
  grade?: string
  parallel_type?: string
  insert_type?: string
  set_name?: string
}

interface Props {
  selectedCards: ResultsCardData[]
  isOpen: boolean
  onClose: () => void
  onSave: (updates: BulkEditData, enabledFields: string[]) => void
}

export default function BulkEditModal({ selectedCards, isOpen, onClose, onSave }: Props) {
  const [bulkData, setBulkData] = useState<BulkEditData>({})
  const [enabledFields, setEnabledFields] = useState<string[]>([])

  // Reset state when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setBulkData({})
      setEnabledFields([])
    }
  }, [isOpen])

  const handleFieldToggle = (field: string) => {
    setEnabledFields(prev => 
      prev.includes(field) 
        ? prev.filter(f => f !== field)
        : [...prev, field]
    )
  }

  const handleSave = () => {
    onSave(bulkData, enabledFields)
    onClose()
  }

  const handleCancel = () => {
    setBulkData({})
    setEnabledFields([])
    onClose()
  }

  if (!isOpen) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Bulk Edit {selectedCards.length} Cards
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Selected Cards Preview */}
          <div>
            <Label>Selected Cards</Label>
            <div className="mt-2 flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded">
              {selectedCards.map(card => (
                <div key={card.id} className="flex items-center gap-2 bg-muted px-2 py-1 rounded text-sm">
                  <img src={card.front_image_url} alt="Card" className="w-6 h-8 object-cover rounded" />
                  <span>{card.player || 'Unknown'} {card.year && `(${card.year})`}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bulk Edit Fields */}
          <div className="space-y-4">
            <div className="text-sm font-medium text-muted-foreground">
              Select which fields to update for all selected cards:
            </div>

            {/* Basic Info */}
            <div className="space-y-3">
              <h4 className="font-medium">Basic Information</h4>
              
              {/* Year */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('year')}
                  onCheckedChange={() => handleFieldToggle('year')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-year">Year</Label>
                  <Input
                    id="bulk-year"
                    type="number"
                    value={bulkData.year || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, year: e.target.value }))}
                    disabled={!enabledFields.includes('year')}
                    placeholder="e.g. 2024"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Set Name */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('set_name')}
                  onCheckedChange={() => handleFieldToggle('set_name')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-set">Set Name</Label>
                  <Input
                    id="bulk-set"
                    value={bulkData.set_name || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, set_name: e.target.value }))}
                    disabled={!enabledFields.includes('set_name')}
                    placeholder="e.g. Donruss Optic"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Condition */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('condition')}
                  onCheckedChange={() => handleFieldToggle('condition')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-condition">Condition</Label>
                  <Input
                    id="bulk-condition"
                    value={bulkData.condition || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, condition: e.target.value }))}
                    disabled={!enabledFields.includes('condition')}
                    placeholder="e.g. Near Mint, Mint"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Price */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('price')}
                  onCheckedChange={() => handleFieldToggle('price')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-price">Price ($)</Label>
                  <Input
                    id="bulk-price"
                    type="number"
                    step="0.01"
                    value={bulkData.price || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, price: parseFloat(e.target.value) || null }))}
                    disabled={!enabledFields.includes('price')}
                    placeholder="0.00"
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Grading Section */}
            <div className="space-y-3">
              <h4 className="font-medium">Grading Information</h4>
              
              {/* Graded Status */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('is_graded')}
                  onCheckedChange={() => handleFieldToggle('is_graded')}
                />
                <div className="flex items-center space-x-2">
                  <Checkbox
                    checked={!!bulkData.is_graded}
                    onCheckedChange={(checked) => setBulkData(prev => ({ ...prev, is_graded: !!checked }))}
                    disabled={!enabledFields.includes('is_graded')}
                  />
                  <Label>Mark as Graded Cards</Label>
                </div>
              </div>

              {/* Grading Company */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('grading_company')}
                  onCheckedChange={() => handleFieldToggle('grading_company')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-grading-company">Grading Company</Label>
                  <Input
                    id="bulk-grading-company"
                    value={bulkData.grading_company || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, grading_company: e.target.value }))}
                    disabled={!enabledFields.includes('grading_company')}
                    placeholder="PSA, BGS, SGC"
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Grade */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('grade')}
                  onCheckedChange={() => handleFieldToggle('grade')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-grade">Grade</Label>
                  <Input
                    id="bulk-grade"
                    value={bulkData.grade || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, grade: e.target.value }))}
                    disabled={!enabledFields.includes('grade')}
                    placeholder="9, 10, etc."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>

            {/* Parallel/Insert Section */}
            <div className="space-y-3">
              <h4 className="font-medium">Parallel & Insert Types</h4>
              
              {/* Parallel Type */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('parallel_type')}
                  onCheckedChange={() => handleFieldToggle('parallel_type')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-parallel">Parallel Type</Label>
                  <Input
                    id="bulk-parallel"
                    value={bulkData.parallel_type || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, parallel_type: e.target.value }))}
                    disabled={!enabledFields.includes('parallel_type')}
                    placeholder="Refractor, Prizm, etc."
                    className="mt-1"
                  />
                </div>
              </div>

              {/* Insert Type */}
              <div className="flex items-center space-x-3">
                <Checkbox 
                  checked={enabledFields.includes('insert_type')}
                  onCheckedChange={() => handleFieldToggle('insert_type')}
                />
                <div className="flex-1">
                  <Label htmlFor="bulk-insert">Insert Type</Label>
                  <Input
                    id="bulk-insert"
                    value={bulkData.insert_type || ''}
                    onChange={(e) => setBulkData(prev => ({ ...prev, insert_type: e.target.value }))}
                    disabled={!enabledFields.includes('insert_type')}
                    placeholder="Red Zone, Downtown, etc."
                    className="mt-1"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Summary */}
          {enabledFields.length > 0 && (
            <div className="p-3 bg-muted rounded">
              <div className="text-sm font-medium mb-2">Summary:</div>
              <div className="text-sm text-muted-foreground">
                Will update <strong>{enabledFields.length}</strong> field{enabledFields.length !== 1 ? 's' : ''} for <strong>{selectedCards.length}</strong> card{selectedCards.length !== 1 ? 's' : ''}:
              </div>
              <div className="flex flex-wrap gap-1 mt-2">
                {enabledFields.map(field => (
                  <Badge key={field} variant="secondary" className="text-xs">
                    {field.replace('_', ' ')}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={enabledFields.length === 0}
          >
            <Save className="h-4 w-4 mr-2" />
            Update {selectedCards.length} Cards
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
