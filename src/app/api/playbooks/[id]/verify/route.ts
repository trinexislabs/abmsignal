import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'
import type { SourceVerificationStatus } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = await playbookService.getById(id)
  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  let body: { section_id?: string; source_id?: string; verification_status?: SourceVerificationStatus }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const { section_id, source_id, verification_status } = body
  if (!section_id || !source_id || !verification_status) {
    return NextResponse.json(
      { error: 'section_id, source_id, and verification_status are required' },
      { status: 400 },
    )
  }

  const valid: SourceVerificationStatus[] = ['verified', 'needs_review', 'unverified']
  if (!valid.includes(verification_status)) {
    return NextResponse.json({ error: 'Invalid verification_status' }, { status: 400 })
  }

  const updated = await playbookService.updateSourceVerification(section_id, source_id, verification_status)
  if (!updated) {
    return NextResponse.json({ error: 'Source not found' }, { status: 404 })
  }

  // Return the full playbook so the UI can update its state
  const refreshed = await playbookService.getById(id)
  return NextResponse.json({ data: refreshed })
}
