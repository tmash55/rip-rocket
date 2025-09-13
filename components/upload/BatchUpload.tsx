"use client"
import React from 'react'
import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Upload, X, FileImage, AlertCircle, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { useUpload } from '@/hooks/use-upload'
import { toast } from 'sonner'
import UploadSuccess from './UploadSuccess'

interface FileWithPreview extends File {
  preview?: string
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'error'
  uploadProgress?: number
  id?: string
}

interface BatchUploadProps {
  onUploadComplete?: (batchId: string) => void
  maxFiles?: number
}

export default function BatchUpload({ onUploadComplete, maxFiles = 200 }: BatchUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<FileWithPreview[]>([])
  const [batchName, setBatchName] = useState('')
  const [note, setNote] = useState('')
  const [isDragOver, setIsDragOver] = useState(false)
  const [uploadResult, setUploadResult] = useState<{ batchId: string; batchName: string; totalFiles: number } | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const { uploadProgress, uploadBatch, isUploading } = useUpload()

  // File selection handlers
  const handleFileSelect = useCallback((files: FileList | null) => {
    if (!files) return

    const fileArray = Array.from(files)
    const validFiles = fileArray.filter(file => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not an image file`)
        return false
      }
      
      // Validate file size (10MB max)
      if (file.size > 10 * 1024 * 1024) {
        toast.error(`${file.name} is too large (max 10MB)`)
        return false
      }
      
      return true
    })

    if (selectedFiles.length + validFiles.length > maxFiles) {
      toast.error(`Cannot select more than ${maxFiles} files`)
      return
    }

    // Create file objects with previews
    const filesWithPreviews: FileWithPreview[] = validFiles.map(file => {
      const fileWithPreview = file as FileWithPreview
      fileWithPreview.preview = URL.createObjectURL(file)
      fileWithPreview.uploadStatus = 'pending'
      fileWithPreview.uploadProgress = 0
      fileWithPreview.id = `${file.name}-${Date.now()}-${Math.random()}`
      return fileWithPreview
    })

    setSelectedFiles(prev => [...prev, ...filesWithPreviews])
  }, [selectedFiles.length, maxFiles])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files)
  }

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    handleFileSelect(e.dataTransfer.files)
  }, [handleFileSelect])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
  }, [])

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index))
  }

  const clearAll = () => {
    // Clean up object URLs
    selectedFiles.forEach(file => {
      if (file.preview) {
        URL.revokeObjectURL(file.preview)
      }
    })
    setSelectedFiles([])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  // Cleanup effect for object URLs
  useEffect(() => {
    return () => {
      selectedFiles.forEach(file => {
        if (file.preview) {
          URL.revokeObjectURL(file.preview)
        }
      })
    }
  }, [selectedFiles])

  const handleUpload = async () => {
    if (selectedFiles.length === 0) {
      toast.error('Please select files to upload')
      return
    }

    const finalBatchName = batchName || `Batch ${new Date().toLocaleDateString()}`

    // Set all files to uploading status
    setSelectedFiles(prev => prev.map(file => ({
      ...file,
      uploadStatus: 'uploading' as const,
      uploadProgress: 0
    })))

    try {
      const result = await uploadBatch(selectedFiles, {
        batch_name: finalBatchName,
        note: note || undefined,
        onFileProgress: (fileIndex, progress, status) => {
          setSelectedFiles(prev => prev.map((file, index) => 
            index === fileIndex 
              ? { ...file, uploadProgress: progress, uploadStatus: status }
              : file
          ))
        },
        onComplete: (batchId) => {
          // Set upload result to show success page
          setUploadResult({
            batchId,
            batchName: finalBatchName,
            totalFiles: selectedFiles.length
          })
          onUploadComplete?.(batchId)
        }
      })
    } catch (error) {
      // Mark all files as error
      setSelectedFiles(prev => prev.map(file => ({
        ...file,
        uploadStatus: 'error' as const
      })))
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  // Show success page if upload completed
  if (uploadResult) {
    return (
      <UploadSuccess
        batchId={uploadResult.batchId}
        batchName={uploadResult.batchName}
        totalFiles={uploadResult.totalFiles}
      />
    )
  }

  return (
    <Card className="w-full max-w-4xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Upload className="w-5 h-5" />
          Upload Card Images
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Batch Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label htmlFor="batch-name">Batch Name</Label>
            <Input
              id="batch-name"
              value={batchName}
              onChange={(e) => setBatchName(e.target.value)}
              placeholder={`Batch ${new Date().toLocaleDateString()}`}
              disabled={isUploading}
            />
          </div>
          <div>
            <Label htmlFor="note">Note (Optional)</Label>
            <Input
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add a note about this batch..."
              disabled={isUploading}
            />
          </div>
        </div>

        <Separator />

        {/* Upload Area */}
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            isDragOver
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/50'
          } ${isUploading ? 'opacity-50 pointer-events-none' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
        >
          <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <h3 className="text-lg font-semibold mb-2">
            Drag & drop your card images here
          </h3>
          <p className="text-muted-foreground mb-4">
            or click to select files (max {maxFiles} images, 10MB each)
          </p>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            Select Files
          </Button>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/*"
            onChange={handleInputChange}
            className="hidden"
            disabled={isUploading}
          />
        </div>

        {/* Selected Files with Previews */}
        {selectedFiles.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-semibold">
                Selected Files ({selectedFiles.length})
              </h4>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={isUploading}
              >
                Clear All
              </Button>
            </div>
            
            {/* Grid Layout for Image Previews */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 max-h-80 overflow-y-auto">
              <AnimatePresence>
                {selectedFiles.map((file, index) => (
                  <motion.div
                    key={file.id || `${file.name}-${index}`}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.8 }}
                    className="relative group"
                  >
                    <div className="aspect-square bg-muted rounded-lg overflow-hidden border-2 border-transparent hover:border-primary/50 transition-colors">
                      {file.preview && (
                        <img
                          src={file.preview}
                          alt={file.name}
                          className="w-full h-full object-cover"
                        />
                      )}
                      
                      {/* Upload Status Overlay */}
                      {isUploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                          {file.uploadStatus === 'uploading' && (
                            <div className="flex flex-col items-center gap-2 text-white">
                              <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                              <span className="text-xs font-medium">
                                {file.uploadProgress || 0}%
                              </span>
                            </div>
                          )}
                          {file.uploadStatus === 'completed' && (
                            <CheckCircle className="w-8 h-8 text-green-400" />
                          )}
                          {file.uploadStatus === 'error' && (
                            <AlertCircle className="w-8 h-8 text-red-400" />
                          )}
                        </div>
                      )}
                      
                      {/* Remove Button */}
                      {!isUploading && (
                        <Button
                          variant="destructive"
                          size="sm"
                          className="absolute top-1 right-1 w-6 h-6 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={() => removeFile(index)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                    
                    {/* File Info */}
                    <div className="mt-2 text-center">
                      <p className="text-xs font-medium truncate">
                        {file.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatFileSize(file.size)}
                      </p>
                      
                      {/* Individual Progress Bar */}
                      {isUploading && file.uploadStatus === 'uploading' && (
                        <div className="mt-1 w-full bg-muted rounded-full h-1">
                          <div
                            className="bg-primary h-1 rounded-full transition-all duration-300"
                            style={{ width: `${file.uploadProgress || 0}%` }}
                          />
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
        )}

        {/* Upload Progress */}
        {isUploading && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <span className="text-sm font-medium">
                Uploading... {uploadProgress.progress}%
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress.progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">
              {uploadProgress.uploaded_files} of {uploadProgress.total_files} files uploaded
            </p>
          </div>
        )}

        {/* Upload Status */}
        {uploadProgress.status === 'completed' && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950/20 rounded-lg">
            <CheckCircle className="w-4 h-4 text-green-600" />
            <span className="text-sm text-green-700 dark:text-green-400">
              Upload completed successfully!
            </span>
          </div>
        )}

        {uploadProgress.status === 'error' && (
          <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-950/20 rounded-lg">
            <AlertCircle className="w-4 h-4 text-red-600" />
            <span className="text-sm text-red-700 dark:text-red-400">
              Upload failed. Please try again.
            </span>
          </div>
        )}

        {/* Upload Button */}
        <Button
          onClick={handleUpload}
          disabled={selectedFiles.length === 0 || isUploading}
          className="w-full"
          size="lg"
        >
          {isUploading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              Uploading...
            </div>
          ) : (
            `Upload ${selectedFiles.length} Files`
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
