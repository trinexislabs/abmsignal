import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/admin'
import { playbookService } from '@/server/playbooks/playbook-service'
import { playbookRepository } from '@/server/playbooks/playbook-repository'

// Admin playbook controls. NOTE: middleware does NOT cover /api/admin/**, so each
// handler MUST gate on isAdmin() itself. isAdmin() (not requireAdmin) is used so
// a non-admin gets a 403 JSON rather than a redirect.

interface RouteContext {
  params: Promise<{ id: string }>
}

// DELETE — permanently delete a playbook and release ALL runtime resources it
// holds: cancels the active run (worker kills the OpenClaw child within ~10s),
// removes queued jobs, cascade-deletes all rows, and promotes the user's next
// queued playbook.
export async function DELETE(_req: Request, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const result = await playbookService.deletePlaybook(id)
  if (!result.deleted) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  return NextResponse.json({
    data: { deleted: true, id, credit_refunded: result.creditRefunded },
  })
}

// PUT — regenerate: re-run the full agent pipeline for this playbook (admin
// override of the user-facing generate endpoint). Allowed from any status,
// including terminal ones (failed, error, rejected, complete, cancelled, draft).
// Playbooks already holding runtime resources (queued/pending_queue/researching/
// contact_review/writing/reviewing) are rejected with 409 — force-stop first.
export async function PUT(_req: Request, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params

  const existing = await playbookService.getById(id)
  if (!existing) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const ACTIVE_STATUSES = new Set([
    'queued',
    'pending_queue',
    'researching',
    'contact_review',
    'writing',
    'reviewing',
  ])
  if (ACTIVE_STATUSES.has(existing.status)) {
    return NextResponse.json(
      { error: 'Playbook is already generating — force-stop it before regenerating' },
      { status: 409 },
    )
  }

  try {
    const { runId, outcome } = await playbookService.startGeneration(id)
    await playbookRepository.logEvent(
      id,
      'admin.regenerate',
      'Admin triggered regeneration',
      { runId, outcome },
    )

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
        outcome,
        mode: 'worker',
      },
    })
  } catch (err) {
    console.error('[admin/playbooks] Regenerate failed:', err)
    return NextResponse.json({ error: 'Regeneration failed' }, { status: 500 })
  }
}

// POST — force-stop an in-flight/hung generation without deleting the playbook.
// Cancels the run (killing the subprocess), frees the runtime slot, and promotes
// the next queued playbook. The playbook stays and can be regenerated.
export async function POST(_req: Request, { params }: RouteContext) {
  if (!(await isAdmin())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { id } = await params
  const result = await playbookService.forceStopGeneration(id)
  if (!result.stopped && result.reason === 'not_found') {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  return NextResponse.json({ data: result })
}
