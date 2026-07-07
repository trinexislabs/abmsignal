import { prisma } from '@/server/db'

// First-party, user-scoped behavior events powering the admin funnel
// (src/app/admin/(portal)/funnel). Two writers:
//   - server-side at auth verify (`auth.login`) and the contact-review submit
//     API (`contact_review.submitted`)
//   - a lightweight client beacon (`/api/track`) for page-view signals the DB
//     can't otherwise infer (dashboard / brief / paywall views)
// Complements PlaybookEvent, which is pipeline-scoped. NOTE: page-view / login
// data only accrues from this feature's deploy forward — there is no backfill.

// Allowlist of event types. `/api/track` rejects anything not in this set so a
// client can't spam arbitrary event types into the table.
export const USER_EVENT_TYPES = [
  'auth.login', // magic-link / OAuth verified — the "returned to the app" signal
  'dashboard.viewed',
  'brief.viewed', // landed on the product-brief step
  'contact_review.viewed',
  'contact_review.submitted', // acted on the contact-review CTA (server-logged)
  'paywall.viewed',
  'paywall.checkout_clicked',
] as const

export type UserEventType = (typeof USER_EVENT_TYPES)[number]

export function isUserEventType(value: unknown): value is UserEventType {
  return typeof value === 'string' && (USER_EVENT_TYPES as readonly string[]).includes(value)
}

// Best-effort event write. Never throws into the calling request path — a
// failed analytics insert must not break auth, navigation, or the review flow.
export async function logUserEvent(
  userId: string,
  type: UserEventType,
  opts: { path?: string; metadata?: Record<string, unknown> } = {},
): Promise<void> {
  try {
    await prisma.userEvent.create({
      data: {
        userId,
        type,
        path: opts.path ?? null,
        metadata: JSON.stringify(opts.metadata ?? {}),
      },
    })
  } catch (err) {
    console.error('[user-events] failed to log', type, 'for', userId, err)
  }
}
