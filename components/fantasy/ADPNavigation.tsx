'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { BarChart3, TrendingUp } from 'lucide-react'

export default function ADPNavigation() {
  const pathname = usePathname()

  const navItems = [
    {
      href: '/adp',
      label: 'ADP Comparison',
      description: 'Compare rankings across platforms',
      icon: BarChart3,
      isActive: pathname === '/adp'
    },
    {
      href: '/adp/values',
      label: 'Values & Busts',
      description: 'Find hidden gems and avoid traps',
      icon: TrendingUp,
      isActive: pathname === '/adp/values'
    }
  ]

  return (
    <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
      <div className="container mx-auto px-4 py-3">
        <nav className="flex items-center gap-2">
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <Link key={item.href} href={item.href}>
                <Button
                  variant={item.isActive ? 'default' : 'ghost'}
                  className={cn(
                    "h-auto p-3 flex flex-col items-center gap-1 min-w-[120px] transition-all duration-200",
                    item.isActive 
                      ? "bg-primary text-primary-foreground shadow-md" 
                      : "hover:bg-muted/60"
                  )}
                >
                  <Icon className="w-4 h-4" />
                  <div className="text-center">
                    <div className="text-xs font-semibold">{item.label}</div>
                    <div className="text-[10px] opacity-75 hidden sm:block">
                      {item.description}
                    </div>
                  </div>
                </Button>
              </Link>
            )
          })}
        </nav>
      </div>
    </div>
  )
}