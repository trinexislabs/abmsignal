import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import type { AgentStatus, PlaybookStatus } from '@/types'

interface SimulatedStatus {
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
}

function simulateProgress(
  currentStatus: PlaybookStatus,
  simulationStartedAt: string | undefined,
  phaseStartedAt: string | undefined,
): SimulatedStatus | null {
  // Only simulate if generation has been triggered
  if (!simulationStartedAt) return null

  // These statuses are terminal or manual gates — don't simulate
  if (currentStatus === 'complete' || currentStatus === 'error' || currentStatus === 'draft') {
    return null
  }
  if (currentStatus === 'contact_review') return null

  const now = Date.now()
  const simElapsedSec = (now - new Date(simulationStartedAt).getTime()) / 1000

  if (currentStatus === 'researching') {
    // Phase 1: 0–30s → 0–30%
    if (simElapsedSec < 30) {
      const pct = Math.floor((simElapsedSec / 30) * 30)
      return {
        status: 'researching',
        progress_pct: pct,
        agent_status: [
          {
            agent: 'orchestrator',
            task: 'Coordinating research pipeline',
            status: 'running',
            detail: `${pct}% initialised`,
          },
          {
            agent: 'researcher',
            task: simElapsedSec > 15 ? 'Deep account research in progress' : 'Starting account research',
            status: simElapsedSec > 15 ? 'running' : 'pending',
          },
          { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
          { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
        ],
      }
    }
    // Phase 2: 30–60s → 30–40%
    if (simElapsedSec < 60) {
      const pct = 30 + Math.floor(((simElapsedSec - 30) / 30) * 10)
      const contactsFound = Math.floor(((simElapsedSec - 30) / 30) * 12)
      return {
        status: 'researching',
        progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Processing research findings', status: 'running' },
          {
            agent: 'researcher',
            task: 'Discovering contacts and buying signals',
            status: 'running',
            detail: `${contactsFound} contacts found so far`,
          },
          { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
          { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
        ],
      }
    }
    // Transition to contact_review at 1 min
    return {
      status: 'contact_review',
      progress_pct: 40,
      agent_status: [
        {
          agent: 'orchestrator',
          task: 'Contact verification gate — awaiting human review',
          status: 'running',
          detail: 'Paused at verification checkpoint',
        },
        {
          agent: 'researcher',
          task: 'Account research complete',
          status: 'complete',
          completed_at: new Date(
            new Date(simulationStartedAt).getTime() + 170_000,
          ).toISOString(),
        },
        { agent: 'writer', task: 'Waiting for verified contacts', status: 'pending' },
        { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
      ],
    }
  }

  const phaseStart = phaseStartedAt ? new Date(phaseStartedAt).getTime() : now
  const phaseElapsedSec = (now - phaseStart) / 1000

  if (currentStatus === 'writing') {
    if (phaseElapsedSec < 45) {
      const pct = 40 + Math.floor((phaseElapsedSec / 45) * 35)
      const sectionNum = Math.min(8, Math.floor((phaseElapsedSec / 45) * 8) + 1)
      return {
        status: 'writing',
        progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Managing writing pipeline', status: 'running' },
          { agent: 'researcher', task: 'Account research complete', status: 'complete' },
          {
            agent: 'writer',
            task: 'Generating hyper-personalized sections',
            status: 'running',
            detail: `Section ${sectionNum} of 8`,
          },
          {
            agent: 'reviewer',
            task: 'Reviewing completed sections',
            status: phaseElapsedSec > 30 ? 'running' : 'pending',
          },
        ],
      }
    }
    // Transition to reviewing
    return {
      status: 'reviewing',
      progress_pct: 75,
      agent_status: [
        { agent: 'orchestrator', task: 'Quality review in progress', status: 'running' },
        { agent: 'researcher', task: 'Account research complete', status: 'complete' },
        { agent: 'writer', task: 'Content generation complete', status: 'complete' },
        {
          agent: 'reviewer',
          task: 'Running 16-point quality checklist',
          status: 'running',
          detail: 'Checking accuracy and consistency',
        },
      ],
    }
  }

  if (currentStatus === 'reviewing') {
    if (phaseElapsedSec < 30) {
      const pct = 75 + Math.floor((phaseElapsedSec / 30) * 20)
      const checkNum = Math.min(16, Math.floor((phaseElapsedSec / 30) * 16) + 1)
      return {
        status: 'reviewing',
        progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Finalizing playbook', status: 'running' },
          { agent: 'researcher', task: 'Account research complete', status: 'complete' },
          { agent: 'writer', task: 'Content generation complete', status: 'complete' },
          {
            agent: 'reviewer',
            task: `Quality check ${checkNum} of 16`,
            status: 'running',
            detail: `${pct}% verified`,
          },
        ],
      }
    }
    // Transition to complete
    const completedAt = new Date().toISOString()
    return {
      status: 'complete',
      progress_pct: 100,
      agent_status: [
        {
          agent: 'orchestrator',
          task: 'Playbook generation complete',
          status: 'complete',
          completed_at: completedAt,
        },
        { agent: 'researcher', task: 'Account research complete', status: 'complete' },
        { agent: 'writer', task: 'Content generation complete', status: 'complete' },
        {
          agent: 'reviewer',
          task: '16-point quality check complete',
          status: 'complete',
          completed_at: completedAt,
        },
      ],
    }
  }

  return null
}

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const simulated = simulateProgress(
    playbook.status,
    playbook.simulation_started_at,
    playbook.phase_started_at,
  )

  if (simulated) {
    if (simulated.status !== playbook.status) {
      // Status transition — persist and reset phase timer
      updatePlaybook(id, {
        status: simulated.status,
        progress_pct: simulated.progress_pct,
        agent_status: simulated.agent_status,
        phase_started_at: new Date().toISOString(),
      })
    } else {
      // Progress-only update
      updatePlaybook(id, {
        progress_pct: simulated.progress_pct,
        agent_status: simulated.agent_status,
      })
    }
  }

  const current = simulated ?? {
    status: playbook.status,
    progress_pct: playbook.progress_pct,
    agent_status: playbook.agent_status,
  }

  return NextResponse.json({
    data: {
      playbook_id: id,
      status: current.status,
      progress_pct: current.progress_pct,
      agent_status: current.agent_status,
    },
  })
}
