import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { StatCard } from '@/components/admin/stat-card'
import { FunnelSteps } from '@/components/admin/funnel'
import { RotateCcw, Repeat, MousePointerClick, CreditCard, Info, ArrowUpRight } from 'lucide-react'
import { getFunnelAnalytics } from '@/server/admin/admin-repository'

function pct(part: number, whole: number) {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

export default async function AdminFunnelPage() {
  const funnel = await getFunnelAnalytics()
  const { steps, metrics, segments, totalUsers } = funnel

  const byKey = Object.fromEntries(steps.map((s) => [s.key, s.users]))
  const briefToGen = pct(byKey.generation ?? 0, byKey.brief ?? 0)
  const completedToPaid = pct(byKey.paid ?? 0, byKey.completed ?? 0)

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Behavior Funnel</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">
          How users move through the product — from sign-up to paid — and who drops off where.
        </p>
      </div>

      {!funnel.hasEventData && (
        <div className="flex items-start gap-2.5 rounded-lg border border-[#2563EB]/20 bg-[#2563EB]/5 px-4 py-3">
          <Info className="w-4 h-4 text-[#2563EB] mt-0.5 flex-shrink-0" />
          <p className="text-xs text-[#9CA3AF]">
            No behavior events recorded yet. Steps marked{' '}
            <span className="text-[#2563EB] font-medium">tracked</span> (returns, magic-link landings, paywall views)
            only collect data from this feature&apos;s deploy onward — there is no backfill. Derived steps
            (brief, generation, review, completion, paid) reflect all historical data.
          </p>
        </div>
      )}

      {/* Return-activity KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Returned to app"
          value={`${pct(metrics.returners, totalUsers)}%`}
          icon={RotateCcw}
          accent="blue"
          hint={`${metrics.returners} of ${totalUsers} registered`}
        />
        <StatCard
          label="Repeat logins"
          value={metrics.repeatLoginUsers}
          icon={Repeat}
          accent="blue"
          hint="users who logged in ≥2 times"
        />
        <StatCard
          label="Brief → generation"
          value={`${briefToGen}%`}
          icon={MousePointerClick}
          accent="green"
          hint="of users who reached the brief"
        />
        <StatCard
          label="Completed → paid"
          value={`${completedToPaid}%`}
          icon={CreditCard}
          accent={completedToPaid >= 30 ? 'green' : 'amber'}
          hint="paywall conversion"
        />
      </div>

      {/* The funnel */}
      <Card className="bg-[#111827] border-[#374151] p-5">
        <div className="flex items-baseline justify-between mb-4">
          <h2 className="font-heading text-sm font-semibold text-white">Conversion funnel</h2>
          <span className="text-[11px] text-[#9CA3AF]">% shown is of all registered users</span>
        </div>
        <FunnelSteps steps={steps} />
      </Card>

      {/* Drop-off segments — actionable user lists */}
      <div>
        <h2 className="font-heading text-lg font-semibold text-white mb-1">Drop-off segments</h2>
        <p className="text-xs text-[#9CA3AF]/80 mb-4">
          Users stuck at each stage — the shortlist for sales &amp; marketing outreach. Showing up to 50 most-recent per
          segment.
        </p>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {segments.map((seg) => (
            <Card key={seg.key} className="bg-[#111827] border-[#374151] p-5">
              <div className="flex items-start justify-between mb-1 gap-3">
                <h3 className="font-heading text-sm font-semibold text-white">{seg.label}</h3>
                <span className="text-sm font-bold text-amber-400 tabular-nums flex-shrink-0">{seg.count}</span>
              </div>
              <p className="text-[11px] text-[#6B7280] mb-3">{seg.description}</p>

              {seg.users.length === 0 ? (
                <p className="text-xs text-[#9CA3AF]/70 py-2">No users in this segment.</p>
              ) : (
                <div className="divide-y divide-white/[0.04] -mx-1">
                  {seg.users.map((u) => (
                    <Link
                      key={u.id}
                      href={`/admin/users/${u.id}`}
                      className="flex items-center justify-between gap-3 px-1 py-2 rounded hover:bg-white/[0.02] transition-colors group"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-white truncate group-hover:text-amber-300 transition-colors">
                          {u.name ?? u.email}
                        </p>
                        {u.name && <p className="text-[10px] text-[#6B7280] truncate">{u.email}</p>}
                      </div>
                      <div className="flex items-center gap-1.5 flex-shrink-0">
                        <span className="text-[10px] text-[#9CA3AF]">
                          {formatDistanceToNow(u.createdAt, { addSuffix: true })}
                        </span>
                        <ArrowUpRight className="w-3 h-3 text-[#6B7280] group-hover:text-amber-400 transition-colors" />
                      </div>
                    </Link>
                  ))}
                  {seg.count > seg.users.length && (
                    <p className="text-[10px] text-[#6B7280] px-1 pt-2">
                      + {seg.count - seg.users.length} more not shown
                    </p>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      </div>
    </div>
  )
}
