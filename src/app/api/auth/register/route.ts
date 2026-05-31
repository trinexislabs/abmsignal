import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { prisma } from '@/server/db'

export async function POST(request: Request) {
  try {
    const { name, email, password } = await request.json()

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

    const hashed = await bcrypt.hash(password, 12)

    // No plan is chosen at sign-up. Everyone starts on the implicit "free"
    // (pay-per-playbook) tier; the user picks one-off ($29) or Growth ($229/mo)
    // from the paywall after their first playbook is generated. We persist a
    // 'free' subscription so plan-derived UI has a row to read.
    const user = await prisma.user.create({
      data: {
        name,
        email,
        password: hashed,
        subscription: {
          create: { plan: 'free', status: 'active' },
        },
      },
    })

    return NextResponse.json({ id: user.id, email: user.email }, { status: 201 })
  } catch (err) {
    console.error('[register]', err)
    return NextResponse.json({ error: 'Something went wrong' }, { status: 500 })
  }
}
