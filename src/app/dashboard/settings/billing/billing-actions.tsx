'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowRight, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { openCheckoutOverlay } from '@/lib/lemonsqueezy-checkout'

// Opens the Lemon Squeezy overlay checkout directly from the billing page.
// purpose 'subscription' = upgrade to Growth; 'credit' = buy one playbook credit.
export function BillingCheckoutButton({
  purpose,
  label,
  size = 'default',
  className = 'bg-[#10B981] hover:bg-[#10B981]/90 text-white font-semibold gap-1.5',
}: {
  purpose: 'subscription' | 'credit'
  label: string
  size?: 'sm' | 'default'
  className?: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [finalizing, setFinalizing] = useState(false)

  async function go() {
    if (loading || finalizing) return
    setLoading(true)
    try {
      const res = await fetch('/api/payment/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ purpose }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data.url) {
        toast.error(data.error ?? 'Could not start checkout')
        setLoading(false)
        return
      }
      await openCheckoutOverlay(data.url, onSuccess)
      setLoading(false) // overlay open; re-enable if the user closes it
    } catch {
      toast.error('Network error starting checkout')
      setLoading(false)
    }
  }

  // Entitlement applies via webhook — poll briefly, then refresh the page.
  function onSuccess() {
    setFinalizing(true)
    let tries = 0
    const poll = async () => {
      tries++
      try {
        const res = await fetch('/api/payment/status', { cache: 'no-store' })
        const j = await res.json()
        const done = purpose === 'subscription' ? j.plan === 'growth' : true
        if (done) {
          toast.success('Payment complete')
          router.refresh()
          return
        }
      } catch {
        // keep polling
      }
      if (tries < 15) setTimeout(poll, 2000)
      else {
        toast.message('Payment received — refreshing shortly.')
        router.refresh()
      }
    }
    // Credits land almost immediately; give the webhook a moment first.
    setTimeout(poll, purpose === 'credit' ? 2500 : 0)
  }

  return (
    <Button onClick={go} disabled={loading || finalizing} size={size} className={className}>
      {(loading || finalizing) && <Loader2 className="w-4 h-4 animate-spin" />}
      {finalizing ? 'Finalizing…' : label}
      {!loading && !finalizing && <ArrowRight className="w-4 h-4" />}
    </Button>
  )
}
