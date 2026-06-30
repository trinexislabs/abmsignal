import { prisma } from '@/server/db'
import { activateGrowthCycle } from '@/server/users/user-repository'
import { tryGrowthAutoUnlock } from '@/server/playbooks/playbook-access'
import type { CheckoutPurpose } from './lemonsqueezy'

// Credit-grant idempotency: one credit per LS order, keyed by reason.
const creditReasonForOrder = (orderId: string) => `lemon_order:${orderId}`

export async function recordCheckout(params: {
  userId: string
  playbookId?: string
  purpose: CheckoutPurpose
  checkoutId: string
}): Promise<void> {
  await prisma.payment.create({
    data: {
      userId: params.userId,
      playbookId: params.playbookId ?? null,
      purpose: params.purpose,
      status: 'checkout_created',
      checkoutId: params.checkoutId,
    },
  })
}

// ── Webhook / reconciliation event shapes ────────────────────────────────────
interface LemonBody {
  meta?: { event_name?: string; custom_data?: Record<string, string> }
  data?: { id?: string; type?: string; attributes?: Record<string, unknown> }
}

async function unlockPlaybook(playbookId: string, userId: string, orderId: string): Promise<void> {
  const pb = await prisma.playbook.findUnique({
    where: { id: playbookId },
    select: { id: true, userId: true, paymentStatus: true },
  })
  if (!pb) return
  if (pb.userId && pb.userId !== userId) return // ownership guard
  if (pb.paymentStatus === 'paid') return // idempotent
  await prisma.playbook.update({
    where: { id: playbookId },
    data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: `lemon_${orderId}` },
  })
}

async function grantCredit(userId: string, orderId: string): Promise<void> {
  const existing = await prisma.userCredit.findFirst({
    where: { userId, reason: creditReasonForOrder(orderId) },
    select: { id: true },
  })
  if (existing) return // idempotent per order
  await prisma.userCredit.create({
    data: { userId, amount: 1, reason: creditReasonForOrder(orderId) },
  })
}

// Map LS subscription status → our UserSubscription.status / Payment.status.
function mapSubStatus(lsStatus: string): { sub: string; payment: string } {
  switch (lsStatus) {
    case 'active':
    case 'on_trial':
      return { sub: 'active', payment: 'subscription_active' }
    case 'past_due':
    case 'unpaid':
      return { sub: 'past_due', payment: 'subscription_past_due' }
    case 'cancelled':
    case 'expired':
      return { sub: 'cancelled', payment: 'subscription_cancelled' }
    case 'paused':
      return { sub: 'paused', payment: 'subscription_past_due' }
    default:
      return { sub: lsStatus, payment: 'subscription_active' }
  }
}

/**
 * Apply a Lemon Squeezy event to our state. Idempotent. Used by both the webhook
 * and the reconciliation endpoint. Returns a short summary for logging.
 */
export async function handleLemonEvent(body: LemonBody): Promise<string> {
  const eventName = body.meta?.event_name ?? 'unknown'
  const custom = body.meta?.custom_data ?? {}
  const attrs = body.data?.attributes ?? {}
  const resourceId = body.data?.id ?? ''

  const purpose = custom.purpose as CheckoutPurpose | undefined
  const customUserId = custom.user_id
  const playbookId = custom.playbook_id
  const amountCents = typeof attrs.total === 'number' ? (attrs.total as number) : undefined
  const lemonCustomerId =
    attrs.customer_id != null ? String(attrs.customer_id) : undefined

  // ── One-time orders (unlock / credit) ──────────────────────────────────────
  if (eventName === 'order_created') {
    const orderId = resourceId
    const status = String(attrs.status ?? '')
    // Subscriptions also generate orders — only act on one-time purposes here.
    if (purpose === 'subscription') return 'order_created: subscription order, handled via subscription events'
    if (status !== 'paid') return `order_created: status=${status}, ignored`
    if (!customUserId) return 'order_created: missing user_id'

    if (purpose === 'unlock' && playbookId) {
      await unlockPlaybook(playbookId, customUserId, orderId)
    } else {
      await grantCredit(customUserId, orderId)
    }
    await upsertPayment({
      match: { orderId },
      userId: customUserId,
      playbookId: playbookId ?? null,
      purpose: purpose ?? 'credit',
      status: 'payment_succeeded',
      orderId,
      amountCents,
      lemonCustomerId,
      rawJson: JSON.stringify(body).slice(0, 8000),
    })
    return `order_created: applied ${purpose ?? 'credit'}`
  }

  if (eventName === 'order_refunded') {
    const orderId = resourceId
    await prisma.payment.updateMany({ where: { orderId }, data: { status: 'refunded' } })
    // Revoke a one-off unlock if this order was one.
    if (purpose === 'unlock' && playbookId) {
      await prisma.playbook.updateMany({
        where: { id: playbookId, paymentReference: `lemon_${orderId}` },
        data: { paymentStatus: 'pending', paidAt: null },
      })
    }
    return 'order_refunded: marked refunded'
  }

  // ── Subscriptions (growth) ──────────────────────────────────────────────────
  if (eventName.startsWith('subscription_')) {
    const subscriptionId = resourceId
    // Resolve the user: custom_data first, else the Payment row by subscriptionId.
    let userId: string | undefined = customUserId
    if (!userId) {
      const existing = await prisma.payment.findFirst({
        where: { subscriptionId },
        select: { userId: true },
      })
      userId = existing?.userId ?? undefined
    }
    if (!userId) return `${eventName}: could not resolve user`

    const lsStatus = String(attrs.status ?? 'active')
    const mapped = mapSubStatus(lsStatus)

    if (eventName === 'subscription_created' || eventName === 'subscription_payment_success') {
      if (mapped.sub === 'active') await activateGrowthCycle(userId)
      // When subscribing from a playbook's paywall, unlock that playbook now
      // (consumes one of the fresh cycle credits) — mirrors the old mock flow.
      if (eventName === 'subscription_created' && playbookId) {
        await tryGrowthAutoUnlock(playbookId, userId)
      }
    }
    if (eventName === 'subscription_updated' || eventName === 'subscription_cancelled' || eventName === 'subscription_expired') {
      await prisma.userSubscription.updateMany({
        where: { userId },
        data: { status: mapped.sub, updatedAt: new Date() },
      })
    }
    if (eventName === 'subscription_payment_failed') {
      await prisma.userSubscription.updateMany({
        where: { userId },
        data: { status: 'past_due', updatedAt: new Date() },
      })
    }

    await upsertPayment({
      match: { subscriptionId },
      userId,
      purpose: 'subscription',
      status: mapped.payment,
      subscriptionId,
      amountCents,
      lemonCustomerId,
      rawJson: JSON.stringify(body).slice(0, 8000),
    })
    return `${eventName}: sub status ${mapped.sub}`
  }

  return `${eventName}: no handler`
}

// Upsert a Payment row matched by orderId or subscriptionId (no unique index, so
// we updateMany-or-create manually).
async function upsertPayment(p: {
  match: { orderId?: string; subscriptionId?: string }
  userId?: string
  playbookId?: string | null
  purpose: string
  status: string
  orderId?: string
  subscriptionId?: string
  amountCents?: number
  lemonCustomerId?: string
  rawJson?: string
}): Promise<void> {
  // Exactly one of orderId / subscriptionId is always provided by callers.
  const where = p.match.orderId
    ? { orderId: p.match.orderId }
    : { subscriptionId: p.match.subscriptionId! }
  const data = {
    userId: p.userId ?? null,
    playbookId: p.playbookId ?? null,
    purpose: p.purpose,
    status: p.status,
    orderId: p.orderId ?? null,
    subscriptionId: p.subscriptionId ?? null,
    amountCents: p.amountCents ?? null,
    lemonCustomerId: p.lemonCustomerId ?? null,
    rawJson: p.rawJson ?? null,
  }
  const updated = await prisma.payment.updateMany({ where, data: { ...data, updatedAt: new Date() } })
  if (updated.count === 0) {
    await prisma.payment.create({ data })
  }
}
