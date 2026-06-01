import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { NewPlaybookButton } from '@/components/dashboard/new-playbook-button'
import {
  FileText,
  Microscope,
  Users,
  Eye,
  Play,
  PenLine,
  CreditCard,
  Activity,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { ActivePlaybooks } from '@/components/dashboard/active-playbooks'
import { FailedPlaybookActions } from '@/components/dashboard/failed-playbook-actions'
import { requireAuth } from '@/lib/auth/session'
import { canAccess } from '@/lib/plan-features'
import { playbookRetentionLimit } from '@/lib/pricing'
import {
  GROWTH_CYCLE_CREDITS,
  getUserPlaybookStats,
  getUserRecentPlaybooks,
  getUserCreditBalance,
  getUserSubscription,
} from '@/server/users/user-repository'
import type { PlaybookStatus } from '@/types'

const IN_PROGRESS_STATUSES: PlaybookStatus[] = [
  'queued',
  'researching',
  'contact_review',
  'writing',
  'reviewing',
]

function getActionButton(
  id: string,
  status: string,
  productName: string,
  targetCompany: string,
) {
  switch (status as PlaybookStatus) {
    case 'complete':
      return (
        <Link href={`/playbook/${id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#374151] text-[#9CA3AF] hover:text-white hover:border-[#374151]/60 gap-1.5">
            <Eye className="w-3 h-3" /> View
          </Button>
        </Link>
      )
    case 'draft':
      return (
        <Link href={`/playbook/${id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#374151] text-[#9CA3AF] hover:text-white hover:border-[#374151]/60 gap-1.5">
            <PenLine className="w-3 h-3" /> Continue
          </Button>
        </Link>
      )
    case 'contact_review':
      return (
        <Link href={`/playbook/${id}/contacts`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 gap-1.5">
            <Eye className="w-3 h-3" /> Review
          </Button>
        </Link>
      )
    case 'queued':
    case 'researching':
    case 'writing':
    case 'reviewing':
      return (
        <Link href={`/playbook/${id}/processing`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10 hover:border-[#10B981]/50 gap-1.5">
            <Activity className="w-3 h-3" /> View Live
          </Button>
        </Link>
      )
    case 'error':
    case 'rejected':
    case 'failed':
    case 'cancelled':
      return (
        <FailedPlaybookActions
          playbookId={id}
          productName={productName}
          targetCompany={targetCompany}
        />
      )
    default:
      return (
        <Link href={`/playbook/${id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#10B981]/30 text-[#10B981] hover:bg-[#10B981]/10 hover:border-[#10B981]/50 gap-1.5">
            <Play className="w-3 h-3" /> Resume
          </Button>
        </Link>
      )
  }
}

export default async function DashboardPage() {
  const session = await requireAuth()
  const userId = session.user?.id as string

  // We retain (and list) the user's most recent N playbooks: 20 on growth, 5 on
  // pay-per-playbook tiers. Older terminal playbooks beyond this are purged on
  // creation (see /api/playbooks). The list limit mirrors that retention window.
  const subscription = await getUserSubscription(userId)
  const plan = subscription?.plan ?? 'free'
  const retentionLimit = playbookRetentionLimit(plan)

  const [stats, recentPlaybooks, credits] = await Promise.all([
    getUserPlaybookStats(userId),
    getUserRecentPlaybooks(userId, retentionLimit),
    getUserCreditBalance(userId),
  ])

  // No forced plan selection: free (pay-per-playbook) users see the dashboard
  // and generate freely. Payment is collected from the paywall after a playbook
  // is generated.
  const showStats = canAccess(plan, 'dashboard_stats')
  const showRecent = canAccess(plan, 'dashboard_recent')

  const firstName = session.user?.name?.split(' ')[0] ?? 'there'

  // Make the retention policy explicit so users know older playbooks roll off.
  const retentionNotice =
    plan === 'growth'
      ? `We keep your ${retentionLimit} most recent playbooks. Older completed playbooks are automatically removed from our servers.`
      : `We keep your ${retentionLimit} most recent playbooks. Older completed playbooks are automatically removed — upgrade to Growth to keep 20.`

  // Cycle wording differs by plan: growth has "X of 10 this cycle · resets <date>",
  // one_off has "X playbooks remaining" (top-up purchased per playbook).
  const cycleEnd = subscription?.currentPeriodEnd ?? null
  const creditsLabel =
    plan === 'growth' ? 'Cycle Credits' : 'Playbook Credits'
  const creditsValue =
    plan === 'growth'
      ? `${credits}/${GROWTH_CYCLE_CREDITS}`
      : credits.toString()
  const creditsHint =
    plan === 'growth' && cycleEnd
      ? `Resets ${cycleEnd.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`
      : plan === 'growth'
        ? 'Per 30-day cycle'
        : undefined

  const STATS = [
    {
      label: 'Total Playbooks',
      value: stats.total.toString(),
      icon: FileText,
    },
    {
      label: 'Active Research',
      value: stats.active.toString(),
      icon: Microscope,
    },
    {
      label: 'Contacts Verified',
      value: stats.contacts.toString(),
      icon: Users,
    },
    {
      label: creditsLabel,
      value: creditsValue,
      icon: CreditCard,
      hint: creditsHint,
    },
  ]

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#9CA3AF] mt-0.5">
            {showStats && stats.total > 0
              ? `Welcome back, ${firstName}. ${stats.active > 0 ? `${stats.active} playbook${stats.active > 1 ? 's' : ''} in progress.` : 'All playbooks complete.'}`
              : `Welcome, ${firstName}. Ready to generate your first playbook?`}
          </p>
        </div>
        {showStats && (
          <NewPlaybookButton
            className="bg-[#10B981] hover:bg-[#059669] text-white font-medium hidden sm:flex"
          />
        )}
      </div>

      {/* Stats — growth plan only */}
      {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-[#111827] border-[#374151] p-5 hover:border-[#374151] transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#0B3D2E]/60 border border-[#10B981]/15 flex items-center justify-center group-hover:border-[#10B981]/30 transition-colors">
                    <Icon className="w-4 h-4 text-[#10B981]" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
                <p className="text-xs text-[#9CA3AF] mt-0.5">{stat.label}</p>
                {'hint' in stat && stat.hint && (
                  <p className="text-[10px] text-[#9CA3AF]/70 mt-0.5">{stat.hint}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* In Progress — live cards (renders nothing when no active playbooks) */}
      <ActivePlaybooks />

      {/* Quick Action Hero — always visible */}
      <Card className="bg-gradient-to-br from-[#0B3D2E]/60 via-[#111827] to-[#111827] border-[#10B981]/20 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#10B981]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI-Powered
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-white mb-1.5">
              Generate a new ABM playbook
            </h2>
            <p className="text-sm text-[#9CA3AF] max-w-md">
              Enter your product brief and target account — our AI agent swarm builds a complete,
              hyper-personalized playbook in 30–120 minutes.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified contacts
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
                18 playbook sections
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#9CA3AF]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Cultural adaptation
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <NewPlaybookButton
              size="lg"
              showArrow
              className="bg-[#10B981] hover:bg-[#059669] text-white font-semibold px-6 shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.4)] transition-shadow"
            />
          </div>
        </div>
      </Card>

      {/* Recent Playbooks — growth plan only */}
      {showRecent && (
        <div>
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-heading text-lg font-semibold text-white">Recent Playbooks</h2>
          </div>
          <p className="text-xs text-[#9CA3AF]/80 mb-4">{retentionNotice}</p>

          <Card className="bg-[#111827] border-[#374151] overflow-hidden">
            {recentPlaybooks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#0B3D2E]/40 border border-[#10B981]/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-[#10B981]/50" />
                </div>
                <p className="text-[#9CA3AF] text-sm">No playbooks yet.</p>
                <p className="text-[#9CA3AF]/60 text-xs mt-1">Generate your first one above.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 border-b border-[#1F2937] text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider hidden sm:grid">
                  <span>Account / Product</span>
                  <span>Status</span>
                  <span>Updated</span>
                  <span className="text-right">Action</span>
                </div>

                <div className="divide-y divide-white/[0.04]">
                  {recentPlaybooks.map((pb) => (
                    <div
                      key={pb.id}
                      className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_100px] gap-2 sm:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center group"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-[#0B3D2E]/50 border border-[#10B981]/10 flex items-center justify-center flex-shrink-0 group-hover:border-[#10B981]/25 transition-colors">
                          <FileText className="w-3.5 h-3.5 text-[#10B981]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{pb.targetCompany}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{pb.productName}</p>
                        </div>
                      </div>

                      <div className="sm:block flex items-center gap-2">
                        <span className="text-[11px] text-[#9CA3AF] sm:hidden">Status: </span>
                        <StatusBadge status={pb.status as PlaybookStatus} />
                      </div>

                      <div>
                        {IN_PROGRESS_STATUSES.includes(pb.status as PlaybookStatus) ? (
                          <p className="text-sm text-[#10B981] inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                            Running · started {formatDistanceToNow(pb.createdAt, { addSuffix: true })}
                          </p>
                        ) : (
                          <p className="text-sm text-[#9CA3AF]">
                            {formatDistanceToNow(pb.updatedAt, { addSuffix: true })}
                          </p>
                        )}
                      </div>

                      <div className="sm:text-right">
                        {getActionButton(pb.id, pb.status, pb.productName, pb.targetCompany)}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>
        </div>
      )}
    </div>
  )
}
