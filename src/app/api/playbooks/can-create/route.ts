import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { playbookRepository } from '@/server/playbooks/playbook-repository'
import { getUserSubscription } from '@/server/users/user-repository'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id

  if (!userId) {
    return NextResponse.json({ allowed: true })
  }

  const sub = await getUserSubscription(userId)

  if (sub?.plan === 'growth') {
    const nonTerminal = await playbookRepository.countNonTerminalForUser(userId)
    if (nonTerminal >= 4) {
      return NextResponse.json({
        allowed: false,
        reason:
          'Queue is full (4 active playbooks max). Complete or delete an existing playbook to queue a new one.',
      })
    }
  } else {
    // free / one_off: one playbook at a time
    const inFlight = await playbookRepository.countInFlightForUser(userId)
    if (inFlight > 0) {
      return NextResponse.json({
        allowed: false,
        reason:
          'A playbook is already generating. Please wait for it to reach the contact review step or complete before starting another.',
      })
    }
  }

  return NextResponse.json({ allowed: true })
}
