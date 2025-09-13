"use client"

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import BatchUpload from '@/components/upload/BatchUpload'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { ArrowLeft, CheckCircle } from 'lucide-react'

export default function UploadPage() {
  const router = useRouter()
  const [completedBatch, setCompletedBatch] = useState<string | null>(null)

  const handleUploadComplete = (batchId: string) => {
    setCompletedBatch(batchId)
  }

  const goToBatch = () => {
    if (completedBatch) {
      router.push(`/dashboard/batch/${completedBatch}/review`)
    }
  }

  const startNewUpload = () => {
    setCompletedBatch(null)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <Button 
          variant="ghost" 
          onClick={() => router.back()}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back
        </Button>
        
        <h1 className="text-3xl font-bold">Upload Card Images</h1>
        <p className="text-muted-foreground mt-2">
          Upload your card images to start the listing process. Images will be processed for pairing and OCR.
        </p>
      </div>

      {!completedBatch ? (
        <BatchUpload onUploadComplete={handleUploadComplete} />
      ) : (
        <Card className="w-full max-w-2xl mx-auto">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              Upload Successful!
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Your images have been uploaded successfully. You can now view the batch details 
              or start a new upload.
            </p>
            
            <div className="flex gap-3">
              <Button onClick={goToBatch}>
                View Batch Details
              </Button>
              <Button variant="outline" onClick={startNewUpload}>
                Upload More Images
              </Button>
            </div>
            
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-sm">
                <strong>Batch ID:</strong> {completedBatch}
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Next steps: Images will be processed for front/back pairing and OCR extraction.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
