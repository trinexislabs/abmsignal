import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

/**
 * GET /api/playbooks/[id]/flow
 * Returns the current run history for a playbook.
 * Replaces the old OpenClaw TaskFlow polling endpoint.
 */
export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  const playbook = await playbookService.getById(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const runs = await playbookService.getRuns(id)

  return NextResponse.json({
    data: {
      playbook_id: id,
      runs,
    },
  })
}
