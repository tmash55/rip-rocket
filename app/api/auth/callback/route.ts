import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@/libs/supabase/server";
import config from "@/config";

export const dynamic = "force-dynamic";

// This route is called after a successful login. It exchanges the code for a session and redirects to the callback URL (see config.js).
export async function GET(req: NextRequest) {
  const requestUrl = new URL(req.url);
  const code = requestUrl.searchParams.get("code");

  if (code) {
    const supabase = createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Check for redirect URL in the search params
  const redirectTo = requestUrl.searchParams.get("redirectTo");
  
  // Get pending user data from session storage (if any)
  const pendingUserData = typeof window !== 'undefined' 
    ? sessionStorage.getItem('pendingUserData')
    : null;

  let redirectUrl = requestUrl.origin;

  if (pendingUserData) {
    // User just signed up, redirect to onboarding
    redirectUrl += '/onboarding';
    if (redirectTo) {
      redirectUrl += `?redirectTo=${encodeURIComponent(redirectTo)}`;
    }
  } else if (redirectTo) {
    // User signed in normally, redirect to requested page
    redirectUrl += redirectTo;
  } else {
    // Default redirect
    redirectUrl += '/dashboard';
  }

  return NextResponse.redirect(redirectUrl);
}
