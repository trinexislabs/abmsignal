'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import {
  Zap,
  Network,
  Search,
  PenLine,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Clock,
  Info,
  ArrowLeft,
  BookOpen,
  Users,
  FileText,
  Activity,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Button, buttonVariants } from '@/components/ui/button'
import { DeletePlaybookDialog } from '@/components/playbook/delete-playbook-dialog'
import { cn } from '@/lib/utils'
import { Trash2, RefreshCw, LifeBuoy } from 'lucide-react'
import { SUPPORT_EMAIL } from '@/lib/support'
import type { AgentStatus, PlaybookStatus } from '@/types'

// ─────────────────────────────────────────────────────────
// Types — mirror the extended /status API response. All new fields
// are optional so the page still renders if the API hasn't been deployed yet.
// ─────────────────────────────────────────────────────────

interface ApiActiveRun {
  id: string
  phase: 'research' | 'writing' | 'review'
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  started_at: string | null
  created_at: string
}

interface ApiEvent {
  id: string
  type: string
  message: string
  created_at: string
}

interface ApiCounters {
  sections_total: number
  sections_complete: number
  contacts_found: number
  sources_count: number
}

interface StatusData {
  playbook_id: string
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
  failed_reason?: string
  product_name?: string
  target_company?: string
  active_run?: ApiActiveRun | null
  agent_runtime_seconds?: number
  created_at?: string
  recent_events?: ApiEvent[]
  counters?: ApiCounters
}

// ─────────────────────────────────────────────────────────
// Static metadata
// ─────────────────────────────────────────────────────────

const AGENT_META: Record<
  AgentStatus['agent'],
  { label: string; Icon: React.ElementType; description: string }
> = {
  orchestrator: {
    label: 'Orchestrator',
    Icon: Network,
    description: 'Decomposes requests, routes tasks, and enforces quality gates',
  },
  researcher: {
    label: 'Researcher',
    Icon: Search,
    description: 'Deep account research via Universal Deep Research loops',
  },
  writer: {
    label: 'Writer',
    Icon: PenLine,
    description: 'Hyper-personalized outreach with cultural adaptation',
  },
  reviewer: {
    label: 'Reviewer',
    Icon: ShieldCheck,
    description: '16-point quality checklist and fact verification',
  },
}

const AGENT_ORDER: AgentStatus['agent'][] = ['orchestrator', 'researcher', 'writer', 'reviewer']

const STATUS_LABELS: Record<PlaybookStatus, string> = {
  draft: 'Draft',
  queued: 'Queued',
  pending_queue: 'In Queue',
  researching: 'Researching Account',
  contact_review: 'Contact Review Ready',
  writing: 'Writing Playbook',
  reviewing: 'Quality Review',
  complete: 'Complete',
  error: 'Error',
  rejected: 'Rejected',
  failed: 'Failed',
  cancelled: 'Cancelled',
}

const STATUS_BADGE: Record<PlaybookStatus, string> = {
  draft: 'bg-white/10 text-white border-white/20',
  queued: 'bg-white/10 text-white border-white/20',
  pending_queue: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  researching: 'bg-[#339af0]/15 text-[#339af0] border-[#339af0]/30',
  contact_review: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  writing: 'bg-[#339af0]/15 text-[#339af0] border-[#339af0]/30',
  reviewing: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  complete: 'bg-green-500/15 text-green-400 border-green-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
  rejected: 'bg-red-500/15 text-red-400 border-red-500/30',
  failed: 'bg-red-500/15 text-red-400 border-red-500/30',
  cancelled: 'bg-red-500/15 text-red-400 border-red-500/30',
}

// Event type → display style. Anything unknown falls back to "info".
const EVENT_STYLE: Record<string, { Icon: React.ElementType; color: string }> = {
  'playbook.created':     { Icon: Zap,          color: 'text-[#339af0]' },
  'generation.queued':    { Icon: Clock,        color: 'text-[#a1a1aa]' },
  'run.started':          { Icon: Activity,     color: 'text-[#339af0]' },
  'run.prompt_built':     { Icon: PenLine,      color: 'text-[#a1a1aa]' },
  'contacts.discovered':  { Icon: Users,        color: 'text-green-400' },
  'contacts.ready':       { Icon: ShieldCheck,  color: 'text-amber-400' },
  'contacts.approved':    { Icon: CheckCircle2, color: 'text-green-400' },
  'writing.queued':       { Icon: Clock,        color: 'text-[#a1a1aa]' },
  'playbook.complete':    { Icon: CheckCircle2, color: 'text-green-400' },
  'run.failed':           { Icon: AlertCircle,  color: 'text-red-400' },
  'run.stale_cancelled':  { Icon: AlertCircle,  color: 'text-amber-400' },
}

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `0:${seconds.toString().padStart(2, '0')}`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}:${remaining.toString().padStart(2, '0')}`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins.toString().padStart(2, '0')}m`
}

function timeAgo(iso: string, nowMs: number): string {
  const diff = Math.max(0, Math.floor((nowMs - new Date(iso).getTime()) / 1000))
  if (diff < 60) return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

// ─────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────

function AgentStatusBadge({ status }: { status: AgentStatus['status'] }) {
  if (status === 'running') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#339af0] bg-[#339af0]/10 border border-[#339af0]/25 px-1.5 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-[#339af0] animate-pulse" />
        Running
      </span>
    )
  }
  if (status === 'complete') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-green-400 bg-green-500/10 border border-green-500/25 px-1.5 py-0.5 rounded-full">
        <CheckCircle2 className="w-2.5 h-2.5" />
        Complete
      </span>
    )
  }
  if (status === 'error') {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-red-400 bg-red-500/10 border border-red-500/25 px-1.5 py-0.5 rounded-full">
        <AlertCircle className="w-2.5 h-2.5" />
        Error
      </span>
    )
  }
  return (
    <span className="inline-flex text-[10px] font-semibold text-[#a1a1aa] bg-white/[0.06] border border-white/10 px-1.5 py-0.5 rounded-full">
      Pending
    </span>
  )
}

function AgentCard({ agentStatus }: { agentStatus: AgentStatus }) {
  const { label, Icon, description } = AGENT_META[agentStatus.agent]
  const { status, task, detail } = agentStatus

  return (
    <Card
      className={cn(
        'bg-[#141419] border p-5 transition-all duration-300',
        status === 'running'
          ? 'border-[#339af0]/30 shadow-[0_0_20px_rgba(51,154,240,0.07)]'
          : status === 'complete'
            ? 'border-green-500/20'
            : status === 'error'
              ? 'border-red-500/20'
              : 'border-white/[0.06]',
      )}
    >
      <div className="flex items-start gap-3">
        <div
          className={cn(
            'w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 border',
            status === 'running'
              ? 'bg-[#1e3a5f] border-[#339af0]/30'
              : status === 'complete'
                ? 'bg-green-500/10 border-green-500/20'
                : status === 'error'
                  ? 'bg-red-500/10 border-red-500/20'
                  : 'bg-white/[0.03] border-white/10',
          )}
        >
          <Icon
            className={cn(
              'w-4 h-4',
              status === 'running'
                ? 'text-[#339af0]'
                : status === 'complete'
                  ? 'text-green-400'
                  : status === 'error'
                    ? 'text-red-400'
                    : 'text-[#a1a1aa]',
            )}
          />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-sm font-semibold text-white">{label}</span>
            <AgentStatusBadge status={status} />
          </div>
          <p className="text-xs text-[#a1a1aa] leading-relaxed">{task}</p>
          {detail && <p className="text-xs text-[#339af0]/70 mt-1">{detail}</p>}
          {status === 'pending' && (
            <p className="text-[11px] text-[#a1a1aa]/50 mt-1 italic">{description}</p>
          )}
        </div>
      </div>
    </Card>
  )
}

function CounterBox({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: React.ElementType
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-white/[0.06] bg-[#141419] p-4">
      <div className="flex items-center gap-1.5 mb-1.5">
        <Icon className="w-3.5 h-3.5 text-[#339af0]" />
        <span className="text-[10px] text-[#a1a1aa] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-2xl font-bold text-white tabular-nums">{value}</p>
      {hint && <p className="text-[10px] text-[#a1a1aa] mt-0.5">{hint}</p>}
    </div>
  )
}

function ActivityFeed({ events, nowMs }: { events: ApiEvent[]; nowMs: number }) {
  if (events.length === 0) {
    return (
      <div className="text-center py-8">
        <Activity className="w-5 h-5 text-[#a1a1aa]/40 mx-auto mb-2" />
        <p className="text-xs text-[#a1a1aa]">Waiting for agent activity…</p>
      </div>
    )
  }

  return (
    <ol className="space-y-3">
      {events.map((event) => {
        const style = EVENT_STYLE[event.type] ?? { Icon: Info, color: 'text-[#a1a1aa]' }
        const Icon = style.Icon
        return (
          <li key={event.id} className="flex items-start gap-3">
            <div className="w-6 h-6 rounded-full bg-white/[0.04] border border-white/[0.06] flex items-center justify-center flex-shrink-0 mt-0.5">
              <Icon className={cn('w-3 h-3', style.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs text-white leading-snug">{event.message}</p>
              <p className="text-[10px] text-[#a1a1aa] mt-0.5">{timeAgo(event.created_at, nowMs)}</p>
            </div>
          </li>
        )
      })}
    </ol>
  )
}

// ─────────────────────────────────────────────────────────
// Live elapsed timer — DB-grounded, ticks every second
// ─────────────────────────────────────────────────────────

function useLiveNow(intervalMs = 1000) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  return now
}

// ─────────────────────────────────────────────────────────
// Stages
// ─────────────────────────────────────────────────────────

const STAGES = ['Research', 'Contacts', 'Writing', 'Review'] as const

function getStageIndex(status: PlaybookStatus): number {
  if (status === 'researching') return 0
  if (status === 'contact_review') return 1
  if (status === 'writing') return 2
  if (status === 'reviewing' || status === 'complete') return 3
  return 0
}

// ─────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────

export default function ProcessingPage() {
  const params = useParams()
  const id = params.id as string
  const router = useRouter()
  const [statusData, setStatusData] = useState<StatusData | null>(null)
  const [pageError, setPageError] = useState<string | null>(null)
  const [mounted, setMounted] = useState(false)
  const [retrying, setRetrying] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  // Bumped after a successful retry so the polling effect tears down & restarts
  // (the previous interval cleared itself when status hit 'error').
  const [pollKey, setPollKey] = useState(0)
  const nowMs = useLiveNow(1000)
  const redirectedRef = useRef(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>

    async function poll() {
      try {
        const res = await fetch(`/api/playbooks/${id}/status`, { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { data: StatusData }
        setStatusData(json.data)

        if (redirectedRef.current) return

        if (json.data.status === 'contact_review') {
          redirectedRef.current = true
          clearInterval(intervalId)
          router.push(`/playbook/${id}/contacts`)
        } else if (json.data.status === 'complete') {
          redirectedRef.current = true
          clearInterval(intervalId)
          router.push(`/playbook/${id}`)
        } else if (
          json.data.status === 'error' ||
          json.data.status === 'rejected' ||
          json.data.status === 'failed' ||
          json.data.status === 'cancelled'
        ) {
          clearInterval(intervalId)
        }
      } catch (err) {
        console.error('[processing] poll error:', err)
      }
    }

    poll()
    intervalId = setInterval(poll, 3000)
    return () => clearInterval(intervalId)
  }, [id, router, pollKey])

  // DB-grounded elapsed time — survives browser reload / tab close.
  // When a run is currently running, we add the live delta on top of
  // agent_runtime_seconds so the timer ticks smoothly between polls.
  const elapsedSeconds = useMemo(() => {
    if (!statusData) return 0
    const persisted = statusData.agent_runtime_seconds ?? 0
    const run = statusData.active_run
    if (run?.status === 'running' && run.started_at) {
      // The persisted value already includes (now-at-last-poll - startedAt),
      // so we recompute from startedAt directly to keep the timer in sync.
      return Math.max(persisted, Math.floor((nowMs - new Date(run.started_at).getTime()) / 1000))
    }
    return persisted
  }, [statusData, nowMs])

  if (pageError) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="w-14 h-14 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">⚠️</span>
          </div>
          <p className="text-red-400 mb-4 text-sm">{pageError}</p>
          <Link href="/dashboard" className="text-[#339af0] text-sm hover:underline">
            ← Go to dashboard
          </Link>
        </div>
      </div>
    )
  }

  // Don't render dynamic content until client-side hydration is complete
  // and we have a valid playbook ID from the URL
  if (!mounted || !id || id === 'undefined') {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center mx-auto mb-5">
            <Zap className="w-7 h-7 text-[#339af0] animate-pulse" />
          </div>
          <p className="text-white font-semibold text-lg mb-1">Loading playbook…</p>
          <p className="text-[#a1a1aa] text-sm">Preparing your research pipeline</p>
        </div>
      </div>
    )
  }

  const currentStatus: PlaybookStatus = statusData?.status ?? 'researching'
  const progress = statusData?.progress_pct ?? 0
  const activeStage = getStageIndex(currentStatus)
  const counters = statusData?.counters
  const events = statusData?.recent_events ?? []
  const activePhase = statusData?.active_run?.phase ?? null

  const agentMap = new Map(statusData?.agent_status.map((a) => [a.agent, a]))
  const agentStatuses = AGENT_ORDER.map(
    (agent) => agentMap.get(agent) ?? { agent, task: 'Awaiting previous stage…', status: 'pending' as const },
  )

  const isActive = !['complete', 'error', 'rejected', 'failed', 'cancelled'].includes(currentStatus)
  const isErrored = (['error', 'rejected', 'failed', 'cancelled'] as PlaybookStatus[]).includes(currentStatus)

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-sm text-white">ABMSignal</span>
          </Link>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#a1a1aa]">
              <Clock className="w-3.5 h-3.5" />
              <span className="tabular-nums font-medium">{formatElapsed(elapsedSeconds)}</span>
              <span className="text-[10px]">agent time</span>
            </div>
            <Link
              href="/dashboard"
              className="text-xs text-[#a1a1aa] hover:text-white transition-colors inline-flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3 h-3" />
              Dashboard
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* "You can close this tab" banner — only shown while still running */}
        {isActive && (
          <Card className="bg-gradient-to-br from-[#1e3a5f]/30 via-[#141419] to-[#141419] border-[#339af0]/20 p-4 mb-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-[#339af0]/5 rounded-full blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center flex-shrink-0">
                <Info className="w-4 h-4 text-[#339af0]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-white">
                  Your playbook is being generated in the background.
                </p>
                <p className="text-xs text-[#a1a1aa] mt-1 leading-relaxed">
                  Feel free to close this tab — generation continues on our servers. You can return to
                  your{' '}
                  <Link href="/dashboard" className="text-[#339af0] hover:underline font-medium">
                    dashboard
                  </Link>
                  {' '}anytime to see live progress, or come back later when it&apos;s done.
                </p>
              </div>
            </div>
          </Card>
        )}

        {/* Header */}
        <div className="mb-8 text-center">
          <div
            className={cn(
              'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold border mb-4',
              STATUS_BADGE[currentStatus],
            )}
          >
            {isActive && <Loader2 className="w-3 h-3 animate-spin" />}
            {STATUS_LABELS[currentStatus]}
          </div>
          <h1 className="font-heading text-2xl font-bold text-white mb-2">
            {currentStatus === 'complete' ? 'Playbook Ready' : 'Generating Your ABM Playbook'}
          </h1>
          <p className="text-sm text-[#a1a1aa] max-w-md mx-auto">
            {currentStatus === 'complete'
              ? 'Your playbook is ready to view.'
              : 'Your AI agent swarm is researching the target account and crafting hyper-personalized outreach.'}
          </p>
        </div>

        {/* Progress bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-[#a1a1aa]">Overall Progress</span>
            <span className="text-xs font-semibold text-white">{progress}%</span>
          </div>
          <Progress value={progress} className="h-2 bg-white/[0.06] [&>div]:bg-[#339af0]" />
          <div className="flex items-center justify-between mt-2">
            {STAGES.map((stage, i) => (
              <span
                key={stage}
                className={cn(
                  'text-[10px] font-medium transition-colors',
                  i === activeStage
                    ? 'text-[#339af0]'
                    : i < activeStage
                      ? 'text-green-400'
                      : 'text-[#a1a1aa]/50',
                )}
              >
                {stage}
              </span>
            ))}
          </div>
        </div>

        {/* Counter widgets — show live progress numbers */}
        {counters && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            <CounterBox
              icon={Clock}
              label="Agent time"
              value={formatElapsed(elapsedSeconds)}
              hint={activePhase ? `Current phase: ${activePhase}` : 'across all phases'}
            />
            <CounterBox
              icon={Users}
              label="Contacts found"
              value={counters.contacts_found}
              hint={counters.contacts_found === 0 ? 'discovering…' : 'verified during research'}
            />
            <CounterBox
              icon={FileText}
              label="Sources gathered"
              value={counters.sources_count}
              hint={counters.sources_count === 0 ? 'collecting…' : 'cited in playbook'}
            />
            <CounterBox
              icon={BookOpen}
              label="Sections drafted"
              value={`${counters.sections_complete}/${counters.sections_total}`}
              hint={counters.sections_complete === 0 ? 'writing starts after contact review' : 'completed sections'}
            />
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 mb-8">
          {/* Agent cards */}
          <div className="lg:col-span-3 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {agentStatuses.map((agentStatus) => (
              <AgentCard key={agentStatus.agent} agentStatus={agentStatus} />
            ))}
          </div>

          {/* Live activity feed */}
          <Card className="lg:col-span-2 bg-[#141419] border-white/[0.06] p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#339af0]" />
                <h2 className="text-sm font-semibold text-white">Live Activity</h2>
              </div>
              {isActive && (
                <span className="text-[10px] text-[#a1a1aa] inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#339af0] animate-pulse" />
                  Streaming
                </span>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto pr-1">
              <ActivityFeed events={events} nowMs={nowMs} />
            </div>
          </Card>
        </div>

        {/* What's happening explainer */}
        <Card className="bg-[#141419] border-white/[0.06] p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-0.5">What&apos;s happening?</p>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                {currentStatus === 'researching' &&
                  'The research agent is running Universal Deep Research loops across public data sources to build a full account intelligence dossier. Once contacts are discovered, you’ll review and verify them before the writer agent begins crafting personalized sequences.'}
                {currentStatus === 'pending_queue' &&
                  'This playbook is waiting in your queue. Your other playbook is still generating — as soon as it reaches the contact review step or completes, this one will start automatically. You can close this tab; we\'ll run it in the background.'}
                {currentStatus === 'queued' &&
                  'Your playbook is queued and will start within moments. The orchestrator is preparing the research pipeline.'}
                {currentStatus === 'contact_review' &&
                  'Research is complete and contacts are ready. We’ve paused here so you can verify each contact before the writer agent invests time drafting personalized outreach.'}
                {currentStatus === 'writing' &&
                  'The writer agent is drafting 18 hyper-personalized sections — from account snapshot to deal execution plan — grounded in your verified contacts and the research signals.'}
                {currentStatus === 'reviewing' &&
                  'The reviewer agent is running its 16-point quality checklist: fact verification, source confidence, cultural fit, and internal consistency.'}
                {currentStatus === 'complete' &&
                  'All four agents have completed their work. Your playbook is ready.'}
                {isErrored &&
                  'Something went wrong during generation. You can retry or contact support if the issue persists.'}
              </p>
            </div>
          </div>
        </Card>

        {/* Error / Rejected / Failed / Cancelled state — recovery options.
            The brief + target account are already saved against this playbook,
            so retry kicks a brand-new run with the same inputs. Delete wipes
            the whole playbook (and any in-flight job) for a fresh start. */}
        {isErrored && (
          <div className="mt-8">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
              <p className="text-sm text-red-400 mb-1 font-medium">
                {currentStatus === 'rejected'
                  ? "We couldn't complete this playbook"
                  : currentStatus === 'cancelled'
                    ? 'Playbook generation was cancelled'
                    : "Generation didn't finish"}
              </p>
              <p className="text-xs text-[#a1a1aa]">
                {currentStatus === 'rejected'
                  ? 'We were unable to process this request — this can happen when the product brief is too sparse for the agent to work with. Try adding more detail and regenerating.'
                  : statusData?.failed_reason
                    ? statusData.failed_reason
                    : "Something went wrong while generating your playbook. Your inputs are saved — please retry. If the issue persists, contact our support team and we'll help."}
              </p>
              {(statusData?.product_name || statusData?.target_company) && (
                <p className="text-[11px] text-[#a1a1aa]/80 mt-2">
                  Your product brief & target account are saved — retry reuses them automatically.
                </p>
              )}
            </div>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-center gap-3">
              <Button
                onClick={async () => {
                  setRetrying(true)
                  try {
                    const res = await fetch(`/api/playbooks/${id}/generate`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: '{}',
                    })
                    if (!res.ok) throw new Error(`Retry failed (${res.status})`)
                    const statusRes = await fetch(`/api/playbooks/${id}/status`, { cache: 'no-store' })
                    if (statusRes.ok) {
                      const json = (await statusRes.json()) as { data: StatusData }
                      setStatusData(json.data)
                      redirectedRef.current = false
                    }
                    // Restart the polling effect — the previous interval cleared
                    // itself when status hit 'error', so without this the live
                    // updates wouldn't resume after retry.
                    setPollKey(k => k + 1)
                  } catch (err) {
                    console.error('[retry] failed:', err)
                    setPageError('Failed to retry generation. Please try again.')
                  } finally {
                    setRetrying(false)
                  }
                }}
                disabled={retrying}
                className="bg-[#339af0] hover:bg-[#2b8ad8] text-white font-medium gap-2"
              >
                {retrying ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Retrying…
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-4 h-4" />
                    Retry generation
                  </>
                )}
              </Button>
              <Button
                onClick={() => setDeleteOpen(true)}
                disabled={retrying}
                variant="outline"
                className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 gap-2"
              >
                <Trash2 className="w-4 h-4" />
                Delete playbook
              </Button>
              <a
                href={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
                  `Playbook generation issue (${id})`,
                )}&body=${encodeURIComponent(
                  `Hi team,\n\nMy playbook (ID: ${id}) failed to generate. Please investigate.\n\nThanks,`,
                )}`}
                className={cn(
                  buttonVariants({ variant: 'ghost' }),
                  'text-[#a1a1aa] hover:text-white hover:bg-white/[0.04] gap-2',
                )}
              >
                <LifeBuoy className="w-4 h-4" />
                Contact support
              </a>
            </div>
            <p className="text-[11px] text-[#a1a1aa]/70 mt-3 text-center">
              Reference ID for support: <span className="font-mono text-[#a1a1aa]">{id}</span>
            </p>
          </div>
        )}
      </div>

      <DeletePlaybookDialog
        playbookId={id}
        productName={statusData?.product_name ?? ''}
        targetCompany={statusData?.target_company ?? 'this playbook'}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
      />
    </div>
  )
}
