import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { createCheckout, type CheckoutPurpose } from '@/server/payments/lemonsqueezy'
import { recordCheckout } from '@/server/payments/payment-service'

type Body = { purpose?: CheckoutPurpose; playbookId?: string }

const VALID: CheckoutPurpose[] = ['unlock', 'credit', 'subscription']

export async function POST(request: Request) {
  const session = await getSession()
  const userId = session?.user?.id
  const email = session?.user?.email
  if (!userId || !email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: Body
  try {
    body = (await request.json()) as Body
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const purpose = body.purpose
  if (!purpose || !VALID.includes(purpose)) {
    return NextResponse.json({ error: 'Invalid purpose' }, { status: 400 })
  }
  if (purpose === 'unlock' && !body.playbookId) {
    return NextResponse.json({ error: 'playbookId required for unlock' }, { status: 400 })
  }

  const base = process.env.NEXT_PUBLIC_APP_URL ?? new URL(request.url).origin
  const redirectUrl = body.playbookId
    ? `${base}/playbook/${body.playbookId}?paid=1`
    : `${base}/dashboard?paid=1`

  try {
    const { checkoutUrl, checkoutId } = await createCheckout({
      purpose,
      userId,
      email,
      playbookId: body.playbookId,
      redirectUrl,
    })
    await recordCheckout({ userId, playbookId: body.playbookId, purpose, checkoutId })
    return NextResponse.json({ ok: true, url: checkoutUrl })
  } catch (err) {
    console.error('[checkout] failed:', err)
    return NextResponse.json({ error: 'Could not start checkout' }, { status: 502 })
  }
}
