import { NextResponse } from 'next/server'
import { playbookService } from '@/server/playbooks/playbook-service'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { id } = await params
  const status = await playbookService.getStatus(id)

  if (!status) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  return NextResponse.json({ data: status })
}
