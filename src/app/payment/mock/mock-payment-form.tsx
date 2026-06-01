'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { toast } from 'sonner'
import { CreditCard, Lock, ArrowLeft, Loader2, CheckCircle2, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type Purpose = 'plan' | 'playbook'

interface Props {
  purpose: Purpose
  plan?: 'growth' | 'one_off'
  amount: number
  returnTo?: string
}

const PURPOSE_COPY: Record<Purpose, { title: string; subtitle: string; ctaPrefix: string }> = {
  plan: {
    title: 'Activate your subscription',
    subtitle: 'Your card will be charged the monthly fee. Cancel anytime from Billing.',
    ctaPrefix: 'Subscribe',
  },
  playbook: {
    title: 'Pay for this playbook',
    subtitle: 'One-time charge for a single ABM playbook generation.',
    ctaPrefix: 'Pay',
  },
}

function formatCardNumber(value: string): string {
  return value.replace(/\D/g, '').slice(0, 16).replace(/(.{4})/g, '$1 ').trim()
}

function formatExpiry(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 4)
  if (digits.length < 3) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function MockPaymentForm({ purpose, plan, amount, returnTo }: Props) {
  const router = useRouter()
  const [name, setName] = useState('')
  const [cardNumber, setCardNumber] = useState('4242 4242 4242 4242')
  const [expiry, setExpiry] = useState('12/29')
  const [cvc, setCvc] = useState('123')
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)

  const copy = PURPOSE_COPY[purpose]
  const planLabel = plan === 'growth' ? 'Growth (monthly)' : plan === 'one_off' ? 'One Off' : null
  const lineItemLabel = purpose === 'plan'
    ? `${planLabel ?? 'Subscription'} plan`
    : 'ABM playbook generation'
  const lineItemSubtitle = purpose === 'plan'
    ? plan === 'growth'
      ? '10 playbooks per 30-day cycle · cancel anytime'
      : 'Billed monthly · cancel anytime'
    : 'One-time charge'

  const cardDigitsOk = cardNumber.replace(/\s/g, '').length === 16
  const expiryOk = /^\d{2}\/\d{2}$/.test(expiry)
  const cvcOk = /^\d{3,4}$/.test(cvc)
  const formValid = name.trim().length >= 2 && cardDigitsOk && expiryOk && cvcOk

  async function handleSubmit() {
    if (!formValid || submitting) return
    setSubmitting(true)
    try {
      // Simulate gateway latency so the UX feels real
      await new Promise((r) => setTimeout(r, 900))

      const res = await fetch('/api/payment/mock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose, plan, amount, returnTo }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        toast.error(data.error ?? 'Payment failed')
        setSubmitting(false)
        return
      }
      const data = (await res.json()) as { redirect?: string }
      setSuccess(true)
      // Brief success state before navigating
      await new Promise((r) => setTimeout(r, 600))
      router.push(data.redirect ?? '/dashboard')
    } catch {
      toast.error('Network error processing payment')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center px-4 py-12">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-[#0B3D2E]/15 rounded-full blur-[120px] pointer-events-none" />

      <div className="relative w-full max-w-md">
        <Link href="/dashboard" className="inline-flex items-center gap-2 text-xs text-[#9CA3AF] hover:text-white mb-4">
          <ArrowLeft className="w-3.5 h-3.5" />
          Cancel and return to dashboard
        </Link>

        <Card className="bg-[#111827] border-[#374151] p-6 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />

          <div className="relative">
            <div className="flex items-center gap-2 mb-1">
              <div className="w-8 h-8 rounded-lg bg-[#0B3D2E] border border-[#10B981]/30 flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-[#10B981]" />
              </div>
              <span className="text-[10px] font-semibold text-amber-300 bg-amber-500/10 border border-amber-500/30 px-2 py-0.5 rounded-full uppercase tracking-wider">
                Mock Gateway
              </span>
            </div>
            <h1 className="font-heading text-xl font-bold text-white mt-3">{copy.title}</h1>
            <p className="text-xs text-[#9CA3AF] mt-1 leading-relaxed">{copy.subtitle}</p>

            {/* Line item */}
            <div className="mt-5 rounded-xl border border-[#374151] bg-[#0B0F13] p-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-md bg-[#0B3D2E]/60 border border-[#10B981]/20 flex items-center justify-center">
                  <Zap className="w-3.5 h-3.5 text-[#10B981]" />
                </div>
                <div>
                  <p className="text-xs font-medium text-white">{lineItemLabel}</p>
                  <p className="text-[10px] text-[#9CA3AF]">{lineItemSubtitle}</p>
                </div>
              </div>
              <p className="font-heading font-bold text-white text-lg">${amount}</p>
            </div>

            {/* Form */}
            <div className="mt-5 space-y-4">
              <div>
                <Label className="text-xs font-medium text-white mb-1.5 block">Cardholder name</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Smith"
                  className="bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF]/40 focus:border-[#10B981]/50 h-10 text-sm"
                />
              </div>
              <div>
                <Label className="text-xs font-medium text-white mb-1.5 block">Card number</Label>
                <Input
                  value={cardNumber}
                  onChange={(e) => setCardNumber(formatCardNumber(e.target.value))}
                  placeholder="4242 4242 4242 4242"
                  inputMode="numeric"
                  className="bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF]/40 focus:border-[#10B981]/50 h-10 text-sm tabular-nums"
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
                    className="bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF]/40 focus:border-[#10B981]/50 h-10 text-sm tabular-nums"
                  />
                </div>
                <div>
                  <Label className="text-xs font-medium text-white mb-1.5 block">CVC</Label>
                  <Input
                    value={cvc}
                    onChange={(e) => setCvc(e.target.value.replace(/\D/g, '').slice(0, 4))}
                    placeholder="123"
                    inputMode="numeric"
                    className="bg-[#0B0F13] border-[#374151] text-white placeholder:text-[#9CA3AF]/40 focus:border-[#10B981]/50 h-10 text-sm tabular-nums"
                  />
                </div>
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleSubmit}
              disabled={!formValid || submitting || success}
              size="lg"
              className="w-full mt-6 bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold h-11 rounded-xl shadow-[0_0_20px_rgba(16,185,129,0.25)]"
            >
              {success ? (
                <><CheckCircle2 className="w-4 h-4 mr-2" />Payment confirmed</>
              ) : submitting ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing…</>
              ) : (
                <><Lock className="w-3.5 h-3.5 mr-2" />{copy.ctaPrefix} ${amount}</>
              )}
            </Button>

            <div className="mt-4 flex items-center justify-center gap-1.5 text-[10px] text-[#9CA3AF]">
              <ShieldCheck className="w-3 h-3" />
              <span>Mock gateway — no real charge. Replace with Stripe before launch.</span>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
