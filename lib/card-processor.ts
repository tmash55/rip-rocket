import { createClient } from '@/libs/supabase/server'
import { CardImageStorage, UploadedImage } from './supabase-storage'
import { GoogleVisionOCR, OCRResult } from './google-vision'

const supabase = createClient()

export interface ProcessingResult {
  batchId: string
  totalImages: number
  processedImages: number
  cardsCreated: number
  errors: string[]
  success: boolean
}

export interface CardProcessingData {
  userId: string
  images: UploadedImage[]
  batchId: string
  batchName?: string
}

export class CardProcessor {
  /**
   * Main processing pipeline for uploaded card images
   */
  static async processBatch(data: CardProcessingData): Promise<ProcessingResult> {
    const { userId, images, batchId, batchName } = data
    
    let processedImages = 0
    let cardsCreated = 0
    const errors: string[] = []

    try {
      // 1. Create upload batch record
      await this.createUploadBatch(userId, batchId, batchName || 'Untitled Batch', images.length)

      // 2. Process each image
      for (const image of images) {
        try {
          // Create image record
          const imageRecord = await this.createImageRecord(userId, image, batchId)
          
          // Run OCR if it's likely a card front
          if (this.isPotentialCardFront(image.file.name)) {
            const ocrResult = await GoogleVisionOCR.extractCardData(image.url)
            
            // Create card record with OCR data
            const cardId = await this.createCardRecord(userId, imageRecord.id, ocrResult)
            cardsCreated++
          }
          
          processedImages++
          
          // Update batch progress
          await this.updateBatchProgress(batchId, processedImages)
          
        } catch (error) {
          console.error(`Failed to process image ${image.file.name}:`, error)
          errors.push(`${image.file.name}: ${error.message}`)
        }
      }

      // 3. Complete batch processing
      await this.completeBatch(batchId, processedImages, cardsCreated)

      return {
        batchId,
        totalImages: images.length,
        processedImages,
        cardsCreated,
        errors,
        success: errors.length === 0
      }

    } catch (error) {
      console.error('Batch processing failed:', error)
      await this.markBatchFailed(batchId, error.message)
      
      return {
        batchId,
        totalImages: images.length,
        processedImages,
        cardsCreated,
        errors: [...errors, error.message],
        success: false
      }
    }
  }

  /**
   * Create upload batch record in database
   */
  private static async createUploadBatch(
    userId: string, 
    batchId: string, 
    batchName: string, 
    totalImages: number
  ): Promise<void> {
    const { error } = await supabase
      .from('upload_batches')
      .insert({
        id: batchId,
        user_id: userId,
        batch_name: batchName,
        total_images: totalImages,
        status: 'processing'
      })

    if (error) {
      throw new Error(`Failed to create batch record: ${error.message}`)
    }
  }

  /**
   * Create image record in database
   */
  private static async createImageRecord(
    userId: string, 
    image: UploadedImage, 
    batchId: string
  ): Promise<any> {
    const imageType = this.detectImageType(image.file.name)
    
    const { data, error } = await supabase
      .from('card_images')
      .insert({
        user_id: userId,
        file_name: image.file.name,
        file_path: image.path,
        file_size: image.size,
        mime_type: image.type,
        image_type: imageType,
        is_primary: imageType === 'front'
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create image record: ${error.message}`)
    }

    // Link to batch
    await supabase
      .from('batch_images')
      .insert({
        batch_id: batchId,
        image_id: data.id
      })

    return data
  }

  /**
   * Create card record with OCR data
   */
  private static async createCardRecord(
    userId: string, 
    primaryImageId: string, 
    ocrResult: OCRResult
  ): Promise<string> {
    const { cardData } = ocrResult
    
    const { data, error } = await supabase
      .from('cards')
      .insert({
        user_id: userId,
        card_name: cardData.playerName,
        player_name: cardData.playerName,
        year: cardData.year,
        brand: cardData.brand,
        card_number: cardData.cardNumber,
        sport: cardData.sport,
        ocr_processed: true,
        ocr_confidence: cardData.confidence,
        ocr_raw_data: ocrResult,
        needs_manual_review: cardData.needsReview
      })
      .select()
      .single()

    if (error) {
      throw new Error(`Failed to create card record: ${error.message}`)
    }

    // Update image with card_id
    await supabase
      .from('card_images')
      .update({ card_id: data.id })
      .eq('id', primaryImageId)

    return data.id
  }

  /**
   * Detect image type based on filename patterns
   */
  private static detectImageType(filename: string): string {
    const lower = filename.toLowerCase()
    
    if (lower.includes('back') || lower.includes('rear')) {
      return 'back'
    } else if (lower.includes('front') || lower.includes('face')) {
      return 'front'
    } else if (lower.includes('detail') || lower.includes('close')) {
      return 'detail'
    } else {
      // Default assumption for single images
      return 'front'
    }
  }

  /**
   * Check if image is likely a card front (for OCR processing)
   */
  private static isPotentialCardFront(filename: string): boolean {
    const lower = filename.toLowerCase()
    return !lower.includes('back') && !lower.includes('rear')
  }

  /**
   * Update batch processing progress
   */
  private static async updateBatchProgress(batchId: string, processedImages: number): Promise<void> {
    await supabase
      .from('upload_batches')
      .update({ processed_images: processedImages })
      .eq('id', batchId)
  }

  /**
   * Mark batch as completed
   */
  private static async completeBatch(
    batchId: string, 
    processedImages: number, 
    cardsCreated: number
  ): Promise<void> {
    await supabase
      .from('upload_batches')
      .update({
        status: 'completed',
        processed_images: processedImages,
        cards_created: cardsCreated,
        completed_at: new Date().toISOString()
      })
      .eq('id', batchId)
  }

  /**
   * Mark batch as failed
   */
  private static async markBatchFailed(batchId: string, errorMessage: string): Promise<void> {
    await supabase
      .from('upload_batches')
      .update({
        status: 'failed',
        completed_at: new Date().toISOString()
      })
      .eq('id', batchId)
  }
}

