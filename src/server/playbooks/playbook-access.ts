import { prisma } from '../db'
import {
  getUserSubscription,
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
//
// CONCURRENCY: completions can race. The worker runs with WORKER_CONCURRENCY > 1
// and the per-user runtime slot is released at the contact-review checkpoint, so
// a Growth user can have several playbooks finish their writing phase at the same
// instant. The quota check and the credit consumption MUST therefore be atomic:
// a plain "read balance, then consume" lets N concurrent completions all read the
// same pre-spend balance and every one of them unlock, overshooting the cap. We
// instead insert the consumption row FIRST (taking the write lock) and recompute
// the balance INSIDE the same transaction, rolling back if it overdrew. Serialized
// completions then each observe every prior committed spend, so the (n+1)th sees a
// negative balance and falls through to the paywall.
class QuotaExceeded extends Error {}

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

  const markPaid = { paymentStatus: 'paid', paidAt: new Date(), paymentReference: 'growth_quota' }

  try {
    await prisma.$transaction(async (tx) => {
      // Idempotency: if a consumption row already exists for this playbook (e.g. a
      // prior partial run), just (re)assert paid — don't spend a second credit.
      const alreadyConsumed = await tx.userCredit.findFirst({
        where: { userId, reason: playbookConsumedReason(playbookId) },
        select: { id: true },
      })
      if (alreadyConsumed) {
        await tx.playbook.update({ where: { id: playbookId }, data: markPaid })
        return
      }

      // Tentatively consume a credit, then verify we didn't overdraw. The insert
      // runs before the balance read so this transaction holds the write lock
      // while it checks — concurrent completions serialize behind it and each one
      // sees the others' committed spends.
      await tx.userCredit.create({
        data: { userId, amount: -1, reason: playbookConsumedReason(playbookId) },
      })
      const agg = await tx.userCredit.aggregate({ where: { userId }, _sum: { amount: true } })
      if ((agg._sum.amount ?? 0) < 0) {
        // Over quota — roll back the tentative spend and leave the playbook pending
        // so the $29 overage paywall shows on the review page.
        throw new QuotaExceeded()
      }
      await tx.playbook.update({ where: { id: playbookId }, data: markPaid })
    })
  } catch (err) {
    if (err instanceof QuotaExceeded) return { unlocked: false }
    throw err
  }
  return { unlocked: true }
}
