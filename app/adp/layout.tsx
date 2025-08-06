import React, { Suspense } from "react"
import { Skeleton } from "@/components/ui/skeleton"
export default function ADPLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<div className="p-8"><Skeleton className="w-full h-[600px] rounded-xl" /></div>}>
        {children}
      </Suspense>
    </div>
  )
}