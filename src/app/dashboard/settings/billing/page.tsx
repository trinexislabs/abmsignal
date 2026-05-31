import Link from 'next/link'
import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import {
  getUserSubscription,
  getUserCreditBalance,
  GROWTH_CYCLE_CREDITS,
} from '@/server/users/user-repository'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { CreditCard, Zap, ArrowRight, CheckCircle2 } from 'lucide-react'
import { ONE_OFF_PRICE_USD, GROWTH_PRICE_USD } from '@/lib/pricing'

export default async function BillingPage() {
  const session = await requireAuth()
  const userId = session.user?.id as string

  const [subscription, credits] = await Promise.all([
    getUserSubscription(userId),
    getUserCreditBalance(userId),
  ])

  const plan = subscription?.plan ?? 'free'
  if (plan === 'free') redirect('/onboarding/plan')

  const isGrowth = plan === 'growth'
  const cycleEnd = subscription?.currentPeriodEnd

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Billing</h1>
        <p className="text-sm text-[#a1a1aa] mt-0.5">Manage your plan and credits</p>
      </div>

      {/* Current plan */}
      <Card className="bg-[#141419] border-white/[0.06] p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#1e3a5f]/60 border border-[#339af0]/20 flex items-center justify-center">
              <Zap className="w-5 h-5 text-[#339af0]" />
            </div>
            <div>
              <p className="text-xs text-[#a1a1aa] uppercase tracking-wider mb-0.5">Current Plan</p>
              <p className="text-lg font-bold text-white font-heading">
                {isGrowth ? 'Growth' : 'One Off'}
              </p>
              <p className="text-xs text-[#a1a1aa] mt-0.5">
                {isGrowth
                  ? `$${GROWTH_PRICE_USD}/month · ${GROWTH_CYCLE_CREDITS} playbooks per cycle`
                  : `$${ONE_OFF_PRICE_USD} per playbook credit`}
              </p>
            </div>
          </div>
          <span className="text-[10px] font-semibold text-green-400 bg-green-400/10 border border-green-400/20 px-2 py-1 rounded-full uppercase tracking-wider flex-shrink-0">
            Active
          </span>
        </div>

        {isGrowth && cycleEnd && (
          <div className="mt-4 pt-4 border-t border-white/[0.04]">
            <p className="text-xs text-[#a1a1aa]">
              Current cycle resets{' '}
              <span className="text-white">
                {cycleEnd.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' })}
              </span>
            </p>
          </div>
        )}
      </Card>

      {/* Credits */}
      <Card className="bg-[#141419] border-white/[0.06] p-6">
        <div className="flex items-center gap-3 mb-4">
          <CreditCard className="w-4 h-4 text-[#339af0]" />
          <h2 className="font-heading text-sm font-semibold text-white">
            {isGrowth ? 'Cycle Credits' : 'Playbook Credits'}
          </h2>
        </div>

        <div className="flex items-end gap-2 mb-1">
          <span className="text-3xl font-bold text-white font-heading">{credits}</span>
          {isGrowth && (
            <span className="text-lg text-[#a1a1aa] mb-0.5">/ {GROWTH_CYCLE_CREDITS}</span>
          )}
        </div>
        <p className="text-xs text-[#a1a1aa]">
          {isGrowth ? 'Playbooks remaining this cycle' : 'Credits available for new playbooks'}
        </p>

        {isGrowth && (
          <div className="mt-3 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className="h-full bg-[#339af0] rounded-full transition-all"
              style={{ width: `${Math.min(100, (credits / GROWTH_CYCLE_CREDITS) * 100)}%` }}
            />
          </div>
        )}

        {!isGrowth && credits === 0 && (
          <div className="mt-4">
            <Link href="/onboarding/plan">
              <Button size="sm" className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5">
                Buy more credits <ArrowRight className="w-3.5 h-3.5" />
              </Button>
            </Link>
          </div>
        )}
      </Card>

      {/* Upgrade prompt for one_off users */}
      {!isGrowth && (
        <Card className="bg-gradient-to-br from-[#1e3a5f]/40 via-[#141419] to-[#141419] border-[#339af0]/20 p-6">
          <h2 className="font-heading text-base font-bold text-white mb-1">Upgrade to Growth</h2>
          <p className="text-sm text-[#a1a1aa] mb-4">
            Get {GROWTH_CYCLE_CREDITS} playbooks every 30 days for ${GROWTH_PRICE_USD}/month.
          </p>
          <ul className="space-y-2 mb-5">
            {[
              `${GROWTH_CYCLE_CREDITS} playbooks per cycle`,
              'Priority agent queue',
              'Full history access',
              'Dashboard analytics',
            ].map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-[#a1a1aa]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#339af0] flex-shrink-0" />
                {f}
              </li>
            ))}
          </ul>
          <Link href="/onboarding/plan">
            <Button className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold gap-1.5">
              Upgrade now <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </Card>
      )}
    </div>
  )
}
