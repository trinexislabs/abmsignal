'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  Activity,
  Clock,
  ArrowRight,
  Network,
  Search,
  PenLine,
  ShieldCheck,
  FileText,
  Users,
  BookOpen,
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { cn } from '@/lib/utils'
import type { AgentStatus, PlaybookStatus } from '@/types'

interface ApiActivePlaybook {
  id: string
  product_name: string
  target_company: string
  status: PlaybookStatus
  progress_pct: number
  current_agent: AgentStatus['agent'] | null
  current_task: string | null
  active_run: {
    id: string
    phase: 'research' | 'writing' | 'review'
    status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
    started_at: string | null
    created_at: string
  } | null
  agent_runtime_seconds: number
  counters: {
    sections_total: number
    sections_complete: number
    contacts_found: number
    sources_count: number
  }
  created_at: string
  updated_at: string
}

const AGENT_ICON: Record<AgentStatus['agent'], React.ElementType> = {
  orchestrator: Network,
  researcher: Search,
  writer: PenLine,
  reviewer: ShieldCheck,
}

const AGENT_LABEL: Record<AgentStatus['agent'], string> = {
  orchestrator: 'Orchestrator',
  researcher: 'Researcher',
  writer: 'Writer',
  reviewer: 'Reviewer',
}

function formatElapsed(seconds: number): string {
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remaining = seconds % 60
  if (minutes < 60) return `${minutes}m ${remaining.toString().padStart(2, '0')}s`
  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60
  return `${hours}h ${mins.toString().padStart(2, '0')}m`
}

function ActivePlaybookCard({ playbook, nowMs }: { playbook: ApiActivePlaybook; nowMs: number }) {
  // Prefer live tick on top of DB-grounded runtime: agent_runtime_seconds is what
  // the server saw last refresh, and we add the delta since the active run's
  // startedAt so the timer ticks smoothly between polls.
  const activeStart = playbook.active_run?.started_at
    ? new Date(playbook.active_run.started_at).getTime()
    : null
  const liveDelta =
    activeStart && playbook.active_run?.status === 'running'
      ? Math.max(0, Math.floor((nowMs - activeStart) / 1000))
      : 0
  // For elapsed display, prefer the smoother live delta when a run is actively
  // running; otherwise show the persisted total (e.g. between research and writing).
  const elapsedSeconds =
    playbook.active_run?.status === 'running' ? liveDelta : playbook.agent_runtime_seconds

  const AgentIcon = playbook.current_agent ? AGENT_ICON[playbook.current_agent] : Activity
  const agentLabel = playbook.current_agent ? AGENT_LABEL[playbook.current_agent] : 'Coordinating'

  const isAwaitingHuman = playbook.status === 'contact_review'

  return (
    <Card className="bg-[#111827] border-[#10B981]/15 hover:border-[#10B981]/30 transition-all p-5 relative overflow-hidden group">
      {/* Pulsing accent glow when actively running */}
      {playbook.active_run?.status === 'running' && (
        <div className="absolute -top-12 -right-12 w-32 h-32 bg-[#10B981]/8 rounded-full blur-3xl pointer-events-none" />
      )}

      <div className="relative flex items-start justify-between mb-3">
        <div className="min-w-0 flex-1 pr-3">
          <p className="text-sm font-semibold text-white truncate">{playbook.target_company}</p>
          <p className="text-[11px] text-[#9CA3AF] truncate">{playbook.product_name}</p>
        </div>
        <StatusBadge status={playbook.status} />
      </div>

      {/* Progress bar */}
      <div className="relative mb-3">
        <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
          <div
            className={cn(
              'h-full rounded-full transition-all duration-700',
              isAwaitingHuman ? 'bg-amber-400' : 'bg-[#10B981]',
            )}
            style={{ width: `${Math.max(2, playbook.progress_pct)}%` }}
          />
        </div>
        <p className="text-[10px] text-[#9CA3AF] mt-1.5">{playbook.progress_pct}% complete</p>
      </div>

      {/* Current activity */}
      <div className="relative flex items-start gap-2.5 mb-3 px-3 py-2 rounded-lg bg-white/[0.02] border border-[#1F2937]">
        <div
          className={cn(
            'w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0',
            playbook.active_run?.status === 'running'
              ? 'bg-[#0B3D2E] border border-[#10B981]/30'
              : 'bg-white/[0.04] border border-[#374151]',
          )}
        >
          <AgentIcon
            className={cn(
              'w-3.5 h-3.5',
              playbook.active_run?.status === 'running' ? 'text-[#10B981]' : 'text-[#9CA3AF]',
            )}
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] font-medium text-white">{agentLabel}</span>
            {playbook.active_run?.status === 'running' && (
              <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            )}
          </div>
          <p className="text-[11px] text-[#9CA3AF] truncate">
            {isAwaitingHuman
              ? 'Awaiting your contact review'
              : (playbook.current_task ?? 'Coordinating pipeline')}
          </p>
        </div>
      </div>

      {/* Counters + timer */}
      <div className="relative grid grid-cols-3 gap-2 mb-4">
        <CounterPill icon={BookOpen} label="Sections" value={`${playbook.counters.sections_complete}/${playbook.counters.sections_total}`} />
        <CounterPill icon={Users} label="Contacts" value={playbook.counters.contacts_found} />
        <CounterPill icon={FileText} label="Sources" value={playbook.counters.sources_count} />
      </div>

      <div className="relative flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-[#9CA3AF]">
          <Clock className="w-3.5 h-3.5" />
          <span className="tabular-nums font-medium">{formatElapsed(elapsedSeconds)}</span>
          <span className="text-[10px]">
            {playbook.active_run?.status === 'running' ? 'agent time' : 'agent time so far'}
          </span>
        </div>
        <Link
          href={
            isAwaitingHuman
              ? `/playbook/${playbook.id}/contacts`
              : `/playbook/${playbook.id}/processing`
          }
          className="inline-flex items-center gap-1 text-xs text-[#10B981] hover:text-[#34D399] transition-colors font-medium"
        >
          {isAwaitingHuman ? 'Review contacts' : 'View live'}
          <ArrowRight className="w-3 h-3" />
        </Link>
      </div>
    </Card>
  )
}

function CounterPill({ icon: Icon, label, value }: { icon: React.ElementType; label: string; value: string | number }) {
  return (
    <div className="rounded-md bg-white/[0.02] border border-[#1F2937] px-2 py-1.5 text-center">
      <div className="flex items-center justify-center gap-1 mb-0.5">
        <Icon className="w-2.5 h-2.5 text-[#9CA3AF]" />
        <span className="text-[9px] text-[#9CA3AF] uppercase tracking-wider">{label}</span>
      </div>
      <p className="text-sm font-semibold text-white tabular-nums">{value}</p>
    </div>
  )
}

export function ActivePlaybooks() {
  const [playbooks, setPlaybooks] = useState<ApiActivePlaybook[] | null>(null)
  const [nowMs, setNowMs] = useState(() => Date.now())

  useEffect(() => {
    let cancelled = false

    async function fetchActive() {
      try {
        const res = await fetch('/api/playbooks/active', { cache: 'no-store' })
        if (!res.ok) return
        const json = (await res.json()) as { data: ApiActivePlaybook[] }
        if (!cancelled) setPlaybooks(json.data)
      } catch {
        // silent — dashboard remains functional without live updates
      }
    }

    fetchActive()
    const pollId = setInterval(fetchActive, 10_000)
    const tickId = setInterval(() => setNowMs(Date.now()), 1_000)

    return () => {
      cancelled = true
      clearInterval(pollId)
      clearInterval(tickId)
    }
  }, [])

  // Render nothing while initial fetch is pending OR when no active runs.
  // Avoids a flicker / empty heading on first paint and keeps the dashboard
  // clean for users with no in-progress work.
  if (!playbooks || playbooks.length === 0) return null

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity className="w-4 h-4 text-[#10B981]" />
          <h2 className="font-heading text-lg font-semibold text-white">In Progress</h2>
          <span className="text-[11px] font-semibold text-[#10B981] bg-[#10B981]/10 border border-[#10B981]/20 px-2 py-0.5 rounded-full">
            {playbooks.length}
          </span>
        </div>
        <p className="text-[11px] text-[#9CA3AF] hidden sm:block">
          Auto-refreshing — safe to close this tab anytime
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {playbooks.map((pb) => (
          <ActivePlaybookCard key={pb.id} playbook={pb} nowMs={nowMs} />
        ))}
      </div>
    </section>
  )
}
