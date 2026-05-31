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
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 gap-1.5">
            <Eye className="w-3 h-3" /> View
          </Button>
        </Link>
      )
    case 'draft':
      return (
        <Link href={`/playbook/${id}`}>
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 gap-1.5">
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
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 gap-1.5">
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
          <Button size="sm" variant="outline" className="h-7 text-xs px-3 border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 gap-1.5">
            <Play className="w-3 h-3" /> Resume
          </Button>
        </Link>
      )
  }
}

export default async function DashboardPage() {
  const session = await requireAuth()
  const userId = session.user?.id as string

  // For one_off plan, only surface playbooks created in the last 7 days;
  // longer history is a growth-tier feature.
  const subscription = await getUserSubscription(userId)
  const plan = subscription?.plan ?? 'free'
  const recentCutoff =
    plan === 'one_off' ? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) : undefined

  const [stats, recentPlaybooks, credits] = await Promise.all([
    getUserPlaybookStats(userId),
    getUserRecentPlaybooks(userId, 5, recentCutoff),
    getUserCreditBalance(userId),
  ])

  // No forced plan selection: free (pay-per-playbook) users see the dashboard
  // and generate freely. Payment is collected from the paywall after a playbook
  // is generated.
  const showStats = canAccess(plan, 'dashboard_stats')
  const showRecent = canAccess(plan, 'dashboard_recent')

  const firstName = session.user?.name?.split(' ')[0] ?? 'there'

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
          <p className="text-sm text-[#a1a1aa] mt-0.5">
            {showStats && stats.total > 0
              ? `Welcome back, ${firstName}. ${stats.active > 0 ? `${stats.active} playbook${stats.active > 1 ? 's' : ''} in progress.` : 'All playbooks complete.'}`
              : `Welcome, ${firstName}. Ready to generate your first playbook?`}
          </p>
        </div>
        {showStats && (
          <NewPlaybookButton
            className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-medium hidden sm:flex"
          />
        )}
      </div>

      {/* Stats — growth plan only */}
      {showStats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {STATS.map((stat) => {
            const Icon = stat.icon
            return (
              <Card key={stat.label} className="bg-[#141419] border-white/[0.06] p-5 hover:border-white/10 transition-colors group">
                <div className="flex items-start justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/60 border border-[#339af0]/15 flex items-center justify-center group-hover:border-[#339af0]/30 transition-colors">
                    <Icon className="w-4 h-4 text-[#339af0]" />
                  </div>
                </div>
                <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
                <p className="text-xs text-[#a1a1aa] mt-0.5">{stat.label}</p>
                {'hint' in stat && stat.hint && (
                  <p className="text-[10px] text-[#a1a1aa]/70 mt-0.5">{stat.hint}</p>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* In Progress — live cards (renders nothing when no active playbooks) */}
      <ActivePlaybooks />

      {/* Quick Action Hero — always visible */}
      <Card className="bg-gradient-to-br from-[#1e3a5f]/60 via-[#141419] to-[#141419] border-[#339af0]/20 p-6 sm:p-8 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#339af0]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#339af0] bg-[#339af0]/10 border border-[#339af0]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI-Powered
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-white mb-1.5">
              Generate a new ABM playbook
            </h2>
            <p className="text-sm text-[#a1a1aa] max-w-md">
              Enter your product brief and target account — our AI agent swarm builds a complete,
              hyper-personalized playbook in 30–120 minutes.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified contacts
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#339af0]" />
                18 playbook sections
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Cultural adaptation
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <NewPlaybookButton
              size="lg"
              showArrow
              className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold px-6 shadow-[0_0_20px_rgba(51,154,240,0.3)] hover:shadow-[0_0_30px_rgba(51,154,240,0.4)] transition-shadow"
            />
          </div>
        </div>
      </Card>

      {/* Recent Playbooks — growth plan only */}
      {showRecent && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold text-white">Recent Playbooks</h2>
          </div>

          <Card className="bg-[#141419] border-white/[0.06] overflow-hidden">
            {recentPlaybooks.length === 0 ? (
              <div className="py-16 text-center">
                <div className="w-12 h-12 rounded-xl bg-[#1e3a5f]/40 border border-[#339af0]/10 flex items-center justify-center mx-auto mb-4">
                  <FileText className="w-6 h-6 text-[#339af0]/50" />
                </div>
                <p className="text-[#a1a1aa] text-sm">No playbooks yet.</p>
                <p className="text-[#a1a1aa]/60 text-xs mt-1">Generate your first one above.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider hidden sm:grid">
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
                        <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/50 border border-[#339af0]/10 flex items-center justify-center flex-shrink-0 group-hover:border-[#339af0]/25 transition-colors">
                          <FileText className="w-3.5 h-3.5 text-[#339af0]" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-white">{pb.targetCompany}</p>
                          <p className="text-[11px] text-[#a1a1aa]">{pb.productName}</p>
                        </div>
                      </div>

                      <div className="sm:block flex items-center gap-2">
                        <span className="text-[11px] text-[#a1a1aa] sm:hidden">Status: </span>
                        <StatusBadge status={pb.status as PlaybookStatus} />
                      </div>

                      <div>
                        {IN_PROGRESS_STATUSES.includes(pb.status as PlaybookStatus) ? (
                          <p className="text-sm text-[#339af0] inline-flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#339af0] animate-pulse" />
                            Running · started {formatDistanceToNow(pb.createdAt, { addSuffix: true })}
                          </p>
                        ) : (
                          <p className="text-sm text-[#a1a1aa]">
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
