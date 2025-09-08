import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// Helper route to check eBay connection status and debug token storage
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      return NextResponse.json({ 
        connected: false, 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    // Check if user has eBay tokens
    const { data: tokens, error: tokenError } = await supabase
      .from("ebay_tokens")
      .select("*")
      .eq("user_id", userData.user.id)
      .single();

    if (tokenError) {
      console.log("[eBay Status] Token query error:", tokenError);
      return NextResponse.json({
        connected: false,
        error: "No eBay connection found",
        debug: {
          user_id: userData.user.id,
          error: tokenError.message
        }
      });
    }

    // Check if tokens are still valid
    const now = new Date();
    const expiresAt = new Date(tokens.expires_at);
    const isExpired = now > expiresAt;

    return NextResponse.json({
      connected: true,
      token_info: {
        expires_at: tokens.expires_at,
        is_expired: isExpired,
        has_refresh_token: !!tokens.refresh_token,
        created_at: tokens.created_at
      },
      debug: {
        user_id: userData.user.id
      }
    });

  } catch (error) {
    console.error("[eBay Status] Unexpected error:", error);
    return NextResponse.json({ 
      connected: false, 
      error: "Server error",
      debug: { error: error.message }
    }, { status: 500 });
  }
}
