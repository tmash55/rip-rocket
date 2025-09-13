"use client"

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export default function TestDbPage() {
  const [result, setResult] = useState<any>(null)
  const [loading, setLoading] = useState(false)

  const testDbInsert = async () => {
    setLoading(true)
    try {
      const response = await fetch('/api/test-db-insert', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          batch_id: "3753db80-b513-44f4-8067-f24b774ab202",
          front_upload_id: "b579a477-431d-4cf8-bad2-fcb32a5e8547",
          back_upload_id: "403ada4e-23fb-4af8-80fb-d1ed53e27af5"
        })
      })
      
      const data = await response.json()
      setResult(data)
      console.log('Test result:', data)
    } catch (error) {
      console.error('Test error:', error)
      setResult({ error: error.message })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-10">
      <Card className="max-w-2xl mx-auto">
        <CardHeader>
          <CardTitle>Database Insert Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            onClick={testDbInsert} 
            disabled={loading}
            className="w-full"
          >
            {loading ? 'Testing...' : 'Test Database Insert'}
          </Button>
          
          {result && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Result:</h3>
              <pre className="bg-gray-100 p-4 rounded text-sm overflow-auto">
                {JSON.stringify(result, null, 2)}
              </pre>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
