'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { useRouter } from 'next/navigation'

export default function TestUploadPage() {
  const router = useRouter()
  const [selectedBatchId, setSelectedBatchId] = useState('')

  // Your existing batch ID for testing
  const testBatchId = '4db13489-268c-4657-b560-d5dc98ceadf5'

  const goToReview = () => {
    const batchId = selectedBatchId || testBatchId
    router.push(`/batch/${batchId}/review`)
  }

  const goToResults = () => {
    const batchId = selectedBatchId || testBatchId
    router.push(`/batch/${batchId}/results`)
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <Card className="max-w-md mx-auto">
        <CardHeader>
          <CardTitle>Test Workflow Navigation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Batch ID (optional)
            </label>
            <input
              type="text"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              placeholder={testBatchId}
              className="w-full px-3 py-2 border rounded-md text-sm font-mono"
            />
          </div>
          
          <div className="space-y-2">
            <Button onClick={goToReview} className="w-full">
              Go to Review Page
            </Button>
            <Button onClick={goToResults} variant="outline" className="w-full">
              Go to Results Page
            </Button>
          </div>
          
          <div className="text-xs text-muted-foreground">
            <p>This page helps test the new workflow:</p>
            <ol className="list-decimal list-inside mt-2 space-y-1">
              <li>Review paired cards</li>
              <li>Click "Start AI Analysis"</li>
              <li>View results dashboard</li>
              <li>Edit extracted data</li>
            </ol>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
