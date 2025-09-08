import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/libs/supabase/server";

export const dynamic = "force-dynamic";

// Exchange code for tokens (sandbox)
const EBAY_SANDBOX_TOKEN_URL = "https://api.sandbox.ebay.com/identity/v1/oauth2/token";

async function exchangeCodeForToken(code: string, redirectUri: string) {
	const clientId = process.env.NEXT_PUBLIC_EBAY_SANDBOX_CLIENT_ID!;
	const clientSecret = process.env.EBAY_SANDBOX_CLIENT_SECRET!;
	const basic = Buffer.from(`${clientId}:${clientSecret}`).toString("base64");

	const params = new URLSearchParams();
	params.set("grant_type", "authorization_code");
	params.set("code", code);
	params.set("redirect_uri", redirectUri);

	const res = await fetch(EBAY_SANDBOX_TOKEN_URL, {
		method: "POST",
		headers: {
			"Content-Type": "application/x-www-form-urlencoded",
			Authorization: `Basic ${basic}`,
		},
		body: params.toString(),
	});

	const text = await res.text();
	if (!res.ok) {
		console.error("[eBay] Token exchange failed", { status: res.status, body: text?.slice(0,500) });
		throw new Error(`token_exchange_failed_${res.status}`);
	}
	return JSON.parse(text) as {
		access_token: string;
		refresh_token?: string;
		expires_in: number;
		token_type: string;
	};
}

export async function GET(req: NextRequest) {
	const supabase = createClient();
	const url = new URL(req.url);
	const code = url.searchParams.get("code");
	const state = url.searchParams.get("state");

	if (!code || !state) {
		return NextResponse.redirect(url.origin + "/integrations?error=missing_params");
	}

	let userId: string | null = null;
	try {
		const parsed = JSON.parse(decodeURIComponent(state));
		userId = parsed.u as string;
	} catch {
		/* ignore */
	}

	const redirectUri = `${url.origin}/api/integrations/ebay/callback`;

	try {
		console.log("[eBay] Starting token exchange for user:", userId);
		const tokens = await exchangeCodeForToken(code, redirectUri);
		console.log("[eBay] Token exchange successful, received tokens");

		// Store tokens against the user profile (server-side RLS requires matching id)
		if (!userId) {
			const { data: userData } = await supabase.auth.getUser();
			userId = userData?.user?.id ?? null;
			console.log("[eBay] Retrieved user ID from session:", userId);
		}

		if (!userId) {
			console.error("[eBay] No user ID available for token storage");
			return NextResponse.redirect(url.origin + "/sign-in?redirectTo=/integrations");
		}

		// Prepare token data for storage
		const tokenData = {
			user_id: userId,
			access_token: tokens.access_token,
			refresh_token: tokens.refresh_token ?? null,
			expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
		};
		
		console.log("[eBay] Storing tokens for user:", userId, "expires at:", tokenData.expires_at);

		// Prefer a dedicated tokens table for multiple connections per user
		const { error: dbError, data: insertData } = await supabase.from("ebay_tokens").upsert(
			tokenData,
			{ onConflict: "user_id" }
		);
		
		if (dbError) {
			console.error("[eBay] Supabase upsert error:", dbError);
			return NextResponse.redirect(url.origin + "/integrations?error=db_upsert&detail=" + encodeURIComponent(dbError.message));
		}

		console.log("[eBay] Tokens stored successfully for user:", userId);
		return NextResponse.redirect(url.origin + "/integrations?connected=ebay");
	} catch (e: any) {
		console.error("[eBay] OAuth callback error", e?.message || e);
		const detail = typeof e?.message === "string" ? e.message : "unknown";
		return NextResponse.redirect(url.origin + `/integrations?error=exchange_failed&detail=${encodeURIComponent(detail)}`);
	}
}


