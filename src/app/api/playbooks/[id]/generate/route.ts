import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = await playbookService.getById(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const { runId, alreadyActive } = await playbookService.startGeneration(id)

  return NextResponse.json({
    data: {
      playbook_id: id,
      run_id: runId,
      status: alreadyActive ? 'already_running' : 'queued',
      mode: 'worker',
    },
  })
}
