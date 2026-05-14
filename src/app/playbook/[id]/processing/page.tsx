'use client'

import { useEffect, useRef, useState } from 'react'
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
} from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { AgentStatus, PlaybookStatus } from '@/types'

// ─────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────

interface StatusData {
  playbook_id: string
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
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
  researching: 'Researching Account',
  contact_review: 'Contact Review Ready',
  writing: 'Writing Playbook',
  reviewing: 'Quality Review',
  complete: 'Complete',
  error: 'Error',
}

const STATUS_BADGE: Record<PlaybookStatus, string> = {
  draft: 'bg-white/10 text-white border-white/20',
  researching: 'bg-[#339af0]/15 text-[#339af0] border-[#339af0]/30',
  contact_review: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
  writing: 'bg-[#339af0]/15 text-[#339af0] border-[#339af0]/30',
  reviewing: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  complete: 'bg-green-500/15 text-green-400 border-green-500/30',
  error: 'bg-red-500/15 text-red-400 border-red-500/30',
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

// ─────────────────────────────────────────────────────────
// Elapsed timer hook
// ─────────────────────────────────────────────────────────

function useElapsedTime(startMs: number) {
  const [elapsed, setElapsed] = useState(0)

  useEffect(() => {
    const id = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startMs) / 1000))
    }, 1000)
    return () => clearInterval(id)
  }, [startMs])

  const min = Math.floor(elapsed / 60)
  const sec = elapsed % 60
  return `${min}:${sec.toString().padStart(2, '0')}`
}

// ─────────────────────────────────────────────────────────
// Stage labels for progress track
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
  const [startMs] = useState(() => Date.now())
  const elapsed = useElapsedTime(startMs)
  const redirectedRef = useRef(false)

  useEffect(() => {
    let intervalId: ReturnType<typeof setInterval>

    async function poll() {
      try {
        const res = await fetch(`/api/playbooks/${id}/status`)
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
        } else if (json.data.status === 'error') {
          clearInterval(intervalId)
        }
      } catch (err) {
        console.error('[processing] poll error:', err)
      }
    }

    poll()
    intervalId = setInterval(poll, 3000)
    return () => clearInterval(intervalId)
  }, [id, router])

  const currentStatus: PlaybookStatus = statusData?.status ?? 'researching'
  const progress = statusData?.progress_pct ?? 0
  const activeStage = getStageIndex(currentStatus)

  const agentMap = new Map(statusData?.agent_status.map((a) => [a.agent, a]))
  const agentStatuses = AGENT_ORDER.map(
    (agent) => agentMap.get(agent) ?? { agent, task: 'Awaiting previous stage…', status: 'pending' as const },
  )

  const isActive = currentStatus !== 'complete' && currentStatus !== 'error'

  return (
    <div className="min-h-screen bg-[#0a0a0f]">
      {/* Navbar */}
      <div className="border-b border-white/[0.06] bg-[#0a0a0f]/80 backdrop-blur-xl sticky top-0 z-30">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <span className="font-heading font-bold text-sm text-white">ABMSignal</span>
          </Link>
          <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
            <Clock className="w-3.5 h-3.5" />
            <span>{elapsed}</span>
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10">
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
            Generating Your ABM Playbook
          </h1>
          <p className="text-sm text-[#a1a1aa] max-w-md mx-auto">
            Your AI agent swarm is researching the target account and crafting
            hyper-personalized outreach. You&apos;ll be asked to verify contacts before writing
            begins.
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

        {/* Agent cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {agentStatuses.map((agentStatus) => (
            <AgentCard key={agentStatus.agent} agentStatus={agentStatus} />
          ))}
        </div>

        {/* Info card */}
        <Card className="bg-[#141419] border-white/[0.06] p-4">
          <div className="flex items-start gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#1e3a5f] border border-[#339af0]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
              <Zap className="w-3.5 h-3.5 text-[#339af0]" />
            </div>
            <div>
              <p className="text-sm font-medium text-white mb-0.5">What&apos;s happening?</p>
              <p className="text-xs text-[#a1a1aa] leading-relaxed">
                The research agent is running Universal Deep Research loops across public data
                sources to build a full account intelligence dossier. Once contacts are
                discovered, you&apos;ll review and verify them before the writer agent begins
                crafting personalized sequences.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}
