import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'
import { canAccessPlaybookContent } from '@/server/playbooks/playbook-access'

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

  // rawOutput holds the raw agent JSON — i.e. the full generated playbook. Drop
  // it (and worker log paths) for a locked playbook so timeline polling can't be
  // used to exfiltrate the deliverable.
  const safeRuns = canAccessPlaybookContent(playbook)
    ? runs
    : runs.map((r) => ({ ...r, rawOutput: null, stdoutPath: null, stderrPath: null }))

  return NextResponse.json({
    data: {
      playbook_id: id,
      runs: safeRuns,
    },
  })
}
