import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// NOTE: Using eBay OAuth sandbox endpoints
// Docs: https://developer.ebay.com/api-docs/static/oauth-authorization-code-grant.html
const EBAY_SANDBOX_AUTH_URL = "https://auth.sandbox.ebay.com/oauth2/authorize";

export async function GET(req: NextRequest) {
	const url = new URL(req.url);
	const supabase = createClient();
	const { data: userData } = await supabase.auth.getUser();

	// Require auth to link accounts (verified from Auth server)
	if (!userData?.user) {
		return NextResponse.redirect(url.origin + "/sign-in?redirectTo=/integrations");
	}

	// Build state to defend against CSRF and carry return path
	const state = encodeURIComponent(
		JSON.stringify({ r: "/integrations", u: userData.user.id })
	);

	// These should be configured as env vars for a real app
	const clientId = process.env.NEXT_PUBLIC_EBAY_SANDBOX_CLIENT_ID!;
	
	// For new OAuth security model, use actual redirect URI
	const redirectUri = `${url.origin}/api/integrations/ebay/callback`;
	
	// Updated scopes for new OAuth (simplified)
	const scope = encodeURIComponent(
		"https://api.ebay.com/oauth/api_scope https://api.ebay.com/oauth/api_scope/sell.inventory https://api.ebay.com/oauth/api_scope/sell.account"
	);

	console.log("[eBay OAuth] Initiating OAuth flow:", {
		clientId: clientId.substring(0, 10) + "...",
		redirectUri,
		userId: userData.user.id
	});

	const redirect = `${EBAY_SANDBOX_AUTH_URL}?client_id=${clientId}&redirect_uri=${encodeURIComponent(
		redirectUri
	)}&response_type=code&scope=${scope}&state=${state}`;

	return NextResponse.redirect(redirect);
}


