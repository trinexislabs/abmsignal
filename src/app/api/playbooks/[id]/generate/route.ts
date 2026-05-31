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

  // Pending-queue playbooks are waiting for the user's previous playbook to
  // release its OpenClaw slot. Don't dispatch — queue-promotion handles it.
  if (playbook.status === 'pending_queue') {
    return NextResponse.json({
      data: {
        playbook_id: id,
        status: 'pending_queue',
        message: 'Playbook is queued — will auto-start when the previous one completes or reaches contact review',
      },
    })
  }

  const { runId, outcome } = await playbookService.startGeneration(id)

  // outcome 'queued' means the user already had a playbook generating, so this
  // one was deferred to the queue instead of dispatched (auto-promoted later).
  const status =
    outcome === 'already_running'
      ? 'already_running'
      : outcome === 'queued'
        ? 'pending_queue'
        : 'queued'

  return NextResponse.json({
    data: {
      playbook_id: id,
      run_id: runId,
      status,
      message:
        outcome === 'queued'
          ? 'A playbook is already generating — this one is queued and will auto-start when the slot frees.'
          : undefined,
      mode: 'worker',
    },
  })
}
