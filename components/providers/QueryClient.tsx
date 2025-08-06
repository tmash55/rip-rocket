'use client'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'


export default function Providers({ children }: { children: React.ReactNode }) {

  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        gcTime: 1000 * 60 * 60, // 1 hour
      },
    },
  }))



  return (
    <QueryClientProvider client={queryClient}>

              {children}

    </QueryClientProvider>
  )
} 