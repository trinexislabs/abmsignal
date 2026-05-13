'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, Mail, Lock, User, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: '$299/mo',
    playbooks: '2 playbooks/mo',
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$799/mo',
    playbooks: '5 playbooks/mo',
    highlight: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    price: '$1,999/mo',
    playbooks: '15 playbooks/mo',
    highlight: false,
  },
]

export default function SignUpPage() {
  const router = useRouter()
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState<string>('growth')
  const [loading, setLoading] = useState(false)

  const isValid = fullName.trim() && email.trim() && password.length >= 8

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    toast('Demo mode: authentication is simulated', {
      description: 'Creating your account and redirecting...',
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
          <h1 className="font-heading text-3xl font-bold text-white text-center">
            Create your account
          </h1>
          <p className="text-[#a1a1aa] text-sm mt-2 text-center">
            14-day free trial · No credit card required
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#141419] border border-white/[0.08] rounded-2xl p-8 space-y-6">
          <form onSubmit={handleSignUp} className="space-y-5">
            {/* Full name */}
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-white text-sm font-medium">
                Full name
              </Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  autoComplete="name"
                  className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                />
              </div>
            </div>

            {/* Email */}
            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-white text-sm font-medium">
                Work email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-white text-sm font-medium">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="Min. 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={8}
                  autoComplete="new-password"
                  className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                />
              </div>
              {password.length > 0 && password.length < 8 && (
                <p className="text-xs text-red-400">Password must be at least 8 characters</p>
              )}
            </div>

            {/* Plan selector */}
            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">Select your plan</Label>
              <div className="grid grid-cols-3 gap-2">
                {plans.map((plan) => (
                  <button
                    key={plan.id}
                    type="button"
                    onClick={() => setSelectedPlan(plan.id)}
                    className={`relative p-3 rounded-xl border text-left transition-all ${
                      selectedPlan === plan.id
                        ? 'border-[#339af0]/60 bg-[#1e3a5f]/30'
                        : 'border-white/[0.08] bg-[#0d0d15] hover:border-white/20'
                    }`}
                  >
                    {plan.highlight && selectedPlan === plan.id && (
                      <div className="absolute -top-2 left-1/2 -translate-x-1/2">
                        <span className="text-[9px] font-bold bg-[#339af0] text-white px-1.5 py-0.5 rounded-full whitespace-nowrap">
                          POPULAR
                        </span>
                      </div>
                    )}
                    <div className="flex items-start justify-between gap-1 mb-1">
                      <span className="text-xs font-semibold text-white">{plan.name}</span>
                      {selectedPlan === plan.id && (
                        <CheckCircle2 className="w-3.5 h-3.5 text-[#339af0] shrink-0 mt-px" />
                      )}
                    </div>
                    <div className="text-[10px] text-[#339af0] font-medium">{plan.price}</div>
                    <div className="text-[10px] text-[#a1a1aa] mt-0.5">{plan.playbooks}</div>
                  </button>
                ))}
              </div>
              <p className="text-xs text-[#a1a1aa]">
                14-day free trial on all plans.{' '}
                <a href="#pricing" className="text-[#339af0] hover:underline">
                  Compare plans →
                </a>
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-11 bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold rounded-xl disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Creating account...
                </>
              ) : (
                <>
                  Create account
                  <ArrowRight className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            <p className="text-[11px] text-[#a1a1aa] text-center leading-relaxed">
              By creating an account, you agree to our{' '}
              <a href="#" className="text-[#339af0] hover:underline">
                Terms of Service
              </a>{' '}
              and{' '}
              <a href="#" className="text-[#339af0] hover:underline">
                Privacy Policy
              </a>
              .
            </p>
          </form>
        </div>

        {/* Sign in link */}
        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          Already have an account?{' '}
          <Link
            href="/auth/signin"
            className="text-[#339af0] hover:text-[#339af0]/80 font-medium transition-colors"
          >
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}
