import { cookies } from "next/headers"
import { NextResponse } from "next/server"
import { createClient } from "@/libs/supabase/server"

const EMAIL_COOKIE_NAME = "fnx_email_ok"

export async function POST(request: Request) {
  try {
    const { email } = (await request.json()) as { email?: string }
    if (!email || typeof email !== "string") {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const supabase = createClient()
    const { error } = await supabase
      .from("fantasy_nexus_emails")
      .insert({ email })

    if (error) {
      // Unique violation or other error; we still set cookie to allow access
      // but return 200 to keep UX smooth
      console.error("join insert error", error)
    }

    const cookieStore = cookies()
    cookieStore.set(EMAIL_COOKIE_NAME, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 365, // 1 year
      path: "/",
    })

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 })
  }
}



