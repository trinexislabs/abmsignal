import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook, updateContacts } from '@/lib/store/playbooks'
import type { Contact } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

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

  updateContacts(id, body.contacts)
  updatePlaybook(id, {
    status: 'writing',
    progress_pct: 40,
    phase_started_at: new Date().toISOString(),
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Contact review complete — starting content generation',
        status: 'running',
      },
      { agent: 'researcher', task: 'Account research complete', status: 'complete' },
      {
        agent: 'writer',
        task: 'Generating hyper-personalized sections',
        status: 'running',
        detail: 'Starting section 1 of 8',
      },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
  })

  return NextResponse.json({
    data: { message: 'Contact review submitted. Writing phase started.' },
  })
}
