'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { signIn } from 'next-auth/react'
import { toast } from 'sonner'
import { Zap, Mail, Lock, User, ArrowRight, Loader2, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'

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

const PLAN_OPTIONS = [
  {
    id: 'one_off',
    name: 'One Off',
    price: `$${ONE_OFF_PRICE_USD}`,
    period: 'one-time',
    sub: 'Per playbook · no subscription',
    highlight: false,
    features: ['Full playbook generation', 'PDF export', 'Email support'],
  },
  {
    id: 'growth',
    name: 'Growth',
    price: `$${GROWTH_PRICE_USD}`,
    period: '/mo',
    sub: '10 playbooks / month',
    highlight: true,
    features: ['Everything in One Off', '10 playbooks / month', 'Full dashboard & history'],
  },
]

function PlanCard({
  plan,
  selected,
  onSelect,
}: {
  plan: (typeof PLAN_OPTIONS)[number]
  selected: boolean
  onSelect: () => void
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={`relative p-4 rounded-xl border text-left transition-all w-full ${
        selected
          ? 'border-[#339af0]/60 bg-[#1e3a5f]/30 shadow-[0_0_12px_rgba(51,154,240,0.15)]'
          : 'border-white/[0.08] bg-[#0d0d15] hover:border-white/20'
      }`}
    >
      {plan.highlight && (
        <span className="absolute -top-2.5 left-3 text-[9px] font-bold bg-[#339af0] text-white px-2 py-0.5 rounded-full uppercase tracking-wide">
          Most Popular
        </span>
      )}
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="text-sm font-semibold text-white mb-0.5">{plan.name}</div>
          <div className="flex items-baseline gap-0.5">
            <span className="text-base font-bold text-[#339af0]">{plan.price}</span>
            <span className="text-[11px] text-[#a1a1aa]">{plan.period}</span>
          </div>
          <div className="text-[11px] text-[#a1a1aa] mt-0.5">{plan.sub}</div>
        </div>
        <div
          className={`w-4 h-4 rounded-full border flex items-center justify-center flex-shrink-0 mt-0.5 transition-colors ${
            selected ? 'border-[#339af0] bg-[#339af0]' : 'border-white/20'
          }`}
        >
          {selected && <Check className="w-2.5 h-2.5 text-white" strokeWidth={3} />}
        </div>
      </div>
      <ul className="mt-2.5 space-y-1">
        {plan.features.map((f) => (
          <li key={f} className="text-[11px] text-[#a1a1aa] flex items-center gap-1.5">
            <span className="w-1 h-1 rounded-full bg-[#339af0]/60 flex-shrink-0" />
            {f}
          </li>
        ))}
      </ul>
    </button>
  )
}

function SignUpForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const preselectedPlan = searchParams.get('plan') ?? 'growth'
  const initialPlan = ['one_off', 'growth'].includes(preselectedPlan) ? preselectedPlan : 'growth'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [selectedPlan, setSelectedPlan] = useState(initialPlan)
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const isValid = name.trim() && email.trim() && password.length >= 8

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault()
    if (!isValid) return
    setLoading(true)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, plan: selectedPlan }),
      })
      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Registration failed')
        return
      }
      const signInRes = await signIn('credentials', { email, password, redirect: false })
      if (signInRes?.error) {
        toast.error('Account created. Please sign in.')
        router.push('/auth/signin')
        return
      }
      // Growth users must pay the $299/month subscription before reaching the
      // dashboard. one_off users land on /dashboard and only see the $49 gate
      // when they click "Generate Playbook".
      if (selectedPlan === 'growth') {
        router.push(`/payment/mock?purpose=plan&plan=growth&amount=${GROWTH_PRICE_USD}`)
      } else {
        router.push('/dashboard')
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleGoogle() {
    setGoogleLoading(true)
    // OAuth users land on /onboarding/plan to pick their plan
    await signIn('google', { callbackUrl: '/onboarding/plan' })
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] bg-[#1e3a5f]/15 rounded-full blur-[100px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Link href="/" className="flex items-center gap-2.5 group mb-6">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center group-hover:border-[#339af0]/60 transition-colors">
              <Zap className="w-5 h-5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-xl text-white">ABMSignal</span>
          </Link>
          <h1 className="font-heading text-3xl font-bold text-white text-center">Create your account</h1>
          <p className="text-[#a1a1aa] text-sm mt-2 text-center">Choose your plan to get started.</p>
        </div>

        <div className="bg-[#141419] border border-white/[0.08] rounded-2xl p-8 space-y-5">
          <Button
            onClick={handleGoogle}
            disabled={googleLoading}
            variant="outline"
            className="w-full h-11 bg-white/5 border-white/[0.08] text-white hover:bg-white/10 hover:border-white/20 rounded-xl gap-2.5 font-medium"
          >
            {googleLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GoogleIcon />}
            Continue with Google
          </Button>

          <div className="flex items-center gap-3">
            <div className="flex-1 h-px bg-white/[0.06]" />
            <span className="text-[11px] text-[#a1a1aa] uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/[0.06]" />
          </div>

          <form onSubmit={handleSignUp} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="full-name" className="text-white text-sm font-medium">Full name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a1a1aa] pointer-events-none" />
                <Input
                  id="full-name"
                  type="text"
                  placeholder="Alex Johnson"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  autoComplete="name"
                  className="pl-10 h-11 bg-[#0d0d15] border-white/[0.08] text-white placeholder:text-[#a1a1aa] focus-visible:border-[#339af0]/50 focus-visible:ring-[#339af0]/20 rounded-xl"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="signup-email" className="text-white text-sm font-medium">Work email</Label>
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

            <div className="space-y-2">
              <Label htmlFor="signup-password" className="text-white text-sm font-medium">Password</Label>
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

            <div className="space-y-2">
              <Label className="text-white text-sm font-medium">Choose your plan</Label>
              <div className="grid grid-cols-2 gap-3">
                {PLAN_OPTIONS.map((plan) => (
                  <PlanCard
                    key={plan.id}
                    plan={plan}
                    selected={selectedPlan === plan.id}
                    onSelect={() => setSelectedPlan(plan.id)}
                  />
                ))}
              </div>
              <p className="text-[11px] text-[#a1a1aa]">
                {selectedPlan === 'growth'
                  ? `You'll be charged $${GROWTH_PRICE_USD}/month right after sign-up — 10 playbooks per 30-day cycle.`
                  : `No charge today — pay $${ONE_OFF_PRICE_USD} per playbook when you generate one.`}
              </p>
            </div>

            <Button
              type="submit"
              disabled={loading || !isValid}
              className="w-full h-11 bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold rounded-xl"
            >
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Creating account...</>
              ) : (
                <>Create account <ArrowRight className="w-4 h-4 ml-2" /></>
              )}
            </Button>

            <p className="text-[11px] text-[#a1a1aa] text-center leading-relaxed">
              By creating an account you agree to our{' '}
              <a href="/terms" className="text-[#339af0] hover:underline">Terms</a>{' '}
              and{' '}
              <a href="/privacy" className="text-[#339af0] hover:underline">Privacy Policy</a>.
            </p>
          </form>
        </div>

        <p className="text-center text-sm text-[#a1a1aa] mt-6">
          Already have an account?{' '}
          <Link href="/auth/signin" className="text-[#339af0] hover:text-[#339af0]/80 font-medium">
            Sign in →
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function SignUpPage() {
  return (
    <Suspense>
      <SignUpForm />
    </Suspense>
  )
}
