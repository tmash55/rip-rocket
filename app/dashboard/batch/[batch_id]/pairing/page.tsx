import { redirect } from 'next/navigation'
import { createClient } from '@/libs/supabase/server'
import ManualPairing from '@/components/pairing/ManualPairing'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'

interface PageProps {
  params: { batchId: string }
}

export default async function PairingPage({ params }: PageProps) {
  const { batchId } = params
  const supabase = createClient()

  // Check authentication
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/sign-in')
  }

  // Get batch details
  const { data: batch, error: batchError } = await supabase
    .from('batches')
    .select('*')
    .eq('id', batchId)
    .eq('profile_id', user.id)
    .single()

  if (batchError || !batch) {
    return (
      <div className="container mx-auto px-4 py-10">
        <Card>
          <CardContent className="flex items-center justify-center h-48">
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">Batch Not Found</h2>
              <p className="text-muted-foreground mb-4">The batch you&apos;re looking for doesn&apos;t exist or you don&apos;t have access to it.</p>
              <Link href="/dashboard/upload">
                <Button>
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back to Upload
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-10">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link href="/dashboard/upload">
            <Button variant="outline" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Card Pairing</h1>
            <p className="text-muted-foreground">
              Batch: {batch.name} • {batch.total_files} images
            </p>
          </div>
        </div>
      </div>

      {/* Pairing Interface */}
      <ManualPairing 
        batchId={batchId}
      />
    </div>
  )
}
