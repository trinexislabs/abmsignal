import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import { requestPlaybookGeneration, healthCheck } from '@/lib/openclaw/client'

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
  let mode: 'openclaw' | 'simulation' = 'simulation'

  // Try to reach OpenClaw and send the generation request
  const isHealthy = await healthCheck()
  if (isHealthy) {
    const result = await requestPlaybookGeneration({
      playbookId: id,
      productName: playbook.product_name,
      productDescription: playbook.product_brief.description,
      valuePropositions: playbook.product_brief.value_propositions,
      targetCompany: playbook.target_company,
      industry: playbook.industry,
      geography: playbook.geography,
      priorityTier: playbook.priority_tier,
      productUrl: playbook.product_url,
      competitors: playbook.product_brief.competitors,
      deploymentModel: playbook.product_brief.deployment_model,
      dealSize: playbook.product_brief.deal_size,
      salesCycle: playbook.product_brief.sales_cycle,
    })

    if (result.ok) {
      mode = 'openclaw'
    } else {
      console.error('[generate] OpenClaw hook failed, using simulation:', result.error)
    }
  } else {
    console.error('[generate] OpenClaw gateway unreachable, using simulation')
  }

  updatePlaybook(id, {
    status: 'researching',
    progress_pct: 0,
    simulation_started_at: now,
    phase_started_at: now,
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Coordinating research pipeline',
        status: 'running',
        detail: mode === 'openclaw' ? 'OpenClaw orchestrator dispatched' : 'Simulation mode',
      },
      { agent: 'researcher', task: 'Starting account research', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
  })

  return NextResponse.json({
    data: {
      playbook_id: id,
      mode,
    },
  })
}