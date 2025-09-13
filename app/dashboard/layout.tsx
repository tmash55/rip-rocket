import { ReactNode } from "react";
import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";
import { Button } from "@/components/ui/button";
import { Plus, Upload, Settings, BarChart3 } from "lucide-react";
import ButtonAccount from "@/components/ButtonAccount";

// This is a server-side component to ensure the user is logged in.
// If not, it will redirect to the login page.
// It's applied to all subpages of /dashboard in /app/dashboard/*** pages
export default async function LayoutPrivate({
  children,
}: {
  children: ReactNode;
}) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(config.auth.loginUrl);
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Dashboard Navigation Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            {/* Logo/Brand */}
            <div className="flex items-center gap-6">
              <Link href="/dashboard" className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
                  <BarChart3 className="h-4 w-4 text-primary-foreground" />
                </div>
                <span className="font-semibold text-lg">RipRocket</span>
              </Link>
              
              {/* Navigation Links */}
              <nav className="hidden md:flex items-center gap-4">
                <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Dashboard
                </Link>
                <Link href="/dashboard/upload" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Upload
                </Link>
                <Link href="/dashboard/integrations" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
                  Integrations
                </Link>
              </nav>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
              <Link href="/dashboard/upload">
                <Button className="gap-2">
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create New Batch</span>
                  <span className="sm:hidden">New</span>
                </Button>
              </Link>
              <ButtonAccount />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {children}
      </main>
    </div>
  );
}