"use client"

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, Clock, ArrowRight, Upload, Users } from 'lucide-react'
import Link from 'next/link'

interface UploadSuccessProps {
  batchId: string
  batchName: string
  totalFiles: number
}

interface BatchStatus {
  id: string
  name: string
  status: 'uploaded' | 'processing' | 'needs_pairing' | 'paired' | 'completed'
  total_files: number
  progress: number
}

export default function UploadSuccess({ batchId, batchName, totalFiles }: UploadSuccessProps) {
  const [batchStatus, setBatchStatus] = useState<BatchStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [autoRedirect, setAutoRedirect] = useState(false)
  const router = useRouter()

  useEffect(() => {
    // Initial load
    checkBatchStatus()
    
    // Poll for status updates every 2 seconds
    const interval = setInterval(checkBatchStatus, 2000)
    
    return () => clearInterval(interval)
  }, [batchId])

  const checkBatchStatus = async () => {
    try {
      const response = await fetch(`/api/batches/${batchId}`)
      if (!response.ok) return
      
      const data = await response.json()
      setBatchStatus(data.batch)
      setLoading(false)

      // Auto-redirect when pairing is completed
      if (data.batch.status === 'paired' && !autoRedirect) {
        setAutoRedirect(true)
        setTimeout(() => {
          router.push(`/dashboard/batch/${batchId}/review`)
        }, 2000) // 2 second delay to show completion
      }
    } catch (error) {
      console.error('Error checking batch status:', error)
      setLoading(false)
    }
  }

  const getStatusInfo = () => {
    if (!batchStatus) return { text: 'Loading...', color: 'gray', progress: 0 }
    
    switch (batchStatus.status) {
      case 'uploaded':
        return { text: 'Upload Complete', color: 'green', progress: 100, icon: CheckCircle }
      case 'processing':
        return { text: 'Processing Images...', color: 'blue', progress: 50, icon: Clock }
      case 'needs_pairing':
        return { text: 'Ready for Pairing', color: 'orange', progress: 75, icon: Users }
      case 'paired':
        return { text: 'Ready for Review', color: 'green', progress: 100, icon: CheckCircle }
      default:
        return { text: 'Processing...', color: 'blue', progress: 25, icon: Clock }
    }
  }

  const statusInfo = getStatusInfo()
  const StatusIcon = statusInfo.icon || Clock

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Success Header */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="rounded-full bg-green-100 p-3">
              <Upload className="h-8 w-8 text-green-600" />
            </div>
          </div>
          <CardTitle className="text-2xl">Upload Successful!</CardTitle>
          <p className="text-muted-foreground">
            {totalFiles} images uploaded to batch &quot;{batchName}&quot;
          </p>
        </CardHeader>
      </Card>

      {/* Processing Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <StatusIcon className={`h-5 w-5 ${
              statusInfo.color === 'green' ? 'text-green-600' : 
              statusInfo.color === 'blue' ? 'text-blue-600' : 
              statusInfo.color === 'orange' ? 'text-orange-600' : 
              'text-gray-600'
            }`} />
            Processing Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{statusInfo.text}</span>
            <Badge variant={
              statusInfo.color === 'green' ? 'default' :
              statusInfo.color === 'blue' ? 'secondary' :
              statusInfo.color === 'orange' ? 'destructive' :
              'outline'
            }>
              {batchStatus?.status || 'processing'}
            </Badge>
          </div>
          
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-primary h-2 rounded-full transition-all duration-500"
              style={{ width: `${statusInfo.progress}%` }}
            />
          </div>
          
          <div className="text-sm text-muted-foreground">
            {batchStatus?.status === 'processing' && (
              "Running automatic pairing algorithms..."
            )}
            {batchStatus?.status === 'needs_pairing' && (
              "Images are being paired automatically..."
            )}
            {batchStatus?.status === 'paired' && (
              "Pairing complete! Redirecting to review page..."
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Manual navigation to review */}
            {batchStatus?.status === 'paired' && (
              <Link href={`/dashboard/batch/${batchId}/review`} className="flex-1">
                <Button className="w-full">
                  <Users className="h-4 w-4 mr-2" />
                  Review Pairing
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            )}
            
            {/* Upload more */}
            <Link href="/dashboard/upload" className="flex-1">
              <Button variant="outline" className="w-full">
                Upload Another Batch
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Auto-redirect notification */}
            {autoRedirect && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-6">
            <div className="flex items-center gap-2 text-green-800">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Redirecting to pairing review in 2 seconds...</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Batch Details */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Batch Details</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-muted-foreground">Batch ID:</span>
              <div className="font-mono text-xs mt-1">{batchId}</div>
            </div>
            <div>
              <span className="text-muted-foreground">Total Files:</span>
              <div className="font-semibold mt-1">{totalFiles}</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
