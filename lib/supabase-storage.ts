import { createClient } from '@/libs/supabase/client'

const supabase = createClient()

export const STORAGE_BUCKET = 'card-images'

// Storage configuration
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per image
  MAX_BATCH_SIZE: 200, // Maximum images per batch
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
}

export interface UploadedImage {
  file: File
  path: string
  url: string
  size: number
  type: string
}

export class CardImageStorage {
  /**
   * Upload multiple images to Supabase Storage
   */
  static async uploadBatch(
    userId: string, 
    files: File[], 
    batchId: string
  ): Promise<UploadedImage[]> {
    const results: UploadedImage[] = []
    
    // Validate batch size
    if (files.length > STORAGE_CONFIG.MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${STORAGE_CONFIG.MAX_BATCH_SIZE} images`)
    }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      
      // Validate file
      this.validateFile(file)
      
      // Generate unique path
      const timestamp = Date.now()
      const extension = file.name.split('.').pop()?.toLowerCase()
      const fileName = `${batchId}_${i + 1}_${timestamp}.${extension}`
      const filePath = `${userId}/${batchId}/${fileName}`

      try {
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false
          })

        if (error) {
          console.error(`Failed to upload ${file.name}:`, error)
          throw new Error(`Upload failed for ${file.name}: ${error.message}`)
        }

        // Get public URL
        const { data: urlData } = supabase.storage
          .from(STORAGE_BUCKET)
          .getPublicUrl(filePath)

        results.push({
          file,
          path: filePath,
          url: urlData.publicUrl,
          size: file.size,
          type: file.type
        })

      } catch (error) {
        console.error(`Error uploading ${file.name}:`, error)
        throw error
      }
    }

    return results
  }

  /**
   * Validate individual file
   */
  static validateFile(file: File): void {
    // Check file size
    if (file.size > STORAGE_CONFIG.MAX_FILE_SIZE) {
      throw new Error(`File ${file.name} exceeds maximum size of ${STORAGE_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB`)
    }

    // Check file type
    if (!STORAGE_CONFIG.ALLOWED_TYPES.includes(file.type)) {
      throw new Error(`File ${file.name} has invalid type. Allowed: ${STORAGE_CONFIG.ALLOWED_TYPES.join(', ')}`)
    }

    // Check extension as backup
    const extension = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!STORAGE_CONFIG.ALLOWED_EXTENSIONS.includes(extension)) {
      throw new Error(`File ${file.name} has invalid extension. Allowed: ${STORAGE_CONFIG.ALLOWED_EXTENSIONS.join(', ')}`)
    }
  }

  /**
   * Delete batch of images
   */
  static async deleteBatch(userId: string, batchId: string): Promise<void> {
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(`${userId}/${batchId}`)

    if (listError) {
      throw new Error(`Failed to list files for deletion: ${listError.message}`)
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${userId}/${batchId}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths)

      if (deleteError) {
        throw new Error(`Failed to delete files: ${deleteError.message}`)
      }
    }
  }

  /**
   * Get signed URL for private access (if needed later)
   */
  static async getSignedUrl(filePath: string, expiresIn = 3600): Promise<string> {
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(filePath, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }
}

