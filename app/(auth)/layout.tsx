'use client';

import { ReactNode } from 'react';
import { AnimatePresence } from 'framer-motion';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';

export default function AuthLayout({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const isOnboarding = pathname === '/onboarding';

  // For onboarding, use a simple full-screen layout
  if (isOnboarding) {
    return (
      <div className="min-h-screen">
        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </div>
    );
  }

  // For other auth pages (sign-in, sign-up), use the constrained layout
  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Subtle branded background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary gradient orb (Rocket Orange) */}
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF3D81]/20 rounded-full blur-3xl animate-pulse-slow"></div>
        
        {/* Secondary gradient orb (Ion Violet) */}
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-[#7C5CFF]/20 to-[#FF3D81]/20 rounded-full blur-3xl animate-pulse-medium"></div>
        
        {/* Accent gradient orb (Plume Gradient) */}
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-plume opacity-[0.15] rounded-full blur-3xl animate-pulse-slow"></div>
        
        {/* Subtle dot pattern using border color */}
        <div 
          className="absolute inset-0 opacity-30 dark:opacity-20"
          style={{
            backgroundImage: `radial-gradient(circle, hsl(var(--border)) 1px, transparent 1px)`,
            backgroundSize: '20px 20px'
          }}
        ></div>
      </div>

      {/* Content layer */}
      <div className="h-full flex items-center justify-center py-0 px-0 md:py-12 md:px-4 relative z-10">
        {/* Header with logo and social - Hidden on mobile */}
        

        <AnimatePresence mode="wait">
          {children}
        </AnimatePresence>
      </div>
    </div>
  );
}