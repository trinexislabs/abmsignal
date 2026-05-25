'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Zap, ArrowRight, Loader2, Check, Sparkles, TrendingUp } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ONE_OFF_PRICE_USD } from '@/lib/pricing'

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
    price: '$299',
    period: '/month',
    tagline: '10 playbooks per month, full dashboard.',
    icon: TrendingUp,
    color: '#339af0',
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
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center px-4 py-16">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#1e3a5f]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-2xl">
        <div className="flex flex-col items-center mb-10">
          <div className="w-12 h-12 rounded-2xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center mb-5">
            <Zap className="w-6 h-6 text-[#339af0]" />
          </div>
          <h1 className="font-heading text-3xl font-bold text-white text-center">
            Welcome, {firstName}!
          </h1>
          <p className="text-[#a1a1aa] text-sm mt-2 text-center max-w-sm">
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
                    ? 'border-[#339af0]/60 bg-[#1e3a5f]/25 shadow-[0_0_24px_rgba(51,154,240,0.15)]'
                    : 'border-white/[0.08] bg-[#141419] hover:border-white/20'
                }`}
              >
                {plan.badge && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="text-[10px] font-bold bg-[#339af0] text-white px-3 py-1 rounded-full uppercase tracking-wider whitespace-nowrap">
                      {plan.badge}
                    </span>
                  </div>
                )}

                <div className="flex items-start justify-between mb-4">
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center transition-colors ${
                      selected
                        ? 'bg-[#1e3a5f] border-[#339af0]/40'
                        : 'bg-white/5 border-white/10'
                    }`}
                  >
                    <Icon className="w-5 h-5" style={{ color: selected ? '#339af0' : '#a1a1aa' }} />
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                      selected ? 'border-[#339af0] bg-[#339af0]' : 'border-white/20'
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
                  <span className="text-sm text-[#a1a1aa]">{plan.period}</span>
                </div>
                <p className="text-xs text-[#a1a1aa] mb-4">{plan.tagline}</p>

                <ul className="space-y-2">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                      <Check
                        className="w-3.5 h-3.5 flex-shrink-0"
                        style={{ color: selected ? '#339af0' : '#a1a1aa' }}
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
            className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold px-10 h-12 text-base rounded-xl shadow-[0_0_20px_rgba(51,154,240,0.3)]"
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
          <p className="text-xs text-[#a1a1aa]">Billing activates when you generate your first playbook.</p>
        </div>
      </div>
    </div>
  )
}
