'use client'

import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Edit3, Save, X } from 'lucide-react'

export interface ResultsCardData {
  id: string
  player: string | null
  year: string | null
  card_number: string | null
  set_name: string | null
  title: string | null
  price: number | null
  currency?: string | null
  condition: string | null
  status: string
  rarity_confidence: number | null
  ocr_raw: any
  front_image_url: string
  back_image_url: string
  is_graded: boolean | null
  grading_company: string | null
  grade: string | null
  certification_number: string | null
  parallel_type: string | null
  insert_type: string | null
}

interface Props {
  cards: ResultsCardData[]
  editingCard: string | null
  editForm: Partial<ResultsCardData>
  selectedCards: string[]
  onStartEdit: (card: ResultsCardData) => void
  onChange: (patch: Partial<ResultsCardData>) => void
  onSave: () => void
  onCancel: () => void
  onSelectCard: (cardId: string, selected: boolean) => void
  onSelectAll: (selected: boolean) => void
}

export default function ResultsTable({ cards, editingCard, editForm, selectedCards, onStartEdit, onChange, onSave, onCancel, onSelectCard, onSelectAll }: Props) {
  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12">
              <Checkbox
                checked={selectedCards.length === cards.length && cards.length > 0}
                onCheckedChange={onSelectAll}
              />
            </TableHead>
            <TableHead>Images</TableHead>
            <TableHead>Title</TableHead>
            <TableHead>Player</TableHead>
            <TableHead>Year</TableHead>
            <TableHead>Card #</TableHead>
            <TableHead>Set</TableHead>
            <TableHead>Grading</TableHead>
            <TableHead>Parallel/Insert</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Condition</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {cards.map((card) => (
            <TableRow key={card.id}>
              <TableCell>
                <Checkbox
                  checked={selectedCards.includes(card.id)}
                  onCheckedChange={(checked) => onSelectCard(card.id, !!checked)}
                />
              </TableCell>
              <TableCell>
                <div className="flex gap-1">
                  <img src={card.front_image_url} alt="Front" className="w-8 h-10 object-cover rounded" />
                  <img src={card.back_image_url} alt="Back" className="w-8 h-10 object-cover rounded" />
                </div>
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input value={editForm.title || ''} onChange={(e) => onChange({ title: e.target.value })} className="w-56" />
                ) : (
                  <span>{card.title || '-'}</span>
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input value={editForm.player || ''} onChange={(e) => onChange({ player: e.target.value })} className="w-32" />
                ) : (
                  <span>{card.player || 'Unknown'}</span>
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input type="number" value={editForm.year || ''} onChange={(e) => onChange({ year: e.target.value as any })} className="w-20" />
                ) : (
                  card.year || '-'
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input value={editForm.card_number || ''} onChange={(e) => onChange({ card_number: e.target.value })} className="w-16" />
                ) : (
                  card.card_number || '-'
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input value={editForm.set_name || ''} onChange={(e) => onChange({ set_name: e.target.value })} className="w-32" />
                ) : (
                  card.set_name || '-'
                )}
              </TableCell>
              <TableCell>
                {editingCard === card.id ? (
                  <div className="space-y-1">
                    <div className="flex items-center gap-1">
                      <input type="checkbox" checked={!!editForm.is_graded} onChange={(e) => onChange({ is_graded: e.target.checked })} />
                      <span className="text-xs">Graded</span>
                    </div>
                    {editForm.is_graded && (
                      <>
                        <Input placeholder="Company" value={editForm.grading_company || ''} onChange={(e) => onChange({ grading_company: e.target.value })} className="w-20 text-xs" />
                        <Input placeholder="Grade" value={editForm.grade || ''} onChange={(e) => onChange({ grade: e.target.value })} className="w-16 text-xs" />
                      </>
                    )}
                  </div>
                ) : (
                  <div className="text-sm">
                    {card.is_graded ? (
                      <div className="space-y-1">
                        <Badge variant="secondary" className="text-xs">{card.grading_company} {card.grade}</Badge>
                        {card.certification_number && (
                          <div className="text-xs text-muted-foreground">#{card.certification_number}</div>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">Raw</span>
                    )}
                  </div>
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <div className="space-y-1">
                    <Input placeholder="Parallel" value={editForm.parallel_type || ''} onChange={(e) => onChange({ parallel_type: e.target.value })} className="w-24 text-xs" />
                    <Input placeholder="Insert" value={editForm.insert_type || ''} onChange={(e) => onChange({ insert_type: e.target.value })} className="w-24 text-xs" />
                  </div>
                ) : (
                  <div className="text-sm space-y-1">
                    {card.parallel_type && (<Badge variant="outline" className="text-xs block">{card.parallel_type}</Badge>)}
                    {card.insert_type && (<Badge variant="secondary" className="text-xs block">{card.insert_type}</Badge>)}
                    {!card.parallel_type && !card.insert_type && (<span className="text-muted-foreground">Base</span>)}
                  </div>
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input type="number" step="0.01" value={(editForm.price as any as string) || ''} onChange={(e) => onChange({ price: parseFloat(e.target.value) })} className="w-24" />
                ) : (
                  card.price != null ? `$${Number(card.price).toFixed(2)}` : '-'
                )}
              </TableCell>
              <TableCell onClick={() => onStartEdit(card)} className="cursor-text">
                {editingCard === card.id ? (
                  <Input value={editForm.condition || ''} onChange={(e) => onChange({ condition: e.target.value })} className="w-24" />
                ) : (
                  card.condition || '-'
                )}
              </TableCell>
              <TableCell>
                {editingCard === card.id ? (
                  <div className="flex gap-1">
                    <Button size="sm" onClick={onSave}><Save className="h-3 w-3" /></Button>
                    <Button size="sm" variant="outline" onClick={onCancel}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <Button size="sm" variant="outline" onClick={() => onStartEdit(card)}><Edit3 className="h-3 w-3" /></Button>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}


