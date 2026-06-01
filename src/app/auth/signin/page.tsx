'use client'

import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Zap, Mail, Lock, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path
        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
        fill="#4285F4"
      />
      <path
        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
        fill="#34A853"
      />
      <path
        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
        fill="#EA4335"
      />
    </svg>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get('callbackUrl') ?? '/dashboard'

  const [magicEmail, setMagicEmail] = useState('')
  const [passwordEmail, setPasswordEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  async function handleMagicLink(e: React.FormEvent) {
    e.preventDefault()
    if (!magicEmail) return
    setLoading(true)
    try {
      const res = await signIn('resend', { email: magicEmail, redirect: false })
      if (res?.error) {
        toast.error('Could not send magic link. Check your email address.')
      } else {
        router.push('/auth/verify-request')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handlePassword(e: React.FormEvent) {
    e.preventDefault()
    if (!passwordEmail || !password) return
    setLoading(true)
    try {
      const res = await signIn('credentials', {
        email: passwordEmail,
        password,
        redirect: false,
      })
      if (res?.error) {
        toast.error('Invalid email or password.')
      } else {
        router.push(callbackUrl)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    await signIn('google', { callbackUrl })
  }

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#0B3D2E]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center group-hover:border-[#10B981]/60 transition-colors">
              <Zap className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-white text-center">Welcome back</h1>
          <p className="text-[#9CA3AF] text-sm mt-2 text-center">Sign in to your ABMSignal account</p>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-8 space-y-5">
          {/* Google */}
          <Button
            onClick={handleGoogle}
            disabled={googleLoading}
            variant="outline"
            className="w-full h-11 bg-white/5 border-[#374151] text-white hover:bg-white/10 hover:border-[#374151]/60 rounded-xl gap-2.5 font-medium"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-[#9CA3AF] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <Tabs defaultValue="magic-link" className="w-full">
            <TabsList className="w-full mb-5 bg-[#0B0F13] border border-[#374151] rounded-xl p-1">
              <TabsTrigger
                value="magic-link"
                className="flex-1 rounded-lg text-sm data-[state=active]:bg-[#0B3D2E] data-[state=active]:text-white"
              >
                Magic Link
              </TabsTrigger>
              <TabsTrigger
                value="password"
                className="flex-1 rounded-lg text-sm data-[state=active]:bg-[#0B3D2E] data-[state=active]:text-white"
              >
                Password
              </TabsTrigger>
            </TabsList>

            <TabsContent value="magic-link">
              <form onSubmit={handleMagicLink} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="magic-email" className="text-white text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input
                      id="magic-email"
                      type="email"
                      placeholder="you@company.com"
                      value={magicEmail}
                      onChange={(e) => setMagicEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-[#10B981]/50 focus-visible:ring-[#10B981]/20 rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !magicEmail}
                  className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</> : <>Send magic link <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
                <p className="text-xs text-[#9CA3AF] text-center">We&apos;ll email you a secure sign-in link. No password required.</p>
              </form>
            </TabsContent>

            <TabsContent value="password">
              <form onSubmit={handlePassword} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="pw-email" className="text-white text-sm font-medium">Email address</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input
                      id="pw-email"
                      type="email"
                      placeholder="you@company.com"
                      value={passwordEmail}
                      onChange={(e) => setPasswordEmail(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-[#10B981]/50 focus-visible:ring-[#10B981]/20 rounded-xl"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="pw-password" className="text-white text-sm font-medium">Password</Label>
                    <Link href="/auth/forgot-password" className="text-xs text-[#10B981] hover:text-[#10B981]/80">
                      Forgot password?
                    </Link>
                  </div>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input
                      id="pw-password"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-[#10B981]/50 focus-visible:ring-[#10B981]/20 rounded-xl"
                    />
                  </div>
                </div>
                <Button
                  type="submit"
                  disabled={loading || !passwordEmail || !password}
                  className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl"
                >
                  {loading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Signing in...</> : <>Sign in <ArrowRight className="w-4 h-4 ml-2" /></>}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </div>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/auth/signup" className="text-[#10B981] hover:text-[#10B981]/80 font-medium">
            Create one →
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignInPage() {
  return (
    <Suspense>
      <SignInForm />
    </Suspense>
  )
}
