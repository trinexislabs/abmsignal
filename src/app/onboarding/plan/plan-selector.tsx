'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, ArrowRight, Loader2, Check, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'

const PLANS = [
  {
    id: 'one_off',
    name: 'One Off',
    price: `$${ONE_OFF_PRICE_USD}`,
    period: 'per playbook',
    tagline: 'No subscription. Pay when you need.',
    icon: Sparkles,
    color: 'white',
    features: [
      'Full 18-section ABM playbook',
      'Verified contacts',
      'PDF export',
      'Email support',
    ],
    badge: null,
    highlight: false,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: `$${GROWTH_PRICE_USD}`,
    period: '/month',
    tagline: '10 playbooks per month, full dashboard.',
    icon: TrendingUp,
    color: '#10B981',
    features: [
      'Everything in One Off',
      '10 playbooks / month',
      'Full stats dashboard',
      'Playbook history',
    ],
    badge: 'Most Popular',
    highlight: true,
  },
]

export function PlanSelector({ firstName }: { firstName: string }) {
  const router = useRouter()
  const [selectedPlan, setSelectedPlan] = useState<string>('growth')
  const [loading, setLoading] = useState(false)

  async function handleConfirm() {
    setLoading(true)
    try {
      // Growth = monthly subscription, billed upfront via the mock gateway.
      // The /api/payment/mock endpoint activates the plan on payment success.
      if (selectedPlan === 'growth') {
        router.push(`/payment/mock?purpose=plan&plan=growth&amount=${GROWTH_PRICE_USD}`)
        return
      }

      // one_off = no upfront charge; just record the plan choice. Payment
      // happens later, once per playbook generation.
      const res = await fetch('/api/user/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan: selectedPlan }),
      })
      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Failed to save plan')
        return
      }
      router.push('/dashboard')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#0B3D2E]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center mb-5">
            <Zap className="w-6 h-6 text-[#10B981]" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white text-center">
            Welcome, {firstName}!
          </h1>
          <p className="text-[#9CA3AF] text-sm mt-2 text-center max-w-sm">
            Choose how you&apos;d like to use ABMSignal. You can change this anytime from Settings.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-5 mb-8">
          {PLANS.map((plan) => {
            const Icon = plan.icon
            const selected = selectedPlan === plan.id
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setSelectedPlan(plan.id)}
                className={`relative p-6 rounded-2xl border text-left transition-all ${
                  selected
                    ? 'border-[#10B981]/60 bg-[#0B3D2E]/25 shadow-[0_0_24px_rgba(16,185,129,0.15)]'
                    : 'border-[#374151] bg-[#111827] hover:border-[#374151]/60'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold bg-[#10B981] text-white px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-[#0B3D2E] border-[#10B981]/40'
                        : 'bg-white/5 border-[#374151]'
                    }`}
                  >
                    <Icon className="w-5 h-5" style={{ color: selected ? '#10B981' : '#9CA3AF' }} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selected ? 'border-[#10B981] bg-[#10B981]' : 'border-[#374151]/60'
                    }`}
                  >
                    {selected && <Check className="w-3 h-3 text-white" strokeWidth={3} />}
                  </div>
                </div>

                <div className="mb-1">
                  <span className="font-heading font-bold text-white text-lg">{plan.name}</span>
                </div>
                <div className="flex items-baseline gap-1 mb-1">
                  <span className="font-heading text-3xl font-bold text-white">{plan.price}</span>
                  <span className="text-sm text-[#9CA3AF]">{plan.period}</span>
                </div>
                <p className="text-xs text-[#9CA3AF] mb-4">{plan.tagline}</p>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#9CA3AF]">
                      <Check
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: selected ? '#10B981' : '#9CA3AF' }}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </button>
            )
          })}
        </div>

        <div className="flex flex-col items-center gap-3">
          <Button
            onClick={handleConfirm}
            disabled={loading}
            size="lg"
            className="bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold px-10 h-12 text-base rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.3)]"
          >
            {loading ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
            ) : (
              <>
                Continue with {PLANS.find((p) => p.id === selectedPlan)?.name}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
          <p className="text-xs text-[#9CA3AF]">
            {selectedPlan === 'growth'
              ? `You'll be charged $${GROWTH_PRICE_USD}/month upfront on the next step.`
              : `No charge today — you'll pay $${ONE_OFF_PRICE_USD} per playbook when you generate one.`}
          </p>
        </div>
      </div>
    </div>
  )
}
