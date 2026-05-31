import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'
import { canAccessPlaybookContent } from '@/server/playbooks/playbook-access'
import { MOCK_CONTACTS } from '@/lib/mock-data'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params

  const playbook = await playbookService.getById(id)
  if (playbook) {
    // The contact-review checkpoint runs mid-generation (status !== 'complete')
    // and must stay open. Once the playbook is complete, contacts are part of the
    // sellable deliverable — withhold them while the playbook is locked.
    if (!canAccessPlaybookContent(playbook)) {
      return NextResponse.json({ data: [], locked: true })
    }
    const contacts = await playbookService.getContacts(id)
    return NextResponse.json({ data: contacts })
  }

  // Fall back to mock data for demo IDs
  if (!id.startsWith('pb_')) {
    const mockContacts = MOCK_CONTACTS.filter((c) => c.playbook_id === id)
    return NextResponse.json({ data: mockContacts })
  }

  return NextResponse.json({ data: [] })
}
