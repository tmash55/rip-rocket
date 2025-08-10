import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/libs/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Email capture gate: allow join page and API routes without gating
  const { pathname } = request.nextUrl;
  const isJoinRoute = pathname.startsWith("/join");
  const isApiRoute = pathname.startsWith("/api");
  const hasEmailGateCookie = request.cookies.get("fnx_email_ok")?.value === "1";
  const acceptHeader = request.headers.get("accept") || "";
  const expectsHtml = acceptHeader.includes("text/html");

  if (!hasEmailGateCookie && !isJoinRoute && !isApiRoute && expectsHtml) {
    const url = request.nextUrl.clone();
    url.pathname = "/join";
    const nextParam = pathname + (request.nextUrl.search || "");
    url.searchParams.set("next", nextParam);
    return NextResponse.redirect(url);
  }

  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
