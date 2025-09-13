import { createClient } from '@/libs/supabase/server'

export const STORAGE_BUCKET = 'cards-images'

// Storage configuration aligned with your schema
export const STORAGE_CONFIG = {
  MAX_FILE_SIZE: 10 * 1024 * 1024, // 10MB per image
  MAX_BATCH_SIZE: 200, // Maximum images per batch
  ALLOWED_TYPES: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
  ALLOWED_EXTENSIONS: ['.jpg', '.jpeg', '.png', '.webp']
}

export interface UploadedFile {
  file: File
  id: string
  filename: string
  storage_path: string
  public_url: string
  size: number
  mime_type: string
}

export class CardStorage {
  /**
   * Generate storage path: cards/{profile_id}/{batch_id}/{filename}
   */
  static generateStoragePath(profileId: string, batchId: string, filename: string): string {
    // Sanitize filename
    const sanitized = filename.replace(/[^a-zA-Z0-9.-]/g, '_')
    return `${profileId}/${batchId}/${sanitized}`
  }

  /**
   * Upload multiple files to Supabase Storage
   */
  static async uploadBatch(
    profileId: string,
    batchId: string,
    files: File[]
  ): Promise<UploadedFile[]> {
    const supabase = createClient() // Create authenticated client instance
    const results: UploadedFile[] = []
    
    // Validate batch size
    if (files.length > STORAGE_CONFIG.MAX_BATCH_SIZE) {
      throw new Error(`Batch size exceeds maximum of ${STORAGE_CONFIG.MAX_BATCH_SIZE} images`)
    }

    for (const file of files) {
      try {
        // Validate individual file
        this.validateFile(file)
        
        // Generate storage path
        const storage_path = this.generateStoragePath(profileId, batchId, file.name)
        
        // Upload to Supabase Storage
        const { data, error } = await supabase.storage
          .from(STORAGE_BUCKET)
          .upload(storage_path, file, {
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
          .getPublicUrl(storage_path)

        results.push({
          file,
          id: crypto.randomUUID(),
          filename: file.name,
          storage_path,
          public_url: urlData.publicUrl,
          size: file.size,
          mime_type: file.type
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
   * Delete batch of files from storage
   */
  static async deleteBatch(profileId: string, batchId: string): Promise<void> {
    const supabase = createClient() // Create authenticated client instance
    const folderPath = `${profileId}/${batchId}`
    
    const { data: files, error: listError } = await supabase.storage
      .from(STORAGE_BUCKET)
      .list(folderPath)

    if (listError) {
      throw new Error(`Failed to list files for deletion: ${listError.message}`)
    }

    if (files && files.length > 0) {
      const filePaths = files.map(file => `${folderPath}/${file.name}`)
      
      const { error: deleteError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .remove(filePaths)

      if (deleteError) {
        throw new Error(`Failed to delete files: ${deleteError.message}`)
      }
    }
  }

  /**
   * Get signed URL for private access
   */
  static async getSignedUrl(storage_path: string, expiresIn = 3600, supabaseClient?: any): Promise<string> {
    const supabase = supabaseClient || createClient() // Use provided client or create default
    const { data, error } = await supabase.storage
      .from(STORAGE_BUCKET)
      .createSignedUrl(storage_path, expiresIn)

    if (error) {
      throw new Error(`Failed to create signed URL: ${error.message}`)
    }

    return data.signedUrl
  }
}
