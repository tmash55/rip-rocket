import { createClient } from '@/libs/supabase/server'
import { OpenAIVisionOCR, AIVisionResult } from './openai-vision'
import { CardStorage } from './storage'

export interface OCRProcessingResult {
  success: boolean
  cards_processed: number
  cards_created: number
  errors: string[]
}

export interface CardPairData {
  id: string
  profile_id: string
  batch_id: string
  front_upload_id: string
  back_upload_id?: string
  status: 'paired'
  method: string
  confidence: number
}

export class OCRProcessor {
  private supabase: any

  constructor(supabaseClient?: any) {
    this.supabase = supabaseClient || createClient()
  }

  /**
   * Process OCR for all paired cards in a batch
   */
  async processBatchOCR(batchId: string, profileId: string): Promise<OCRProcessingResult> {
    try {
      console.log(`[OCR] Starting OCR processing for batch ${batchId}`)

      // Get all paired cards for this batch
      const { data: cardPairs, error } = await this.supabase
        .from('card_pairs')
        .select(`
          *,
          front_upload:uploads!card_pairs_front_upload_id_fkey(*),
          back_upload:uploads!card_pairs_back_upload_id_fkey(*)
        `)
        .eq('batch_id', batchId)
        .eq('profile_id', profileId)
        .eq('status', 'paired')

      if (error) throw error
      if (!cardPairs || cardPairs.length === 0) {
        return { success: true, cards_processed: 0, cards_created: 0, errors: [] }
      }

      console.log(`[OCR] Found ${cardPairs.length} card pairs to process`)

      const result: OCRProcessingResult = {
        success: true,
        cards_processed: 0,
        cards_created: 0,
        errors: []
      }

      // Process each card pair
      for (const pair of cardPairs) {
        try {
          console.log(`[OCR] Processing card pair ${pair.id}`)
          
          // Validate pair structure
          if (!pair || !pair.front_upload || !pair.front_upload.storage_path) {
            throw new Error('Invalid card pair structure - missing front upload or storage path')
          }
          
          // Get signed URL for the front image
          const frontImageUrl = await CardStorage.getSignedUrl(
            pair.front_upload.storage_path,
            3600, // 1 hour expiry
            this.supabase // Pass the service client
          )

          console.log(`[OCR] Got signed URL for ${pair.front_upload.storage_path}`)

          // Get signed URL for back image
          const backImageUrl = await CardStorage.getSignedUrl(
            pair.back_upload.storage_path,
            3600, // 1 hour expiry
            this.supabase // Pass the service client
          )

          console.log(`[OCR] Got signed URL for ${pair.back_upload.storage_path}`)

          // Run AI Vision analysis on BOTH front and back images
          const aiResult = await OpenAIVisionOCR.analyzeCardPair(frontImageUrl, backImageUrl, 'gpt-4o')
          
          console.log(`[OCR] AI Vision analysis completed for pair ${pair.id}`)
          console.log(`[OCR] Analysis confidence: ${aiResult.card_analysis.extraction_confidence}`)
          console.log(`[OCR] Player detected: ${aiResult.card_analysis.player_name}`)
          console.log(`[OCR] Rarity: ${aiResult.card_analysis.rarity_type}`)

          // Create card record with AI analysis
          const cardId = await this.createCardRecord(
            pair.id,
            profileId,
            batchId,
            aiResult
          )

          result.cards_processed++
          result.cards_created++

          console.log(`[OCR] ✅ Successfully created card ${cardId} from pair ${pair.id}`)

        } catch (error) {
          console.error(`[OCR] ❌ Failed to process pair ${pair.id}:`, error)
          result.errors = result.errors || [] // Ensure errors array exists
          result.errors.push(`Pair ${pair.id}: ${error.message}`)
        }
      }

      console.log(`[OCR] Completed: ${result.cards_created} cards created, ${result.errors?.length || 0} errors`)

      return result

    } catch (error) {
      console.error('[OCR] Batch processing failed:', error)
      return {
        success: false,
        cards_processed: 0,
        cards_created: 0,
        errors: [error.message || 'Unknown OCR error']
      }
    }
  }

  /**
   * Create a card record with AI Vision analysis data
   */
  private async createCardRecord(
    cardPairId: string,
    profileId: string,
    batchId: string,
    aiResult: AIVisionResult
  ): Promise<string> {
    const { card_analysis } = aiResult

    // Create title from player name and year if available
    const title = [card_analysis.player_name, card_analysis.year].filter(Boolean).join(' ')

    // Create comprehensive condition description
    const conditionDescription = card_analysis.condition_notes.length > 0 
      ? card_analysis.condition_notes.join(', ') 
      : null

    const { data: card, error } = await this.supabase
      .from('cards')
      .insert({
        profile_id: profileId,
        batch_id: batchId,
        pair_id: cardPairId,
        
        // Basic card data
        player: card_analysis.player_name || null,
        year: card_analysis.year?.toString() || null,
        card_number: card_analysis.card_number || null,
        set_name: card_analysis.set_name || null,
        title: title || null,
        condition: card_analysis.estimated_condition || null,
        
        // Grading information
        is_graded: card_analysis.is_graded || false,
        grading_company: card_analysis.grading_company || null,
        grade: card_analysis.grade || null,
        certification_number: card_analysis.certification_number || null,
        
        // Parallel/Insert information
        parallel_type: card_analysis.parallel_type || null,
        insert_type: card_analysis.insert_type || null,
        
        // AI analysis metadata
        ocr_raw: {
          ai_analysis: card_analysis,
          raw_response: aiResult.raw_response,
          processing_time_ms: aiResult.processing_time_ms,
          rarity_indicators: card_analysis.rarity_indicators,
          is_rookie: card_analysis.is_rookie_card,
          is_autographed: card_analysis.is_autographed,
          is_memorabilia: card_analysis.is_memorabilia,
          is_numbered: card_analysis.is_numbered,
          serial_number: card_analysis.serial_number,
          condition_notes: card_analysis.condition_notes,
          ai_notes: card_analysis.ai_notes
        },
        
        // Rarity data
        rarity_confidence: card_analysis.extraction_confidence ? Math.round(card_analysis.extraction_confidence * 100) : null,
        rarity_source: 'ai' as any,
        
        // Status based on confidence and review needs
        status: card_analysis.needs_human_review ? 'needs_review' : 'ocr_complete'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create card record: ${error.message}`)
    }

    return card.id
  }

  /**
   * Process OCR for a single card pair (for manual reprocessing)
   */
  async processCardPair(cardPairId: string, profileId: string): Promise<{ success: boolean; cardId?: string; error?: string }> {
    try {
      // Get the card pair with upload details
      const { data: pair, error } = await this.supabase
        .from('card_pairs')
        .select(`
          *,
          front_upload:uploads!card_pairs_front_upload_id_fkey(*)
        `)
        .eq('id', cardPairId)
        .eq('profile_id', profileId)
        .single()

      if (error) throw error

      // Get signed URL for the front image
      const frontImageUrl = await CardStorage.getSignedUrl(
        pair.front_upload.storage_path,
        3600, // 1 hour expiry
        this.supabase // Pass the service client
      )

      // Get signed URL for back image
      const backImageUrl = await CardStorage.getSignedUrl(
        pair.back_upload.storage_path,
        3600, // 1 hour expiry
        this.supabase // Pass the service client
      )

      // Run AI Vision analysis on BOTH front and back images
      const aiResult = await OpenAIVisionOCR.analyzeCardPair(frontImageUrl, backImageUrl, 'gpt-4o')
      
      // Create card record
      const cardId = await this.createCardRecord(
        pair.id,
        profileId,
        pair.batch_id,
        aiResult
      )

      return { success: true, cardId }

    } catch (error) {
      return { success: false, error: error.message }
    }
  }

  /**
   * Get OCR processing status for a batch
   */
  async getBatchOCRStatus(batchId: string, profileId: string) {
    const [pairsResult, cardsResult] = await Promise.all([
      this.supabase
        .from('card_pairs')
        .select('id')
        .eq('batch_id', batchId)
        .eq('profile_id', profileId)
        .eq('status', 'paired'),
      
      this.supabase
        .from('cards')
        .select('id, status')
        .eq('batch_id', batchId)
        .eq('profile_id', profileId)
    ])

    if (pairsResult.error) throw pairsResult.error
    if (cardsResult.error) throw cardsResult.error

    const totalPairs = pairsResult.data?.length || 0
    const processedCards = cardsResult.data?.length || 0
    const cardsNeedingReview = cardsResult.data?.filter((c: { id: string; status: string }) => c.status === 'needs_review').length || 0

    return {
      total_pairs: totalPairs,
      processed_cards: processedCards,
      cards_needing_review: cardsNeedingReview,
      ocr_complete: totalPairs > 0 && processedCards === totalPairs,
      progress_percentage: totalPairs > 0 ? Math.round((processedCards / totalPairs) * 100) : 0
    }
  }
}
