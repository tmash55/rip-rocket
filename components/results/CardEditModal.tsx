'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Save, X } from 'lucide-react'
import type { ResultsCardData } from './ResultsTable'

interface Props {
  card: ResultsCardData | null
  isOpen: boolean
  onClose: () => void
  onSave: (cardData: Partial<ResultsCardData>) => void
}

export default function CardEditModal({ card, isOpen, onClose, onSave }: Props) {
  const [formData, setFormData] = useState<Partial<ResultsCardData>>({})

  // Initialize form data when card changes
  useEffect(() => {
    if (card) {
      setFormData({
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
  }, [card])

  const handleSave = () => {
    onSave(formData)
    onClose()
  }

  const handleCancel = () => {
    onClose()
    // Reset form data
    if (card) {
      setFormData({
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
  }

  if (!card) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Card</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card Images */}
          <div className="space-y-4">
            <div>
              <Label>Card Images</Label>
              <div className="flex gap-2 mt-2">
                <div className="flex-1">
                  <img src={card.front_image_url} alt="Front" className="w-full h-48 object-cover rounded border" />
                  <p className="text-xs text-muted-foreground text-center mt-1">Front</p>
                </div>
                <div className="flex-1">
                  <img src={card.back_image_url} alt="Back" className="w-full h-48 object-cover rounded border" />
                  <p className="text-xs text-muted-foreground text-center mt-1">Back</p>
                </div>
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                value={formData.title || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
                placeholder="Card title"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="player">Player</Label>
                <Input
                  id="player"
                  value={formData.player || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, player: e.target.value }))}
                  placeholder="Player name"
                />
              </div>
              <div>
                <Label htmlFor="year">Year</Label>
                <Input
                  id="year"
                  type="number"
                  value={formData.year || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, year: e.target.value }))}
                  placeholder="Year"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="card_number">Card #</Label>
                <Input
                  id="card_number"
                  value={formData.card_number || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, card_number: e.target.value }))}
                  placeholder="Card number"
                />
              </div>
              <div>
                <Label htmlFor="set_name">Set</Label>
                <Input
                  id="set_name"
                  value={formData.set_name || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, set_name: e.target.value }))}
                  placeholder="Set name"
                />
              </div>
            </div>

            {/* Grading Section */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_graded"
                  checked={!!formData.is_graded}
                  onChange={(e) => setFormData(prev => ({ ...prev, is_graded: e.target.checked }))}
                />
                <Label htmlFor="is_graded">Graded Card</Label>
              </div>
              
              {formData.is_graded && (
                <div className="grid grid-cols-2 gap-3 pl-6">
                  <div>
                    <Label htmlFor="grading_company">Company</Label>
                    <Input
                      id="grading_company"
                      value={formData.grading_company || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, grading_company: e.target.value }))}
                      placeholder="PSA, BGS, SGC"
                    />
                  </div>
                  <div>
                    <Label htmlFor="grade">Grade</Label>
                    <Input
                      id="grade"
                      value={formData.grade || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, grade: e.target.value }))}
                      placeholder="9, 10, etc."
                    />
                  </div>
                  <div className="col-span-2">
                    <Label htmlFor="certification_number">Certification #</Label>
                    <Input
                      id="certification_number"
                      value={formData.certification_number || ''}
                      onChange={(e) => setFormData(prev => ({ ...prev, certification_number: e.target.value }))}
                      placeholder="Cert number"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Parallel/Insert Section */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="parallel_type">Parallel</Label>
                <Input
                  id="parallel_type"
                  value={formData.parallel_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, parallel_type: e.target.value }))}
                  placeholder="Refractor, Prizm"
                />
              </div>
              <div>
                <Label htmlFor="insert_type">Insert</Label>
                <Input
                  id="insert_type"
                  value={formData.insert_type || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, insert_type: e.target.value }))}
                  placeholder="Red Zone, Downtown"
                />
              </div>
            </div>

            {/* Price and Condition */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={formData.price || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || null }))}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="condition">Condition</Label>
                <Input
                  id="condition"
                  value={formData.condition || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, condition: e.target.value }))}
                  placeholder="Near Mint, Mint"
                />
              </div>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
