import { prisma } from '../db'
import {
  getUserSubscription,
  getUserCreditBalance,
  playbookConsumedReason,
} from '../users/user-repository'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'
import type { ApiPlaybook } from './playbook-types'

// ─── Post-generation paywall access control ─────────────────────────────────
//
// A completed playbook is the sellable artifact. Until it's unlocked we withhold
// its real content from the browser entirely (no CSS-blur of real text — the
// bodies and contact PII never leave the server). This module is the single
// source of truth for "can this viewer see the real content" and for producing
// the stripped, locked response shape.
//
// Unlock is recorded as Playbook.paymentStatus = 'paid'. It's set by:
//   • a one-off $29 purchase (see /api/payment/mock purpose:'unlock'),
//   • a Growth subscriber consuming one of their 10 cycle credits — done at
//     completion (worker) and when they first subscribe (see tryGrowthAutoUnlock).
// Because the decision is persisted, the read check below is a pure, side-effect
// free paymentStatus lookup.

// A viewer may see real content when ANY of these hold:
//   • the playbook hasn't finished generating yet — the whole generation phase
//     (research / writing / the contact-review checkpoint) stays open so the
//     pipeline behaves exactly as before;
//   • the playbook has been paid for (one-off unlock OR a consumed Growth credit).
export function canAccessPlaybookContent(
  playbook: Pick<ApiPlaybook, 'status' | 'payment_status'>,
): boolean {
  // Only a completed playbook is ever locked. Everything mid-generation is open.
  // Growth quota unlocks are persisted as paymentStatus='paid', so this is a pure
  // status/payment check that needs no viewer identity.
  if (playbook.status !== 'complete') return true
  return playbook.payment_status === 'paid'
}

// Returns true when the playbook is a completed, unpaid artifact that should be
// gated. Mid-generation playbooks return false (nothing to sell yet).
export function isLockable(
  playbook: Pick<ApiPlaybook, 'status' | 'payment_status'>,
): boolean {
  return playbook.status === 'complete' && playbook.payment_status !== 'paid'
}

interface LockMeta {
  isGrowthSubscriber: boolean
  cycleResetsAt?: string
}

// Strip every piece of real content from a playbook so a locked viewer gets only
// the structure (section titles / ordering) plus counts to drive the paywall.
// The section bodies, inline source markers, structured sources, and all contact
// PII are removed before the object ever leaves the server.
export function lockPlaybookContent(playbook: ApiPlaybook, meta: LockMeta): ApiPlaybook {
  return {
    ...playbook,
    locked: true,
    payment: {
      status: playbook.payment_status,
      price_one_off: ONE_OFF_PRICE_USD,
      growth_price: GROWTH_PRICE_USD,
      contacts_count: playbook.contacts.length,
      sections_count: playbook.sections.length,
      // When the viewer is already an active Growth subscriber, seeing this
      // paywall means they're OVER their cycle quota — the UI then offers only
      // the $29 overage unlock (not another subscription).
      is_growth_subscriber: meta.isGrowthSubscriber,
      cycle_resets_at: meta.cycleResetsAt,
    },
    sections: playbook.sections.map(s => ({
      ...s,
      content: '',
      sources: [],
    })),
    // Drop contacts entirely — names, titles, emails and LinkedIn URLs are the
    // most valuable part of the deliverable and must not leak while locked.
    contacts: [],
  }
}

// Convenience: resolve access and return either the full playbook or the locked
// projection. Callers in read endpoints use this so the gating logic lives here.
export async function projectPlaybookForViewer(
  playbook: ApiPlaybook,
  viewerUserId: string | null | undefined,
): Promise<ApiPlaybook> {
  if (canAccessPlaybookContent(playbook)) return playbook

  // Locked — enrich the paywall with the viewer's subscription state so the UI
  // can decide between "subscribe or pay $29" vs. "over quota, pay $29 overage".
  let isGrowthSubscriber = false
  let cycleResetsAt: string | undefined
  if (viewerUserId) {
    const sub = await getUserSubscription(viewerUserId)
    if (sub?.plan === 'growth' && sub.status === 'active') {
      isGrowthSubscriber = true
      cycleResetsAt = sub.currentPeriodEnd?.toISOString()
    }
  }
  return lockPlaybookContent(playbook, { isGrowthSubscriber, cycleResetsAt })
}

// Consume one Growth cycle credit to permanently unlock a completed playbook, if
// the owner is an active Growth subscriber with quota remaining. Returns whether
// the playbook ended up unlocked by this call.
//
// Called at two authoritative, single-execution points (never on a GET):
//   • playbook completion (writing worker) — auto-unlocks within quota,
//   • Growth subscription activation (mock payment) — unlocks the playbook that
//     triggered the subscribe.
// Over-quota (0 credits) → returns { unlocked: false }; the review-page paywall
// then offers the $29 overage. Idempotent per playbook via the consumption row.
export async function tryGrowthAutoUnlock(
  playbookId: string,
  userId: string | null | undefined,
): Promise<{ unlocked: boolean }> {
  if (!userId) return { unlocked: false }

  const sub = await getUserSubscription(userId)
  if (sub?.plan !== 'growth' || sub.status !== 'active') return { unlocked: false }

  const pb = await prisma.playbook.findUnique({
    where: { id: playbookId },
    select: { paymentStatus: true, userId: true },
  })
  if (!pb || pb.userId !== userId) return { unlocked: false }
  if (pb.paymentStatus === 'paid') return { unlocked: false }

  // Idempotency: if a consumption row already exists for this playbook but the
  // status wasn't flipped (e.g. a prior partial run), just mark it paid — don't
  // consume a second credit.
  const alreadyConsumed = await prisma.userCredit.findFirst({
    where: { userId, reason: playbookConsumedReason(playbookId) },
    select: { id: true },
  })
  if (alreadyConsumed) {
    await prisma.playbook.update({
      where: { id: playbookId },
      data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: 'growth_quota' },
    })
    return { unlocked: true }
  }

  // Quota check: no cycle credits left → leave pending so the overage paywall shows.
  const balance = await getUserCreditBalance(userId)
  if (balance < 1) return { unlocked: false }

  await prisma.$transaction([
    prisma.userCredit.create({
      data: { userId, amount: -1, reason: playbookConsumedReason(playbookId) },
    }),
    prisma.playbook.update({
      where: { id: playbookId },
      data: { paymentStatus: 'paid', paidAt: new Date(), paymentReference: 'growth_quota' },
    }),
  ])
  return { unlocked: true }
}
