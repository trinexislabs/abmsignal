import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { playbookService } from '@/server/playbooks/playbook-service'

export async function GET() {
  const session = await getSession()
  const userId = session?.user?.id
  if (!userId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const active = await playbookService.listActiveForUser(userId)
  return NextResponse.json({ data: active })
}
