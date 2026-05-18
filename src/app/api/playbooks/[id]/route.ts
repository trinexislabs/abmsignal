import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import {
  MOCK_PLAYBOOKS,
  MOCK_CONTACTS,
  MOCK_SECTIONS,
  MOCK_QUALITY_CHECKS,
} from '@/lib/mock-data'
import type { PlaybookStatus } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  const stored = getPlaybook(id)
  if (stored) {
    return NextResponse.json({ data: stored })
  }

  // Only return mock data for mock IDs (pb-001, pb-002, pb-003)
  // Never return mock data for real playbook IDs (pb_xxxxx) — those should 404
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

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  let body: Record<string, unknown>
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  // Allowed fields for update
  const allowedFields = ['status', 'progress_pct', 'agent_status', 'sections', 'phase_started_at', 'contacts']
  const updates: Record<string, unknown> = {}
  for (const key of allowedFields) {
    if (key in body) {
      updates[key] = body[key]
    }
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 })
  }

  const updated = updatePlaybook(id, updates)
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}