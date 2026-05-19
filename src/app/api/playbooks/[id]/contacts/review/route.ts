import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'
import type { ApiContact } from '@/server/playbooks/playbook-types'
import type { Contact } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = await playbookService.getById(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  let body: { contacts: Contact[] }
  try {
    body = (await request.json()) as { contacts: Contact[] }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(body.contacts)) {
    return NextResponse.json({ error: 'contacts must be an array' }, { status: 400 })
  }

  // Map frontend Contact shape to ApiContact shape
  const apiContacts: ApiContact[] = body.contacts.map((c: Contact) => ({
    id: c.id,
    playbook_id: id,
    name: c.name,
    title: c.title,
    linkedin_url: c.linkedin_url,
    confidence: c.confidence,
    source: c.source,
    verification_status: c.verification_status,
    notes: c.notes,
    created_at: c.created_at,
  }))

  const { runId } = await playbookService.submitContactReview(id, apiContacts)

  return NextResponse.json({
    data: {
      message: 'Contact review submitted. Writing phase queued.',
      run_id: runId,
    },
  })
}
