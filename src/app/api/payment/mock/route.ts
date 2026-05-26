import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/server/db'
import { activateGrowthCycle, upsertUserPlan } from '@/server/users/user-repository'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'

type MockPaymentRequest = {
  purpose?: 'plan' | 'playbook'
  plan?: 'growth' | 'one_off'
  amount?: number
  // Optional internal path to redirect to after success. Whitelisted at the
  // bottom of this file to prevent open-redirect abuse.
  returnTo?: string
}

// Allow only same-origin app routes (no protocol, no //). Used to bless a
// caller-supplied returnTo for the playbook top-up flow without becoming an
// open redirect.
function sanitizeReturnTo(value: string | undefined, fallback: string): string {
  if (!value) return fallback
  if (!value.startsWith('/')) return fallback
  if (value.startsWith('//')) return fallback
  return value
}

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  let body: MockPaymentRequest
  try {
    body = (await request.json()) as MockPaymentRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { purpose, plan, amount, returnTo } = body

  if (purpose === 'plan') {
    // Activate a subscription plan. For growth this is the monthly upfront fee
    // ($299) which grants 10 credits for a 30-day cycle (use-it-or-lose-it).
    // one_off doesn't normally take this path (no recurring fee), but we accept
    // it for completeness.
    if (plan !== 'growth' && plan !== 'one_off') {
      return NextResponse.json({ error: 'Invalid plan' }, { status: 400 })
    }
    const expected = plan === 'growth' ? GROWTH_PRICE_USD : 0
    if (plan === 'growth' && amount !== expected) {
      return NextResponse.json({ error: `Amount mismatch (expected ${expected})` }, { status: 400 })
    }
    if (plan === 'growth') {
      // Sets plan=growth, status=active, currentPeriodEnd=+30d, and resets
      // credits to exactly 10 — handles both first-time activation and renewal.
      await activateGrowthCycle(userId)
    } else {
      await upsertUserPlan(userId, plan)
    }
    return NextResponse.json({ ok: true, redirect: '/dashboard' })
  }

  if (purpose === 'playbook') {
    // Per-playbook charge — used for one_off and for growth mid-cycle top-ups.
    // Mock payment grants 1 credit, consumed on the next playbook creation.
    if (amount !== ONE_OFF_PRICE_USD) {
      return NextResponse.json({ error: `Amount mismatch (expected ${ONE_OFF_PRICE_USD})` }, { status: 400 })
    }
    await prisma.userCredit.create({
      data: { userId, amount: 1, reason: 'mock_payment_one_off' },
    })
    // returnTo lets the caller resume mid-flow (e.g. /playbook/new/processing
    // after the user clicked "Start research" without credits). Default lands
    // them at the start of the brief.
    return NextResponse.json({
      ok: true,
      redirect: sanitizeReturnTo(returnTo, '/playbook/new/product'),
    })
  }

  return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
}
