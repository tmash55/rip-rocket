import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// Debug endpoint to check eBay configuration
export async function GET(req: NextRequest) {
  try {
    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();

    if (!userData?.user) {
      return NextResponse.json({ 
        error: "Not authenticated" 
      }, { status: 401 });
    }

    const clientId = process.env.NEXT_PUBLIC_EBAY_SANDBOX_CLIENT_ID;
    const clientSecret = process.env.EBAY_SANDBOX_CLIENT_SECRET;
    const ruName = process.env.NEXT_PUBLIC_EBAY_SANDBOX_RU_NAME;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;

    return NextResponse.json({
      environment_check: {
        has_client_id: !!clientId,
        client_id_preview: clientId ? clientId.substring(0, 10) + "..." : "MISSING",
        has_client_secret: !!clientSecret,
        client_secret_preview: clientSecret ? clientSecret.substring(0, 10) + "..." : "MISSING",
        ru_name: ruName || "NOT_SET",
        site_url: siteUrl || "NOT_SET",
      },
      user_info: {
        user_id: userData.user.id,
        email: userData.user.email
      },
      current_origin: req.nextUrl.origin,
      expected_redirect_uri: `${req.nextUrl.origin}/api/integrations/ebay/callback`,
      is_https: req.nextUrl.protocol === 'https:'
    });

  } catch (error) {
    console.error("[eBay Debug] Error:", error);
    return NextResponse.json({ 
      error: "Server error",
      debug: { error: error.message }
    }, { status: 500 });
  }
}
