'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  Lock,
  CreditCard,
  Loader2,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

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
  // Called after a successful unlock (one-off purchase or Growth subscription)
  // so the page can re-fetch and reveal the real content.
  onUnlocked: () => void
}

type Choice = 'one_off' | 'growth'

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function PlaybookPaywall({
  playbookId,
  oneOffPrice,
  growthPrice,
  sectionsCount,
  contactsCount,
  isGrowthSubscriber = false,
  cycleResetsAt,
  onUnlocked,
}: Props) {
  // An over-quota Growth subscriber only gets the one-off overage path — they're
  // already subscribed, so we pre-select it and hide the subscribe option.
  const [choice, setChoice] = useState<Choice | null>(isGrowthSubscriber ? 'one_off' : null)
  const [name, setName] = useState('')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/29')
  const [cvc, setCvc] = useState('123')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const cardDigitsOk = cardNumber.replace(/\s/g, '').length === 16
  const expiryOk = /^\d{2}\/\d{2}$/.test(expiry)
  const cvcOk = /^\d{3,4}$/.test(cvc)
  const formValid = name.trim().length >= 2 && cardDigitsOk && expiryOk && cvcOk

  const amount = choice === 'growth' ? growthPrice : oneOffPrice

  async function handleSubmit() {
    if (!choice || !formValid || submitting) return
    setSubmitting(true)
    try {
      // Simulate gateway latency so the UX feels real.
      await new Promise((r) => setTimeout(r, 900))

      const payload =
        choice === 'growth'
          ? { purpose: 'plan', plan: 'growth', amount: growthPrice, playbookId }
          : { purpose: 'unlock', playbookId, amount: oneOffPrice }

      const res = await fetch('/api/payment/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Payment failed')
        setSubmitting(false)
        return
      }
      setSuccess(true)
      await new Promise((r) => setTimeout(r, 650))
      toast.success(
        choice === 'growth'
          ? 'Growth subscription active — all your playbooks are unlocked.'
          : 'Playbook unlocked. Enjoy!',
      )
      onUnlocked()
    } catch {
      toast.error('Network error processing payment')
      setSubmitting(false)
    }
  }

  return (
    <div className="absolute inset-0 z-30 flex items-start justify-center overflow-y-auto px-4 py-10">
      {/* Backdrop tint over the blurred skeleton beneath */}
      <div className="absolute inset-0 bg-[#0a0a0f]/70 backdrop-blur-[2px] pointer-events-none" />

      <div className="relative w-full max-w-lg">
        <div className="rounded-2xl border border-white/[0.08] bg-[#141419] shadow-[0_20px_60px_rgba(0,0,0,0.5)] overflow-hidden">
          <div className="absolute top-0 right-0 w-48 h-48 bg-[#339af0]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative p-6">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
                <Lock className="w-4 h-4 text-[#339af0]" />
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
            <p className="text-sm text-[#a1a1aa] mt-1.5 leading-relaxed">
              {isGrowthSubscriber ? (
                <>
                  This is an extra playbook beyond your Growth cycle allowance. Unlock it now
                  for{' '}
                  <span className="text-white font-medium">${oneOffPrice}</span>
                  {cycleResetsAt && (
                    <>
                      , or wait until your quota resets on{' '}
                      <span className="text-white font-medium">
                        {new Date(cycleResetsAt).toLocaleDateString(undefined, {
                          month: 'short',
                          day: 'numeric',
                        })}
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

            {choice === null ? (
              <div className="mt-5 space-y-3">
                {/* One-off unlock */}
                <button
                  onClick={() => setChoice('one_off')}
                  className="w-full text-left rounded-xl border border-white/[0.08] bg-[#0a0a0f] hover:border-[#339af0]/40 hover:bg-[#0d0d15] transition-all p-4 group"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white">Unlock this playbook</p>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">
                        One-time payment · this playbook only
                      </p>
                    </div>
                    <span className="font-heading font-bold text-white text-lg">${oneOffPrice}</span>
                  </div>
                </button>

                {/* Growth subscription */}
                <button
                  onClick={() => setChoice('growth')}
                  className="w-full text-left rounded-xl border border-[#339af0]/30 bg-[#1e3a5f]/20 hover:border-[#339af0]/60 hover:bg-[#1e3a5f]/30 transition-all p-4 relative"
                >
                  <span className="absolute -top-2 right-3 text-[9px] font-semibold text-[#0a0a0f] bg-[#339af0] px-2 py-0.5 rounded-full uppercase tracking-wider">
                    Best value
                  </span>
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold text-white flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-[#339af0]" />
                        Subscribe to Growth
                      </p>
                      <p className="text-xs text-[#a1a1aa] mt-0.5">
                        Unlock this + all future playbooks · cancel anytime
                      </p>
                    </div>
                    <span className="font-heading font-bold text-white text-lg">
                      ${growthPrice}
                      <span className="text-xs text-[#a1a1aa] font-normal">/mo</span>
                    </span>
                  </div>
                </button>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-[#a1a1aa] pt-1">
                  <ShieldCheck className="w-3 h-3" />
                  <span>You only pay once your playbook is ready — never for failed runs.</span>
                </div>
              </div>
            ) : (
              <div className="mt-5">
                {!isGrowthSubscriber && (
                  <button
                    onClick={() => setChoice(null)}
                    disabled={submitting || success}
                    className="inline-flex items-center gap-1.5 text-xs text-[#a1a1aa] hover:text-white mb-4 disabled:opacity-50"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    Back to options
                  </button>
                )}

                {/* Line item */}
                <div className="rounded-xl border border-white/[0.06] bg-[#0a0a0f] p-4 flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-md bg-[#1e3a5f]/60 border border-[#339af0]/20 flex items-center justify-center">
                      <CreditCard className="w-3.5 h-3.5 text-[#339af0]" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-white">
                        {choice === 'growth' ? 'Growth plan (monthly)' : 'One-off playbook unlock'}
                      </p>
                      <p className="text-[10px] text-[#a1a1aa]">
                        {choice === 'growth' ? 'Billed monthly · cancel anytime' : 'One-time charge'}
                      </p>
                    </div>
                  </div>
                  <p className="font-heading font-bold text-white text-lg">
                    ${amount}
                    {choice === 'growth' && (
                      <span className="text-xs text-[#a1a1aa] font-normal">/mo</span>
                    )}
                  </p>
                </div>

                <div className="space-y-3">
                  <div>
                    <Label className="text-xs font-medium text-white mb-1.5 block">Cardholder name</Label>
                    <Input
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Jane Smith"
                      className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/40 focus:border-[#339af0]/50 h-10 text-sm"
                    />
                  </div>
                  <div>
                    <Label className="text-xs font-medium text-white mb-1.5 block">Card number</Label>
                    <Input
                      value={cardNumber}
                      onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                      placeholder="4242 4242 4242 4242"
                      inputMode="numeric"
                      className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/40 focus:border-[#339af0]/50 h-10 text-sm tabular-nums"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-xs font-medium text-white mb-1.5 block">Expiry</Label>
                      <Input
                        value={expiry}
                        onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                        placeholder="MM/YY"
                        inputMode="numeric"
                        className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/40 focus:border-[#339af0]/50 h-10 text-sm tabular-nums"
                      />
                    </div>
                    <div>
                      <Label className="text-xs font-medium text-white mb-1.5 block">CVC</Label>
                      <Input
                        value={cvc}
                        onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="123"
                        inputMode="numeric"
                        className="bg-[#0a0a0f] border-white/10 text-white placeholder:text-[#a1a1aa]/40 focus:border-[#339af0]/50 h-10 text-sm tabular-nums"
                      />
                    </div>
                  </div>
                </div>

                <Button
                  onClick={handleSubmit}
                  disabled={!formValid || submitting || success}
                  size="lg"
                  className="w-full mt-5 bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold h-11 rounded-xl shadow-[0_0_20px_rgba(51,154,240,0.25)]"
                >
                  {success ? (
                    <><CheckCircle2 className="w-4 h-4 mr-2" />Unlocked</>
                  ) : submitting ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
                  ) : (
                    <><Lock className="w-3.5 h-3.5 mr-2" />{choice === 'growth' ? `Subscribe $${amount}/mo` : `Pay $${amount}`}</>
                  )}
                </Button>

                <div className="mt-3 flex items-center justify-center gap-1.5 text-[10px] text-[#a1a1aa]">
                  <ShieldCheck className="w-3 h-3" />
                  <span>Mock gateway — no real charge. Replace with Stripe before launch.</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
