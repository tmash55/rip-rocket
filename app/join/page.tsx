"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Youtube, X } from "lucide-react"
import StatefulButton from "@/components/ui/stateful-button"

export default function JoinPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isSuccess, setIsSuccess] = useState(false)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsSuccess(false)
    setIsSubmitting(true)
    try {
      const res = await fetch("/api/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data?.error || "Failed to join")
      }
      setIsSuccess(true)
      setTimeout(() => router.replace("/adp"), 600)
    } catch (err: any) {
      setError(err.message || "Something went wrong")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4">
      <div className="w-full sm:max-w-sm md:max-w-md rounded-xl border border-border bg-card p-4 sm:p-6 shadow-sm">
        <h1 className="text-lg font-semibold mb-2">Join Fantasy Nexus</h1>
        <p className="text-sm text-muted-foreground mb-4">
          Enter your email to access the site. We’ll share occasional updates. You can unsubscribe anytime.
        </p>
        <form onSubmit={onSubmit} className="space-y-3">
          <div>
            <label htmlFor="email" className="block text-sm mb-1">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {error ? (
            <div className="text-sm text-red-600" role="alert">
              {error}
            </div>
          ) : null}
          <StatefulButton
            type="submit"
            className="w-full"
            isLoading={isSubmitting}
            isSuccess={isSuccess}
            idleText="Continue"
            loadingText="Submitting…"
            successText="All set! Redirecting…"
          />
        </form>
        <div className="mt-4 flex flex-wrap items-center justify-center gap-3 text-muted-foreground">
          <span className="text-xs">In partnership with Ron Stewart</span>
          <a
            href="https://www.youtube.com/@RonStewart_"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ron Stewart on YouTube"
            className="text-foreground/70 hover:text-foreground"
          >
            <Youtube className="h-5 w-5" />
          </a>
          <a
            href="https://x.com/RonStewart_"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Ron Stewart on X"
            className="text-foreground/70 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </a>
        </div>
      </div>
    </div>
  )
}



