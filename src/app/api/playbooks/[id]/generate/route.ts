import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import { spawnAgent } from '@/lib/openclaw/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const now = new Date().toISOString()

  let sessionId: string | undefined
  try {
    const prompt = [
      `Generate a complete ABM playbook for the following:`,
      `Product: ${playbook.product_name}`,
      `Description: ${playbook.product_brief.description}`,
      `Value Props: ${playbook.product_brief.value_propositions.join(', ')}`,
      `Target Company: ${playbook.target_company}`,
      `Industry: ${playbook.industry}`,
      `Geography: ${playbook.geography}`,
      `Priority Tier: ${playbook.priority_tier}`,
      ``,
      `Generate all 12 playbook sections with hyper-personalized content.`,
      `Include contact discovery and 16-point quality review.`,
    ].join('\n')

    const result = await spawnAgent('orchestrator', prompt)
    sessionId = result.sessionId
  } catch (err) {
    // OpenClaw not reachable — continue with simulation
    console.error('[generate] OpenClaw unreachable, using simulation:', err)
  }

  updatePlaybook(id, {
    status: 'researching',
    progress_pct: 0,
    simulation_started_at: now,
    phase_started_at: now,
    openclaw_session_id: sessionId,
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Coordinating research pipeline',
        status: 'running',
        detail: sessionId ? `OpenClaw session: ${sessionId}` : 'Simulation mode',
      },
      { agent: 'researcher', task: 'Starting account research', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
  })

  return NextResponse.json({
    data: {
      playbook_id: id,
      session_id: sessionId ?? null,
      mode: sessionId ? 'openclaw' : 'simulation',
    },
  })
}
