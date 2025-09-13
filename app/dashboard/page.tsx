import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, BarChart3, Settings, Zap } from "lucide-react";

export const dynamic = "force-dynamic";

// This is a private page: It's protected by the layout.js component which ensures the user is authenticated.
// It's a server compoment which means you can fetch data (like the user profile) before the page is rendered.
export default async function Dashboard() {
  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-2">Dashboard</h1>
          <p className="text-muted-foreground">
            Manage your card collection and eBay listings
          </p>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/upload">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">Upload Cards</CardTitle>
                </div>
                <CardDescription>
                  Upload new card images to start processing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  Start New Batch
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <Link href="/dashboard/integrations">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  <CardTitle className="text-lg">eBay Integration</CardTitle>
                </div>
                <CardDescription>
                  Connect your eBay account for listing
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button className="w-full" variant="outline">
                  View Integrations
                </Button>
              </CardContent>
            </Link>
          </Card>

          <Card className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5 text-primary" />
                <CardTitle className="text-lg">Analytics</CardTitle>
              </div>
              <CardDescription>
                View your processing statistics
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button className="w-full" variant="outline" disabled>
                Coming Soon
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
            <CardDescription>
              Your latest card processing batches
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-center py-8 text-muted-foreground">
              <Upload className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No recent batches</p>
              <p className="text-sm">Upload some cards to get started!</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}