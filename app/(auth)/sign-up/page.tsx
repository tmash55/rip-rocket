"use client"

import { useEffect, Suspense } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

import { useAuth } from "@/components/providers/auth-provider"
import { motion } from "framer-motion"
import SignUpForm from "@/components/auth/SignUpForm"

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function SignUpPage() {
  const { user, loading } = useAuth()
  const router = useRouter()

  // Handle automatic redirect for newly authenticated users
  useEffect(() => {
    if (!loading && user) {
      // Check if user just signed up (indicated by pendingUserData in sessionStorage)
      const pendingUserData = sessionStorage.getItem('pendingUserData');
      if (pendingUserData) {
        // User just signed up, redirect to onboarding seamlessly
        router.push('/onboarding');
        return;
      }
      
      // Otherwise, this is an existing user who navigated to sign-up
      // We'll show them a message but not redirect automatically
    }
  }, [user, loading, router]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // If user is already authenticated and it's not a fresh sign-up
  if (user && !sessionStorage.getItem('pendingUserData')) {
    return (
      <motion.div 
        className="flex min-h-svh w-full items-center justify-center p-2 md:p-6 md:p-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full max-w-md text-center">
          <h2 className="text-2xl font-bold mb-4 text-white dark:text-white text-gray-900">You&apos;re already signed in!</h2>
          <p className="text-white/70 dark:text-white/70 text-gray-600 mb-6">
            You&apos;re already logged into your account.
          </p>
          <Link 
            href="/hit-rates" 
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
          >
            Let&apos;s Go!
          </Link>
        </div>
      </motion.div>
    )
  }

  return (
    <Suspense fallback={
      <div className="flex min-h-svh w-full items-stretch justify-center p-0 md:items-center md:p-6 md:p-10">
        <div className="w-full md:max-w-md flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500 mx-auto"></div>
            <p className="text-gray-600 dark:text-gray-400">Loading...</p>
          </div>
        </div>
      </div>
    }>
      <motion.div 
        className="flex min-h-svh w-full items-stretch justify-center p-0 md:items-center md:p-6 md:p-10"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="w-full md:max-w-md">
          <SignUpForm />
        </div>
      </motion.div>
    </Suspense>
  )
}