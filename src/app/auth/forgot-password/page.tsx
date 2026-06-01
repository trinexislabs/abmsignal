'use client'

import { useState } from 'react'
import Link from 'next/link'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Zap, Mail, ArrowLeft, ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email) return
    setLoading(true)
    try {
      // Use magic link as the password reset mechanism
      await signIn('resend', { email, redirect: false })
      router.push('/auth/verify-request')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#0B3D2E]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#10B981]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-white text-center">Reset your password</h1>
          <p className="text-[#9CA3AF] text-sm mt-2 text-center">
            We&apos;ll send a magic link so you can sign in and update your password.
          </p>
        </div>

        <div className="bg-[#111827] border border-[#374151] rounded-2xl p-8 space-y-5">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="reset-email" className="text-white text-sm font-medium">
                Email address
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" />
                <Input
                  id="reset-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="pl-10 h-11 bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF] focus-visible:border-[#10B981]/50 focus-visible:ring-[#10B981]/20 rounded-xl"
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading || !email}
              className="w-full h-11 bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold rounded-xl"
            >
              {loading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
                : <>Send reset link <ArrowRight className="w-4 h-4 ml-2" /></>}
            </Button>
          </form>
        </div>

        <Link
          href="/auth/signin"
          className="inline-flex items-center gap-1.5 mt-6 text-sm text-[#9CA3AF] hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to sign in
        </Link>
      </div>
    </div>
  )
}
