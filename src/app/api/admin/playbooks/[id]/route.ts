import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/admin'
import { playbookService } from '@/server/playbooks/playbook-service'

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
