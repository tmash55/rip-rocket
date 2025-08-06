"use client";

import { useState, useEffect } from "react";
import type { JSX } from "react";
import { useSearchParams, usePathname } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BarChart3, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import logo from "@/app/icon.png";
import config from "@/config";

const adpLinks: {
  href: string;
  label: string;
  shortLabel?: string;
  description: string;
  icon: any;
}[] = [
  {
    href: "/adp",
    label: "ADP Smashboard",
    shortLabel: "ADP",
    description: "Compare rankings across platforms",
    icon: BarChart3,
  },
  {
    href: "/adp/values",
    label: "Values & Busts",
    shortLabel: "Values",
    description: "Find hidden gems and avoid traps",
    icon: TrendingUp,
  },
];

const themeToggle: JSX.Element = <ThemeToggle />;

// A combined header with logo, ADP navigation, and theme toggle
const Header = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState<boolean>(false);

  // setIsOpen(false) when the route changes (i.e: when the user clicks on a link on mobile)
  useEffect(() => {
    setIsOpen(false);
  }, [searchParams]);

  return (
    <header className="bg-background border-b border-border sticky top-0 z-50 backdrop-blur-sm">
      <nav
        className="container flex items-center justify-between px-3 sm:px-4 lg:px-8 py-2 lg:py-3 mx-auto"
        aria-label="Global"
      >
        {/* Logo/name */}
        <div className="flex flex-1">
          <Link
            className="flex items-center gap-1.5 sm:gap-2 shrink-0"
            href="/"
            title={`${config.appName} homepage`}
          >
            
            <span className="font-extrabold text-sm sm:text-base">{config.appName}</span>
          </Link>
        </div>

        {/* ADP Navigation - Always visible, adapts to screen size */}
        <div className="flex justify-center gap-1.5 sm:gap-2 items-center mx-1 sm:mx-2">
          <TooltipProvider>
            {adpLinks.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              
              return (
                <Tooltip key={item.href} delayDuration={300}>
                  <TooltipTrigger asChild>
                    <Link href={item.href}>
                      <Button
                        variant={isActive ? 'default' : 'ghost'}
                        className={cn(
                          "h-8 sm:h-9 px-2 sm:px-3 flex items-center gap-1.5 transition-all duration-200",
                          isActive
                            ? "bg-primary text-primary-foreground shadow-md"
                            : "hover:bg-muted/60"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4 flex-shrink-0" />
                        <span className="font-medium text-xs sm:text-sm hidden xs:block">
                          {item.shortLabel || item.label}
                        </span>
                      </Button>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent 
                    side="bottom" 
                    className="hidden sm:block max-w-[200px]"
                    sideOffset={4}
                  >
                    <div className="text-sm font-medium mb-0.5">{item.label}</div>
                    <div className="text-xs text-foreground/80 dark:text-white/70">{item.description}</div>
                  </TooltipContent>
                </Tooltip>
              );
            })}
          </TooltipProvider>
        </div>

        {/* Theme toggle - Always visible */}
        <div className="flex justify-end flex-1">
          <ThemeToggle />
        </div>
      </nav>
    </header>
  );
};

export default Header;
