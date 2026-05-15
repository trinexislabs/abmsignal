import { NextResponse } from 'next/server'
import { createPlaybook, listPlaybooks } from '@/lib/store/playbooks'
import type { PlaybookCreateRequest } from '@/types'

export async function GET() {
  const stored = listPlaybooks()
  const storedIds = new Set(stored.map((p) => p.id))

  // Don't include mock playbooks in the list — only show real ones from the store
  // Mock data (pb-001, etc.) is only for development/demo purposes
  return NextResponse.json({ data: stored })
}

export async function POST(request: Request) {
  let body: PlaybookCreateRequest
  try {
    body = (await request.json()) as PlaybookCreateRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { product_brief, target_account } = body

  if (!product_brief?.product_name || !target_account?.target_company) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  const valuePropsArr = product_brief.value_propositions
    ? product_brief.value_propositions
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const personasArr = product_brief.target_personas
    ? product_brief.target_personas
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const differentiatorsArr = product_brief.differentiators
    ? product_brief.differentiators
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean)
    : []
  const competitorsArr = product_brief.competitors
    ? product_brief.competitors
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
    : []

  const validDeployment = (['saas', 'on-prem', 'hybrid'] as const).includes(
    product_brief.deployment_model as 'saas' | 'on-prem' | 'hybrid',
  )
  const deploymentModel = validDeployment
    ? (product_brief.deployment_model as 'saas' | 'on-prem' | 'hybrid')
    : 'saas'

  const playbook = createPlaybook({
    user_id: 'usr_demo',
    product_name: product_brief.product_name,
    product_url: product_brief.product_url || undefined,
    product_brief: {
      product_name: product_brief.product_name,
      description: product_brief.description || '',
      value_propositions: valuePropsArr,
      target_personas: personasArr,
      differentiators: differentiatorsArr,
      competitors: competitorsArr,
      deployment_model: deploymentModel,
      deal_size: product_brief.deal_size || '',
      sales_cycle: product_brief.sales_cycle || '',
    },
    target_company: target_account.target_company,
    target_url: target_account.target_url || undefined,
    industry: target_account.industry,
    geography: target_account.geography,
    priority_tier: target_account.priority_tier,
    status: 'researching',
    progress_pct: 0,
    agent_status: [
      { agent: 'orchestrator', task: 'Initializing research pipeline', status: 'pending' },
      { agent: 'researcher', task: 'Preparing account research', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
    sections: [],
    contacts: [],
    quality_checks: [],
  })

  return NextResponse.json(
    {
      data: {
        playbook_id: playbook.id,
        job_id: `job_${Date.now()}`,
        estimated_completion_minutes: 15,
      },
    },
    { status: 202 },
  )
}
