'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Lock, Loader2, ShieldCheck, Sparkles } from 'lucide-react'

interface Props {
  playbookId: string
  oneOffPrice: number
  growthPrice: number
  sectionsCount: number
  contactsCount: number
  // True when the viewer already holds an active Growth subscription — they're
  // over their 10/cycle quota, so we only offer the $29 overage unlock.
  isGrowthSubscriber?: boolean
  cycleResetsAt?: string
  // Kept for API compatibility; with hosted checkout we redirect away and the
  // page reveals content on the ?paid=1 return.
  onUnlocked?: () => void
}

type Choice = 'one_off' | 'growth'

export function PlaybookPaywall({
  playbookId,
  oneOffPrice,
  growthPrice,
  sectionsCount,
  contactsCount,
  isGrowthSubscriber = false,
  cycleResetsAt,
}: Props) {
  const [loading, setLoading] = useState<Choice | null>(null)

  async function startCheckout(choice: Choice) {
    if (loading) return
    setLoading(choice)
    try {
      const purpose = choice === 'growth' ? 'subscription' : 'unlock'
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, playbookId }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout')
        setLoading(null)
        return
      }
      // Hand off to Lemon Squeezy's hosted, PCI-compliant checkout.
      window.location.href = data.url
    } catch {
      toast.error('Network error starting checkout')
      setLoading(null)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto px-4 py-10">
      <div className="absolute inset-0 bg-[#0B0F13]/70 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border border-[#374151] bg-[#111827] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#10B981]" />
              </div>
              <span className="text-[10px] font-semibold text-green-300 bg-green-500/10 border border-green-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Ready
              </span>
            </div>

            <h2 className="font-heading text-xl font-bold text-white">
              {isGrowthSubscriber
                ? "You've used all 10 playbooks this cycle"
                : 'Your playbook is generated and ready'}
            </h2>
            <p className="text-sm text-[#9CA3AF] mt-1.5 leading-relaxed">
              {isGrowthSubscriber ? (
                <>
                  This is an extra playbook beyond your Growth cycle allowance. Unlock it now for{' '}
                  <span className="text-white font-medium">${oneOffPrice}</span>
                  {cycleResetsAt && (
                    <>
                      , or wait until your quota resets on{' '}
                      <span className="text-white font-medium">
                        {new Date(cycleResetsAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                      </span>
                    </>
                  )}
                  .
                </>
              ) : (
                <>
                  We&apos;ve built a complete, hyper-personalized ABM playbook —{' '}
                  <span className="text-white font-medium">{sectionsCount} sections</span>
                  {contactsCount > 0 && (
                    <>
                      {' '}and{' '}
                      <span className="text-white font-medium">
                        {contactsCount} verified contact{contactsCount !== 1 ? 's' : ''}
                      </span>
                    </>
                  )}
                  . Unlock it to review, edit, and export the full document.
                </>
              )}
            </p>

            <div className="mt-5 space-y-3">
              {/* One-off unlock */}
              <button
                onClick={() => startCheckout('one_off')}
                disabled={loading !== null}
                className="w-full text-left rounded-xl border border-[#374151] bg-[#0B0F13] hover:border-[#10B981]/40 transition-all p-4 disabled:opacity-60"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-semibold text-white">Unlock this playbook</p>
                    <p className="text-xs text-[#9CA3AF] mt-0.5">One-time payment · this playbook only</p>
                  </div>
                  {loading === 'one_off' ? (
                    <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                  ) : (
                    <span className="font-heading font-bold text-white text-lg">${oneOffPrice}</span>
                  )}
                </div>
              </button>

              {/* Growth subscription */}
              {!isGrowthSubscriber && (
                <button
                  onClick={() => startCheckout('growth')}
                  disabled={loading !== null}
                  className="w-full text-left rounded-xl border border-[#10B981]/30 bg-[#0B3D2E]/20 hover:border-[#10B981]/60 transition-all p-4 relative disabled:opacity-60"
                >
                  <span className="absolute -top-2 right-3 text-[9px] font-semibold text-[#0B0F13] bg-[#10B981] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Best value
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#10B981]" />
                        Subscribe to Growth
                      </p>
                      <p className="text-xs text-[#9CA3AF] mt-0.5">
                        Unlock this + all future playbooks · cancel anytime
                      </p>
                    </div>
                    {loading === 'growth' ? (
                      <Loader2 className="w-4 h-4 animate-spin text-[#10B981]" />
                    ) : (
                      <span className="font-heading font-bold text-white text-lg">
                        ${growthPrice}
                        <span className="text-xs text-[#9CA3AF] font-normal">/mo</span>
                      </span>
                    )}
                  </div>
                </button>
              )}

              <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF] pt-1">
                <ShieldCheck className="w-3 h-3" />
                <span>Secure checkout by Lemon Squeezy · you only pay once your playbook is ready.</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
