import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook } from '@/lib/store/playbooks'
import type { SourceVerificationStatus } from '@/types'

interface RouteContext {
  params: Promise<{ id: string }>
}

// PATCH /api/playbooks/[id]/verify
// Body: { section_id: string, source_id: string, verification_status: SourceVerificationStatus }
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)
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
    return NextResponse.json({ error: 'section_id, source_id, and verification_status are required' }, { status: 400 })
  }

  const validStatuses: SourceVerificationStatus[] = ['verified', 'needs_review', 'unverified']
  if (!validStatuses.includes(verification_status)) {
    return NextResponse.json({ error: 'Invalid verification_status' }, { status: 400 })
  }

  const sections = playbook.sections.map(section => {
    if (section.id !== section_id) return section
    const sources = (section.sources ?? []).map(src =>
      src.id === source_id ? { ...src, verification_status } : src
    )
    return { ...section, sources }
  })

  const updated = updatePlaybook(id, { sections })
  if (!updated) {
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }

  return NextResponse.json({ data: updated })
}
