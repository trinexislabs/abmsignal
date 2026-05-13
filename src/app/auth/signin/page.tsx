'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

export default function SignInPage() {
  const router = useRouter()
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [passwordEmail, setPasswordEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!magicLinkEmail) return
    setLoading(true)
    toast('Demo mode: authentication is simulated', {
      description: 'Redirecting you to the dashboard...',
    })
    await new Promise((r) => setTimeout(r, 1000))
    router.push('/dashboard')
  }

  async function handlePasswordSignIn(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordEmail || !password) return
    setLoading(true)
    toast('Demo mode: authentication is simulated', {
      description: 'Redirecting you to the dashboard...',
    })
    await new Promise((r) => setTimeout(r, 1000))
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-16">
      {/* Background glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#1e3a5f]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center group-hover:border-[#339af0]/60 transition-colors">
              <Zap className="w-5 h-5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-white text-center">Welcome back</h1>
          <p className="text-[#a1a1aa] text-sm mt-2 text-center">
            Sign in to your ABMSignal account
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141419] border border-white/[0.08] rounded-2xl p-8">
          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="w-full mb-6 bg-[#0d0d15] border border-white/[0.06] rounded-xl p-1">
              <TabsTrigger
                value="magic-link"
                className="flex-1 rounded-lg text-sm data-active:bg-[#1e3a5f] data-active:text-white data-active:border-[#339af0]/20"
              >
                Magic Link
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="flex-1 rounded-lg text-sm data-active:bg-[#1e3a5f] data-active:text-white data-active:border-[#339af0]/20"
              >
                Password
              </TabsTrigger>
            </TabsList>

            {/* Magic link tab */}
            <TabsContent value="magic-link">
              <form onSubmit={handleMagicLink} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-white text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@company.com"
                      value={magicLinkEmail}
                      onChange={(e) => setMagicLinkEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !magicLinkEmail}
                  className="w-full h-11 bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending...
                    </>
                  ) : (
                    <>
                      Send magic link
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>

                <p className="text-xs text-[#a1a1aa] text-center">
                  We&apos;ll email you a secure sign-in link. No password required.
                </p>
              </form>
            </TabsContent>

            {/* Password tab */}
            <TabsContent value="password">
              <form onSubmit={handlePasswordSignIn} className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="password-email" className="text-white text-sm font-medium">
                    Email address
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                    <Input
                      id="password-email"
                      type="email"
                      placeholder="you@company.com"
                      value={passwordEmail}
                      onChange={(e) => setPasswordEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="password" className="text-white text-sm font-medium">
                      Password
                    </Label>
                    <a
                      href="#"
                      className="text-xs text-[#339af0] hover:text-[#339af0]/80 transition-colors"
                    >
                      Forgot password?
                    </a>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                    <Input
                      id="password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={loading || !passwordEmail || !password}
                  className="w-full h-11 bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold rounded-xl disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign in
                      <ArrowRight className="w-4 h-4 ml-2" />
                    </>
                  )}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        {/* Sign up link */}
        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          Don&apos;t have an account?{' '}
          <Link
            href="/auth/signup"
            className="text-[#339af0] hover:text-[#339af0]/80 font-medium transition-colors"
          >
            Start free trial →
          </Link>
        </p>
      </div>
    </div>
  )
}
