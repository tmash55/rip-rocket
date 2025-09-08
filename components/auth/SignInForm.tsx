"use client"

import type React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Separator } from "@/components/ui/separator"
import Link from "next/link"
import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { createClient } from "@/libs/supabase/client"
import { toast } from "sonner"
import { useAuth } from "@/components/providers/auth-provider"
import { Mail, Lock, Eye, EyeOff } from "lucide-react"
import { motion } from "framer-motion"
import Image from "next/image"

export default function SignInForm({ className, ...props }: React.ComponentPropsWithoutRef<"div">) {
  const [isLoading, setIsLoading] = useState(false)
  const [isGoogleLoading, setIsGoogleLoading] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()
  const searchParams = useSearchParams()
  const { signInWithGoogle } = useAuth()
  const supabase = createClient()

  // Show message from URL params (e.g., from sign-up)
  useEffect(() => {
    const message = searchParams.get("message")
    if (message) {
      toast.error("Email verification required")
    }
  }, [searchParams, toast])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (error) throw error

      if (data.user) {
        // Check if user needs onboarding
        const { data: preferences } = await supabase
          .from("user_preferences")
          .select("onboarding_completed")
          .eq("id", data.user.id)
          .single()

        toast.success("You have been signed in successfully.")

        // Check for redirect URL
        const redirectTo = searchParams.get("redirectTo")

        // Redirect based on onboarding status
        if (!preferences?.onboarding_completed) {
          // Store user data for onboarding
          sessionStorage.setItem(
            "pendingUserData",
            JSON.stringify({
              email: data.user.email,
              firstName: data.user.user_metadata?.first_name || "",
              needsOnboarding: true,
              redirectTo: redirectTo, // Store redirect URL for after onboarding
            }),
          )
          router.push("/onboarding")
        } else {
          // Use redirect URL if provided, otherwise default
          const destination = redirectTo || "/mlb/odds/player-props?market=home+runs"
          router.push(destination)
        }
        router.refresh()
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    setIsGoogleLoading(true)
    try {
      await signInWithGoogle()
      // The auth provider will handle the redirect
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "An error occurred")
    } finally {
      setIsGoogleLoading(false)
    }
  }

  return (
    <div className={cn("flex flex-col gap-6 w-full max-w-md mx-auto", className)} {...props}>
      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, type: "spring", stiffness: 100 }}
      >
        <Card className="shadow-2xl md:rounded-2xl rounded-none border-0 md:border min-h-screen md:min-h-0 flex flex-col justify-center relative overflow-hidden group">
          {/* Subtle animated background elements */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-20 -right-20 w-40 h-40 bg-gradient-to-br from-[#FF5A1F]/20 to-[#FF3D81]/20 rounded-full blur-2xl animate-pulse-slow"></div>
            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-gradient-to-tr from-[#7C5CFF]/20 to-[#FF3D81]/20 rounded-full blur-2xl animate-pulse-medium"></div>
            <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-plume opacity-[0.15] rounded-full blur-3xl animate-pulse-slow"></div>
          </div>

          <CardHeader className="text-center px-8 md:px-6 pt-12 md:pt-8 relative z-10">
            {/* Animated logo/icon */}
            <motion.div
              className="flex justify-center mb-6"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              <div className="relative">
                <motion.div 
                  className="w-20 h-20 md:w-16 md:h-16 bg-background border border-border rounded-2xl flex items-center justify-center shadow-lg group-hover:shadow-primary/25 p-3 md:p-2 relative"
                  animate={isLoading ? {
                    y: [0, -10, 0],
                    rotate: [-2, 2, -2],
                    scale: [1, 1.05, 1]
                  } : {}}
                  transition={isLoading ? {
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut"
                  } : {}}
                >
                  <motion.div
                    className="absolute -bottom-4 left-1/2 transform -translate-x-1/2 w-12 h-12 bg-plume rounded-full blur-xl opacity-0"
                    animate={isLoading ? {
                      opacity: [0, 0.5, 0],
                      scale: [0.8, 1.2, 0.8],
                    } : {}}
                    transition={isLoading ? {
                      duration: 1,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                  />
                  <motion.div 
                    className="relative"
                    animate={isLoading ? {
                      rotate: [0, -5, 5, 0]
                    } : {}}
                    transition={isLoading ? {
                      duration: 2,
                      repeat: Infinity,
                      ease: "easeInOut"
                    } : {}}
                  >
                    <Image
                      src="/icon.png"
                      alt="RipRocket Logo"
                      width={48}
                      height={48}
                      className="object-contain md:w-10 md:h-10"
                    />
                  </motion.div>
                </motion.div>
                {/* Subtle glow effect */}
                <div className="absolute inset-0 bg-primary/20 rounded-2xl blur-md opacity-0 group-hover:opacity-100 transition-opacity duration-300 -z-10"></div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
            >
              <CardTitle className="text-3xl md:text-2xl text-foreground mb-3 font-bold">
                Welcome Back
              </CardTitle>
              <CardDescription className="text-muted-foreground text-base md:text-sm">
                Sign in to your RipRocket account
              </CardDescription>
            </motion.div>
          </CardHeader>

          <CardContent className="space-y-8 px-8 md:px-6 pb-12 md:pb-8 relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
            >
              {/* Email/Password Form */}
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-3">
                  <Label
                    htmlFor="email"
                    className="text-foreground flex items-center gap-2 text-base font-medium"
                  >
                    <Mail className="w-5 h-5" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoading || isGoogleLoading}
                    className="h-14 text-base bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary transition-all duration-300 hover:bg-white/10 rounded-2xl"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label
                      htmlFor="password"
                      className="text-foreground flex items-center gap-2 text-base font-medium"
                    >
                      <Lock className="w-5 h-5" />
                      Password
                    </Label>
                    <Link
                      href="/forgot-password"
                      className="text-sm text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors duration-300 font-medium"
                    >
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      required
                      disabled={isLoading || isGoogleLoading}
                      className="h-14 text-base bg-white/5 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-primary pr-12 transition-all duration-300 hover:bg-white/10 rounded-2xl"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-4 py-2 hover:bg-transparent rounded-2xl"
                      onClick={() => setShowPassword(!showPassword)}
                      disabled={isLoading || isGoogleLoading}
                    >
                      {showPassword ? (
                        <EyeOff className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-300" />
                      ) : (
                        <Eye className="h-5 w-5 text-muted-foreground hover:text-foreground transition-colors duration-300" />
                      )}
                      <span className="sr-only">{showPassword ? "Hide password" : "Show password"}</span>
                    </Button>
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full h-14 text-base font-semibold bg-plume text-white shadow-lg hover:shadow-primary/25 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-2xl"
                  disabled={isLoading || isGoogleLoading}
                >
                  {isLoading ? (
                    <div className="flex items-center gap-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                      Signing in...
                    </div>
                  ) : (
                    "Sign In"
                  )}
                </Button>
              </form>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              <div className="flex items-center gap-4">
                <Separator className="flex-1 bg-border" />
                <span className="text-sm font-medium text-muted-foreground uppercase tracking-wide">
                  or continue with
                </span>
                <Separator className="flex-1 bg-border" />
              </div>

              {/* Google Sign In */}
              <Button
                type="button"
                variant="outline"
                onClick={handleGoogleSignIn}
                disabled={isGoogleLoading || isLoading}
                className="w-full h-14 text-base font-semibold mt-6 border-2 border-border text-foreground hover:bg-white/10 relative transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] rounded-2xl bg-transparent"
              >
                {isGoogleLoading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-foreground"></div>
                ) : (
                  <>
                    <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                      <path
                        fill="currentColor"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="currentColor"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="currentColor"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                    Continue with Google
                  </>
                )}
              </Button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6, duration: 0.5 }}
              className="text-center text-base text-muted-foreground"
            >
              Don&apos;t have an account?{" "}
              <Link
                href="/sign-up"
                className="text-primary hover:text-primary/80 underline-offset-4 hover:underline font-semibold transition-colors duration-300"
              >
                Sign up for free
              </Link>
            </motion.div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}