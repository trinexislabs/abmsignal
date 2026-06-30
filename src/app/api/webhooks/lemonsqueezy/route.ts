import { NextResponse } from 'next/server'
import crypto from 'crypto'
import { prisma } from '@/server/db'
import { verifyWebhookSignature } from '@/server/payments/lemonsqueezy'
import { handleLemonEvent } from '@/server/payments/payment-service'

// Lemon Squeezy posts signed webhooks here (public via the Cloudflare tunnel).
export async function POST(request: Request) {
  // Raw body is required for HMAC verification — read it as text, not json.
  const raw = await request.text()
  const signature = request.headers.get('x-signature')

  if (!verifyWebhookSignature(raw, signature)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
  }

  let body: { meta?: { event_name?: string } }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const eventName = body.meta?.event_name ?? 'unknown'
  const dedupeKey = crypto.createHash('sha256').update(raw).digest('hex')

  // Idempotency: record the event first; a duplicate delivery hits the unique
  // dedupeKey and we ack without re-applying.
  try {
    await prisma.webhookEvent.create({
      data: { provider: 'lemonsqueezy', eventName, dedupeKey, payload: raw.slice(0, 16000) },
    })
  } catch {
    // Unique violation = already received this exact delivery → ack.
    return NextResponse.json({ ok: true, deduped: true })
  }

  try {
    const summary = await handleLemonEvent(body)
    await prisma.webhookEvent.updateMany({
      where: { dedupeKey },
      data: { processedAt: new Date(), error: null },
    })
    console.log(`[ls-webhook] ${eventName}: ${summary}`)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'handler error'
    await prisma.webhookEvent.updateMany({ where: { dedupeKey }, data: { error: msg.slice(0, 500) } })
    console.error(`[ls-webhook] ${eventName} failed:`, msg)
    // 500 so Lemon Squeezy retries later (e.g. if the DB was briefly unavailable).
    return NextResponse.json({ error: 'handler failed' }, { status: 500 })
  }
}
