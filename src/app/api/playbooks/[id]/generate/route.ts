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
  let mode: 'openclaw' | 'simulation' = 'simulation'
  let flowId: string | undefined

  // Try to reach OpenClaw and create a TaskFlow
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

      // Invoke the orchestrator via Engine Runner (real-time activation)
      try {
        const goal = [
          `GENERATE ABM PLAYBOOK — ID: ${id}`,
          ``,
          `## Product`,
          `Name: ${playbook.product_name}`,
          `Description: ${playbook.product_brief.description}`,
          `Value Propositions: ${playbook.product_brief.value_propositions.join('; ')}`,
          `Competitors: ${playbook.product_brief.competitors?.join(', ') || 'N/A'}`,
          `Deployment: ${playbook.product_brief.deployment_model}`,
          `Deal Size: ${playbook.product_brief.deal_size}`,
          `Sales Cycle: ${playbook.product_brief.sales_cycle}`,
          ``,
          `## Target Account`,
          `Company: ${playbook.target_company}`,
          `Industry: ${playbook.industry}`,
          `Geography: ${playbook.geography}`,
          `Priority: ${playbook.priority_tier}`,
          ``,
          `Execute the full ABM playbook generation pipeline.`,
        ].join('\n')

        await fetch(`${ENGINE_RUNNER_URL}/invoke`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': ENGINE_RUNNER_API_KEY,
          },
          body: JSON.stringify({
            flowId,
            playbookId: id,
            goal,
          }),
        })
        console.log(`[generate] Orchestrator invoked for flow ${flowId}`)
      } catch (err) {
        console.error('[generate] Engine Runner invoke failed (orchestrator may still process via other means):', err instanceof Error ? err.message : err)
      }
    } else {
      console.error('[generate] OpenClaw TaskFlow creation failed, using simulation:', result.error)
    }
  } else {
    console.error('[generate] OpenClaw gateway unreachable, using simulation')
  }

  updatePlaybook(id, {
    status: 'researching',
    progress_pct: 0,
    simulation_started_at: mode === 'simulation' ? now : undefined,
    phase_started_at: now,
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Coordinating research pipeline',
        status: 'running',
        detail: mode === 'openclaw' ? `TaskFlow: ${flowId}` : 'Simulation mode',
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
      flow_id: flowId ?? null,
    },
  })
}