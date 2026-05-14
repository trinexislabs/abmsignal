import { NextResponse } from 'next/server'
import { getPlaybook } from '@/lib/store/playbooks'
import { MOCK_CONTACTS } from '@/lib/mock-data'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  const stored = getPlaybook(id)
  if (stored) {
    return NextResponse.json({ data: stored.contacts })
  }

  const mockContacts = MOCK_CONTACTS.filter((c) => c.playbook_id === id)
  return NextResponse.json({ data: mockContacts })
}
