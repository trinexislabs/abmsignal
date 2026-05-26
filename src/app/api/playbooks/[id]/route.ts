import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { playbookService } from '@/server/playbooks/playbook-service'
import { playbookRepository } from '@/server/playbooks/playbook-repository'
import {
  MOCK_PLAYBOOKS,
  MOCK_CONTACTS,
  MOCK_SECTIONS,
  MOCK_QUALITY_CHECKS,
} from '@/lib/mock-data'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  const playbook = await playbookService.getById(id)
  if (playbook) {
    return NextResponse.json({ data: playbook })
  }

  // Fall back to mock data for demo IDs (pb-001, pb-002, pb-003)
  if (id.startsWith('pb_')) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  const mock = MOCK_PLAYBOOKS.find((p) => p.id === id)
  if (mock) {
    return NextResponse.json({
      data: {
        ...mock,
        sections: MOCK_SECTIONS.filter((s) => s.playbook_id === id),
        contacts: MOCK_CONTACTS.filter((c) => c.playbook_id === id),
        quality_checks: MOCK_QUALITY_CHECKS.filter((q) => q.playbook_id === id),
      },
    })
  }

  return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
}

// PATCH is kept for any legacy UI usage (e.g. inline section editing)
// but it NO LONGER accepts agent callbacks — only UI-initiated updates.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = await playbookService.getById(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Only allow verification status updates via PATCH (section edits stay local in the UI)
  // Full status updates now go through the service layer via workers.
  // This endpoint exists solely for source verification updates from the UI.
  if ('sections' in body && Array.isArray(body.sections)) {
    // Section content edits from the UI (local-only state, not persisted to DB for now)
    return NextResponse.json({ data: playbook })
  }

  return NextResponse.json({ data: playbook })
}

// Hard-delete a playbook plus every row attached to it (runs, events, sources,
// sections, contacts) and drop any pending queue jobs. Irreversible.
export async function DELETE(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const playbook = await playbookService.getById(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }
  if (playbook.user_id && playbook.user_id !== userId) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const result = await playbookService.deletePlaybook(id)
  return NextResponse.json({ data: { deleted: result.deleted, id } })
}
