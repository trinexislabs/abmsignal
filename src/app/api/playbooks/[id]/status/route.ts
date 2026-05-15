import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import type { AgentStatus, PlaybookStatus, SectionType, SectionStatus } from '@/types'

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
  // Only simulate if explicitly in simulation mode
  if (!simulationStartedAt) return null

  if (currentStatus === 'complete' || currentStatus === 'error' || currentStatus === 'draft') return null
  if (currentStatus === 'contact_review') return null

  const now = Date.now()
  const simElapsedSec = (now - new Date(simulationStartedAt).getTime()) / 1000

  if (currentStatus === 'researching') {
    if (simElapsedSec < 30) {
      const pct = Math.floor((simElapsedSec / 30) * 30)
      return {
        status: 'researching',
        progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Coordinating research pipeline', status: 'running' },
          { agent: 'researcher', task: simElapsedSec > 15 ? 'Deep account research in progress' : 'Starting account research', status: simElapsedSec > 15 ? 'running' : 'pending' },
          { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
          { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
        ],
      }
    }
    if (simElapsedSec < 60) {
      const pct = 30 + Math.floor(((simElapsedSec - 30) / 30) * 10)
      return {
        status: 'researching',
        progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Processing research findings', status: 'running' },
          { agent: 'researcher', task: 'Discovering contacts and buying signals', status: 'running', detail: `${Math.floor(((simElapsedSec - 30) / 30) * 12)} contacts found` },
          { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
          { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
        ],
      }
    }
    return {
      status: 'contact_review', progress_pct: 40,
      agent_status: [
        { agent: 'orchestrator', task: 'Contact verification gate', status: 'running', detail: 'Paused for human review' },
        { agent: 'researcher', task: 'Account research complete', status: 'complete' },
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
      return {
        status: 'writing', progress_pct: pct,
        agent_status: [
          { agent: 'orchestrator', task: 'Managing writing pipeline', status: 'running' },
          { agent: 'researcher', task: 'Research complete', status: 'complete' },
          { agent: 'writer', task: `Generating section ${Math.min(8, Math.floor((phaseElapsedSec / 45) * 8) + 1)} of 8`, status: 'running' },
          { agent: 'reviewer', task: 'Reviewing sections', status: phaseElapsedSec > 30 ? 'running' : 'pending' },
        ],
      }
    }
    return { status: 'reviewing', progress_pct: 75, agent_status: [
      { agent: 'orchestrator', task: 'Quality review', status: 'running' },
      { agent: 'researcher', task: 'Research complete', status: 'complete' },
      { agent: 'writer', task: 'Writing complete', status: 'complete' },
      { agent: 'reviewer', task: 'Running quality check', status: 'running' },
    ] }
  }

  if (currentStatus === 'reviewing') {
    if (phaseElapsedSec < 30) {
      const pct = 75 + Math.floor((phaseElapsedSec / 30) * 20)
      return { status: 'reviewing', progress_pct: pct, agent_status: [
        { agent: 'orchestrator', task: 'Finalizing playbook', status: 'running' },
        { agent: 'researcher', task: 'Research complete', status: 'complete' },
        { agent: 'writer', task: 'Writing complete', status: 'complete' },
        { agent: 'reviewer', task: `Quality check ${Math.min(16, Math.floor((phaseElapsedSec / 30) * 16) + 1)} of 16`, status: 'running' },
      ] }
    }
    const completedAt = new Date().toISOString()
    return { status: 'complete', progress_pct: 100, agent_status: [
      { agent: 'orchestrator', task: 'Playbook complete', status: 'complete', completed_at: completedAt },
      { agent: 'researcher', task: 'Research complete', status: 'complete' },
      { agent: 'writer', task: 'Writing complete', status: 'complete' },
      { agent: 'reviewer', task: 'Quality check complete', status: 'complete', completed_at: completedAt },
    ] }
  }

  return null
}

// ──────────────────────────────────────────────

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  // Check for simulation fallback (only if simulation_started_at is set)
  const simulated = simulateProgress(
    playbook.status,
    playbook.simulation_started_at,
    playbook.phase_started_at,
  )

  if (simulated) {
    if (simulated.status !== playbook.status) {
      updatePlaybook(id, {
        status: simulated.status,
        progress_pct: simulated.progress_pct,
        agent_status: simulated.agent_status,
        phase_started_at: new Date().toISOString(),
      })

      // When simulation transitions to contact_review, add account-specific contacts
      if (simulated.status === 'contact_review' && (!playbook.contacts || playbook.contacts.length === 0)) {
        const { generateAccountContacts } = await import('@/lib/research/account-contacts')
        const contacts = generateAccountContacts({
          companyName: playbook.target_company,
          industry: playbook.industry,
          geography: playbook.geography,
        })
        contacts.forEach(c => { c.playbook_id = id })
        updatePlaybook(id, { contacts })
      }

      // When simulation transitions to complete, add playbook sections
      if (simulated.status === 'complete' && (!playbook.sections || playbook.sections.length === 0)) {
        const { generatePlaybookSections } = await import('@/lib/research/account-contacts')
        const generated = generatePlaybookSections({
          companyName: playbook.target_company,
          industry: playbook.industry,
          geography: playbook.geography,
        })
        // Convert GeneratedSection to PlaybookSection format
        const sectionTypeMap: Record<string, SectionType> = {
          'executive_summary': 'executive_summary',
          'account_intel': 'account_intelligence',
          'buying_committee': 'buying_committee',
          'why_now': 'why_now',
          'outreach': 'outreach_strategy',
          'competitive': 'competitive_landscape',
          'engagement': 'personalized_sequences',
          'cultural': 'cultural_context',
        }
        const sections = generated.map((s) => ({
          id: s.id,
          playbook_id: id,
          section_type: sectionTypeMap[s.type] || 'appendix' as SectionType,
          title: s.title,
          content: s.content,
          status: 'complete' as SectionStatus,
          created_at: s.created_at,
        }))
        updatePlaybook(id, { sections })
      }
    } else {
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