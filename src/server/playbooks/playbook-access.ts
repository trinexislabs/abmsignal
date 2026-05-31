import { getUserSubscription } from '../users/user-repository'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'
import type { ApiPlaybook } from './playbook-types'

// ─── Post-generation paywall access control ─────────────────────────────────
//
// A completed playbook is the sellable artifact. Until it's unlocked we withhold
// its real content from the browser entirely (no CSS-blur of real text — the
// bodies and contact PII never leave the server). This module is the single
// source of truth for "can this viewer see the real content" and for producing
// the stripped, locked response shape.

// A viewer may see real content when ANY of these hold:
//   • the playbook hasn't finished generating yet — the whole generation phase
//     (research / writing / the contact-review checkpoint) stays open so the
//     pipeline behaves exactly as before;
//   • the playbook has been paid for (one-off unlock);
//   • the viewer owns the playbook AND has an active Growth subscription, which
//     blanket-unlocks all of their playbooks for the life of the subscription.
export async function canAccessPlaybookContent(
  playbook: Pick<ApiPlaybook, 'status' | 'payment_status' | 'user_id'>,
  viewerUserId: string | null | undefined,
): Promise<boolean> {
  // Only a completed playbook is ever locked. Everything mid-generation is open.
  if (playbook.status !== 'complete') return true

  if (playbook.payment_status === 'paid') return true

  // Owner with an active Growth subscription → everything unlocked.
  if (viewerUserId && playbook.user_id && viewerUserId === playbook.user_id) {
    const sub = await getUserSubscription(viewerUserId)
    if (sub?.plan === 'growth' && sub.status === 'active') return true
  }

  return false
}

// Returns true when the playbook is a completed, unpaid artifact that should be
// gated. Mid-generation playbooks return false (nothing to sell yet).
export function isLockable(
  playbook: Pick<ApiPlaybook, 'status' | 'payment_status'>,
): boolean {
  return playbook.status === 'complete' && playbook.payment_status !== 'paid'
}

// Strip every piece of real content from a playbook so a locked viewer gets only
// the structure (section titles / ordering) plus counts to drive the paywall.
// The section bodies, inline source markers, structured sources, and all contact
// PII are removed before the object ever leaves the server.
export function lockPlaybookContent(playbook: ApiPlaybook): ApiPlaybook {
  return {
    ...playbook,
    locked: true,
    payment: {
      status: playbook.payment_status,
      price_one_off: ONE_OFF_PRICE_USD,
      growth_price: GROWTH_PRICE_USD,
      contacts_count: playbook.contacts.length,
      sections_count: playbook.sections.length,
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
  const allowed = await canAccessPlaybookContent(playbook, viewerUserId)
  return allowed ? playbook : lockPlaybookContent(playbook)
}
