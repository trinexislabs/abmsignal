import { NextResponse } from 'next/server'
import { findLatestFlow, getFlow } from '@/lib/openclaw/client'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/playbooks/[id]/flow
 * Polls the OpenClaw TaskFlow status for a playbook generation job.
 * This is the Server A → Server B communication endpoint.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const url = new URL(_req.url)
  const flowId = url.searchParams.get('flowId')

  let flow

  if (flowId) {
    const result = await getFlow(flowId)
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }
    flow = result.flow
  } else {
    const result = await findLatestFlow()
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 502 })
    }
    flow = result.flow
  }

  if (!flow) {
    return NextResponse.json({ data: { playbook_id: id, flow_status: 'not_found' } })
  }

  return NextResponse.json({
    data: {
      playbook_id: id,
      flow_id: flow.flowId,
      flow_status: flow.status,
      goal: flow.goal,
      current_step: flow.currentStep ?? null,
      state_json: flow.stateJson ?? null,
      revision: flow.revision,
      created_at: new Date(flow.createdAt).toISOString(),
      updated_at: new Date(flow.updatedAt).toISOString(),
    },
  })
}