import { NextResponse } from 'next/server'
import { getPlaybook } from '@/lib/store/playbooks'
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

  const stored = getPlaybook(id)
  if (stored) {
    return NextResponse.json({ data: stored })
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
