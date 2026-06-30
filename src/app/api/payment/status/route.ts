import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/server/db'
import { getUserSubscription } from '@/server/users/user-repository'

// Lets the post-checkout page poll for entitlement (the webhook does the actual
// unlock; if the server was offline, Lemon Squeezy retries the webhook). Returns
// the current paid/subscription state for the signed-in user.
export async function GET(request: Request) {
  const session = await getSession()
  const userId = session?.user?.id
  if (!userId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const playbookId = new URL(request.url).searchParams.get('playbookId') ?? undefined

  let playbookPaid: boolean | null = null
  if (playbookId) {
    const pb = await prisma.playbook.findUnique({
      where: { id: playbookId },
      select: { userId: true, paymentStatus: true },
    })
    if (pb && (!pb.userId || pb.userId === userId)) {
      playbookPaid = pb.paymentStatus === 'paid'
    }
  }

  const sub = await getUserSubscription(userId)
  return NextResponse.json({
    ok: true,
    playbookPaid,
    plan: sub?.plan ?? 'free',
    subscriptionStatus: sub?.status ?? null,
  })
}
