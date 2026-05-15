import { NextResponse } from 'next/server'
import { getPlaybook } from '@/lib/store/playbooks'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  // Return real status only — progress is updated by the orchestrator agent via PATCH API
  return NextResponse.json({
    data: {
      playbook_id: id,
      status: playbook.status,
      progress_pct: playbook.progress_pct,
      agent_status: playbook.agent_status,
    },
  })
}