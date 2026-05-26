import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db'

const VALID_PLANS = ['one_off', 'growth'] as const

export async function POST(request: Request) {
  try {
    const { name, email, password, plan } = await request.json()

    if (!name || !email || !password) {
      return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    const existing = await prisma.user.findUnique({ where: { email } })
    if (existing) {
      return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 })
    }

    const chosenPlan = VALID_PLANS.includes(plan) ? plan : 'free'
    const hashed = await bcrypt.hash(password, 12)

    // Growth is gated on a $299 subscription payment, so we DON'T activate
    // the plan at registration — we save 'free' and let the post-signup flow
    // route the user to /payment/mock. The mock payment endpoint then calls
    // activateGrowthCycle() which flips plan→growth and grants 10 credits.
    // one_off has no upfront fee so we can store the intent as-is; the $49
    // gate fires when they click "New Playbook".
    const initialPlan = chosenPlan === 'growth' ? 'free' : chosenPlan

    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        subscription: {
          create: { plan: initialPlan, status: 'active' },
        },
      },
    })

    // Echo the chosen plan so the client knows where to route next.
    return NextResponse.json(
      { id: user.id, email: user.email, plan: chosenPlan },
      { status: 201 },
    )
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
