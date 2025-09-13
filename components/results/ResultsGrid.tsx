'use client'

import { useState } from 'react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import CardEditModal from './CardEditModal'
import type { ResultsCardData } from './ResultsTable'

interface Props {
  cards: ResultsCardData[]
  selectedCards: string[]
  onSave: (cardId: string, cardData: Partial<ResultsCardData>) => void
  onSelectCard: (cardId: string, selected: boolean) => void
}

export default function ResultsGrid({ cards, selectedCards, onSave, onSelectCard }: Props) {
  const [editingCard, setEditingCard] = useState<ResultsCardData | null>(null)

  const handleEdit = (card: ResultsCardData) => {
    setEditingCard(card)
  }

  const handleSave = (cardData: Partial<ResultsCardData>) => {
    if (editingCard) {
      onSave(editingCard.id, cardData)
      setEditingCard(null)
    }
  }

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {cards.map(card => (
          <div key={card.id} className={`border rounded-lg overflow-hidden relative ${selectedCards.includes(card.id) ? 'ring-2 ring-primary' : ''}`}>
            <div className="absolute top-2 left-2 z-10">
              <Checkbox
                checked={selectedCards.includes(card.id)}
                onCheckedChange={(checked) => onSelectCard(card.id, !!checked)}
                className="bg-white border-2"
              />
            </div>
            <div className="aspect-video bg-muted flex items-center justify-center">
              <img src={card.front_image_url} alt="Front" className="h-full object-cover" />
            </div>
            <div className="p-3 space-y-2">
              <div className="text-sm text-muted-foreground">{card.set_name || '-'}</div>
              <div className="font-semibold">{card.title || `${card.year || ''} ${card.player || ''}`.trim()}</div>
              <div className="text-sm">#{card.card_number || '-'} • {card.player || '-'}</div>
              <div className="flex flex-wrap gap-2">
                {card.is_graded ? (
                  <Badge variant="secondary" className="text-xs">{card.grading_company} {card.grade}</Badge>
                ) : (
                  <Badge variant="outline" className="text-xs">Raw</Badge>
                )}
                {card.parallel_type && <Badge variant="outline" className="text-xs">{card.parallel_type}</Badge>}
                {card.insert_type && <Badge variant="secondary" className="text-xs">{card.insert_type}</Badge>}
              </div>
              <div className="flex items-center justify-between pt-1">
                <div className="font-medium">{card.price != null ? `$${Number(card.price).toFixed(2)}` : '-'}</div>
                <Button size="sm" variant="outline" onClick={() => handleEdit(card)}>Edit</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <CardEditModal
        card={editingCard}
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSave={handleSave}
      />
    </>
  )
}


