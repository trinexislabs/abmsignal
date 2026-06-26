'use client'

import { useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'
import { Zap, Mail, ArrowRight, Loader2, MailCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-4 h-4" aria-hidden>
      <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
      <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
      <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" />
      <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
    </svg>
  )
}

export default function SignUpPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [sent, setSent] = useState(false)

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOtp({
        email,
        // Creates the account if new, then logs in via the emailed link.
        // Uses the stock Supabase email template (ConfirmationURL → /auth/callback).
        options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
      })
      if (error) {
        toast.error(error.message ?? 'Could not send the sign-up link.')
      } else {
        setSent(true)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: `${window.location.origin}/auth/callback?next=/dashboard` },
    })
    if (error) {
      toast.error('Google sign-in is not available yet.')
      setGoogleLoading(false)
    }
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
          <h1 className="font-heading text-3xl font-bold text-white text-center">Create your account</h1>
          <p className="text-[#9CA3AF] text-sm mt-2 text-center">
            Enter your email — we&apos;ll send a secure link to get started. No password needed.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-8 space-y-5">
          {sent ? (
            <div className="flex flex-col items-center text-center py-4 space-y-3">
              <div className="w-12 h-12 rounded-xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
                <MailCheck className="w-6 h-6 text-[#10B981]" />
              </div>
              <h2 className="text-white font-semibold">Check your email</h2>
              <p className="text-sm text-[#9CA3AF]">
                We sent a secure link to <span className="text-white">{email}</span>.
                Click it to finish creating your account.
              </p>
              <button onClick={() => setSent(false)} className="text-xs text-[#10B981] hover:text-[#10B981]/80 mt-2">
                Use a different email
              </button>
            </div>
          ) : (
            <>
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

              <form onSubmit={handleSignUp} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-email" className="text-white text-sm font-medium">Work email</Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                      className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-[#10B981]/50 focus-visible:ring-[#10B981]/20 rounded-xl"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-[#9CA3AF] leading-relaxed">
                  No card required to sign up. After your first playbook is generated you can
                  unlock it for a one-off fee or subscribe to Growth.
                </p>

                <Button
                  type="submit"
                  disabled={loading || !email.trim()}
                  className="w-full h-11 bg-[#10B981] hover:bg-[#059669] text-white font-semibold rounded-xl"
                >
                  {loading ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                  ) : (
                    <>Send sign-up link <ArrowRight className="w-4 h-4 ml-2" /></>
                  )}
                </Button>

                <p className="text-[11px] text-[#9CA3AF] text-center leading-relaxed">
                  By continuing you agree to our{' '}
                  <a href="/terms" className="text-[#10B981] hover:underline">Terms</a>{' '}and{' '}
                  <a href="/privacy" className="text-[#10B981] hover:underline">Privacy Policy</a>.
                </p>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-sm text-[#9CA3AF] mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#10B981] hover:text-[#10B981]/80 font-medium">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
