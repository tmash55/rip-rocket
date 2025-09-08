// app/auth/sign-in/page.tsx

'use client';


import SignInForm from "@/components/auth/SignInForm";
import { motion } from "framer-motion";
import { Suspense } from "react";

// Force dynamic rendering for this page
export const dynamic = 'force-dynamic'

export default function SignInPage() {
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
          <SignInForm />
        </div>
      </motion.div>
    </Suspense>
  );
}