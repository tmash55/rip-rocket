"use client"

import { useEffect, useMemo, useState } from "react"
import Image from "next/image"
import { X } from "lucide-react"
import { useIsMobile } from "@/hooks/use-mobile"

type Placement = "footer" | "sidebar"

const DISMISS_KEY = "oddsmash_promo_dismissed_v1"

export default function OddSmashPromo() {
  const isMobile = useIsMobile()
  const [isDismissed, setIsDismissed] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  const placement: Placement = useMemo(
    () => (isMobile ? "footer" : "sidebar"),
    [isMobile]
  )

  useEffect(() => {
    setHasMounted(true)
    try {
      const stored = localStorage.getItem(DISMISS_KEY)
      setIsDismissed(stored === "1")
    } catch {}
  }, [])

  const handleDismiss = () => {
    setIsDismissed(true)
    try {
      localStorage.setItem(DISMISS_KEY, "1")
    } catch {}
  }

  if (!hasMounted || isDismissed) return null

  return (
    <div
      className={
        placement === "footer"
          ? "fixed inset-x-0 bottom-0 z-[60] px-3 pb-3"
          : "fixed right-4 bottom-4 z-[60]"
      }
    >
      <div
        className={
          placement === "footer"
            ? "mx-auto max-w-3xl shadow-lg border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 rounded-xl"
            : "w-[320px] shadow-lg border border-border bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/80 rounded-xl"
        }
      >
        <div className="p-3 sm:p-4">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg overflow-hidden ring-1 ring-border bg-background">
              <Image
                src="/oddsmash/oddsmash.png"
                alt="OddSmash logo"
                width={40}
                height={40}
                className="object-contain"
              />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h4 className="text-sm sm:text-base font-semibold leading-tight">
                    Want to see the betting side of these values?
                  </h4>
                  <p className="mt-1 text-xs sm:text-sm text-muted-foreground">
                    Explore advanced betting analytics on OddSmash.
                  </p>
                </div>
                <button
                  aria-label="Dismiss OddSmash promotion"
                  onClick={handleDismiss}
                  className="rounded-md p-1 text-muted-foreground hover:text-foreground hover:bg-muted"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <a
                  href="https://oddsmash.io"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center rounded-md px-3 py-2 text-xs sm:text-sm font-medium text-white focus:outline-none focus:ring-2 focus:ring-ring bg-[hsl(142_76%_36%)] hover:bg-[hsl(142_76%_32%)]"
                >
                  Check out OddSmash
                </a>
                <span className="text-[10px] sm:text-xs text-muted-foreground">
                  Clean. Fast. Data-driven.
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}


