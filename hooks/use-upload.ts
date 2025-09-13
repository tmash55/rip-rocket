import { useState, useCallback } from 'react'
import { toast } from 'sonner'

interface UploadProgress {
  batch_id?: string
  uploaded_files: number
  total_files: number
  current_file?: string
  progress: number // 0-100
  status: 'idle' | 'uploading' | 'processing' | 'completed' | 'error'
}

interface UploadOptions {
  batch_name?: string
  note?: string
  onProgress?: (progress: UploadProgress) => void
  onFileProgress?: (fileIndex: number, progress: number, status: 'uploading' | 'completed' | 'error') => void
  onComplete?: (batch_id: string) => void
  onError?: (error: string) => void
}

export function useUpload() {
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    uploaded_files: 0,
    total_files: 0,
    progress: 0,
    status: 'idle'
  })

  const uploadBatch = useCallback(async (
    files: FileList | File[],
    options: UploadOptions = {}
  ) => {
    const fileArray = Array.from(files)
    
    if (fileArray.length === 0) {
      toast.error('No files selected')
      return
    }

    try {
      // Reset progress
      setUploadProgress({
        uploaded_files: 0,
        total_files: fileArray.length,
        progress: 0,
        status: 'uploading'
      })

      options.onProgress?.({
        uploaded_files: 0,
        total_files: fileArray.length,
        progress: 0,
        status: 'uploading'
      })

      // Prepare form data
      const formData = new FormData()
      
      if (options.batch_name) {
        formData.append('batch_name', options.batch_name)
      }
      
      if (options.note) {
        formData.append('note', options.note)
      }

      // Add files to form data
      fileArray.forEach((file, index) => {
        formData.append(`file_${index}`, file)
      })

      // Simulate individual file upload progress
      const simulateFileUploads = async () => {
        const totalFiles = fileArray.length
        
        // Start all files as uploading
        for (let i = 0; i < totalFiles; i++) {
          options.onFileProgress?.(i, 0, 'uploading')
          await new Promise(resolve => setTimeout(resolve, 50)) // Small delay for visual effect
        }

        // Simulate progressive upload
        const progressPerFile = 90 / totalFiles // Leave 10% for final processing
        
        for (let i = 0; i < totalFiles; i++) {
          // Simulate individual file upload with multiple progress updates
          for (let progress = 10; progress <= 100; progress += 20) {
            options.onFileProgress?.(i, progress, 'uploading')
            
            // Update overall progress
            const overallProgress = 10 + (i * progressPerFile) + ((progress / 100) * progressPerFile)
            const uploadingProgress = {
              uploaded_files: i + (progress / 100),
              total_files: totalFiles,
              progress: Math.min(overallProgress, 90),
              status: 'uploading' as const
            }
            setUploadProgress(uploadingProgress)
            options.onProgress?.(uploadingProgress)
            
            await new Promise(resolve => setTimeout(resolve, 100)) // Simulate upload time
          }
          
          // Mark file as completed
          options.onFileProgress?.(i, 100, 'completed')
        }
      }

      // Start progress simulation
      const progressPromise = simulateFileUploads()

      // Upload to API (this happens alongside the progress simulation)
      const response = await fetch('/api/uploads/batch', {
        method: 'POST',
        body: formData
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Upload failed')
      }

      const result = await response.json()

      // Wait for progress simulation to complete
      await progressPromise

      // Update progress - upload complete
      const completedProgress = {
        batch_id: result.batch.id,
        uploaded_files: fileArray.length,
        total_files: fileArray.length,
        progress: 100,
        status: 'completed' as const
      }
      setUploadProgress(completedProgress)
      options.onProgress?.(completedProgress)

      toast.success(`Successfully uploaded ${fileArray.length} files`)
      options.onComplete?.(result.batch.id)

      return result

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Upload failed'
      
      const errorProgress = {
        uploaded_files: 0,
        total_files: fileArray.length,
        progress: 0,
        status: 'error' as const
      }
      setUploadProgress(errorProgress)
      options.onProgress?.(errorProgress)

      toast.error(errorMessage)
      options.onError?.(errorMessage)
      
      throw error
    }
  }, [])

  const resetUpload = useCallback(() => {
    setUploadProgress({
      uploaded_files: 0,
      total_files: 0,
      progress: 0,
      status: 'idle'
    })
  }, [])

  return {
    uploadProgress,
    uploadBatch,
    resetUpload,
    isUploading: uploadProgress.status === 'uploading'
  }
}
