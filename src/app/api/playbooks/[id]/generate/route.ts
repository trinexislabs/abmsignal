import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import { createPlaybookFlow, healthCheck } from '@/lib/openclaw/client'

const ENGINE_RUNNER_URL = process.env.ENGINE_RUNNER_URL ?? 'http://localhost:18793'
const ENGINE_RUNNER_API_KEY = process.env.ENGINE_RUNNER_API_KEY ?? 'abmsignal-engine-runner-2026'

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

  // Set initial status to researching — orchestrator will update via PATCH
  updatePlaybook(id, {
    status: 'researching',
    progress_pct: 0,
    phase_started_at: now,
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Coordinating research pipeline',
        status: 'running',
      },
      { agent: 'researcher', task: 'Starting account research', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
  })

  // Try to invoke the orchestrator via Engine Runner
  let mode: 'openclaw' | 'error' = 'error'
  let flowId: string | undefined

  const isHealthy = await healthCheck()
  if (isHealthy) {
    const result = await createPlaybookFlow({
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

    if (result.ok && result.flowId) {
      mode = 'openclaw'
      flowId = result.flowId

      // Invoke the orchestrator via Engine Runner (fire-and-forget)
      try {
        await fetch(`${ENGINE_RUNNER_URL}/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENGINE_RUNNER_API_KEY,
          },
          body: JSON.stringify({ flowId, playbookId: id }),
        })
        console.log(`[generate] Orchestrator invoked for flow ${flowId}`)
      } catch (err) {
        console.error('[generate] Engine Runner invoke failed:', err instanceof Error ? err.message : err)
      }
    } else {
      console.error('[generate] TaskFlow creation failed:', result.error)
      updatePlaybook(id, {
        status: 'error',
        agent_status: [
          { agent: 'orchestrator', task: 'Failed to start pipeline', status: 'error' },
        ],
      })
    }
  } else {
    console.error('[generate] OpenClaw gateway unreachable')
    updatePlaybook(id, {
      status: 'error',
      agent_status: [
        { agent: 'orchestrator', task: 'Gateway unreachable — cannot start pipeline', status: 'error' },
      ],
    })
  }

  return NextResponse.json({
    data: {
      playbook_id: id,
      mode,
      flow_id: flowId ?? null,
    },
  })
}