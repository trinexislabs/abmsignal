import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { getUserSubscription, upsertUserPlan } from '@/server/users/user-repository'

const VALID_PLANS = ['one_off', 'growth'] as const

export async function GET() {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const sub = await getUserSubscription(session.user.id)
  return NextResponse.json({ plan: sub?.plan ?? 'free' })
}

export async function POST(request: Request) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { plan } = body

  if (!VALID_PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Invalid plan. Must be one_off or growth.' }, { status: 400 })
  }

  const sub = await upsertUserPlan(session.user.id, plan)
  return NextResponse.json({ plan: sub.plan })
}
