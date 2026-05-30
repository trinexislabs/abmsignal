import { prisma } from '@/server/db'

export async function getUserWithDetails(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      credits: { orderBy: { createdAt: 'desc' } },
    },
  })
}

export async function getUserPlaybookStats(userId: string) {
  const [total, active, completed, contacts] = await Promise.all([
    prisma.playbook.count({ where: { userId } }),
    prisma.playbook.count({
      where: { userId, status: { in: ['researching', 'writing', 'reviewing', 'contact_review'] } },
    }),
    prisma.playbook.count({ where: { userId, status: 'complete' } }),
    prisma.playbookContact.count({
      where: {
        playbook: { userId },
        verificationStatus: 'confirmed',
      },
    }),
  ])
  return { total, active, completed, contacts }
}

export async function getUserRecentPlaybooks(
  userId: string,
  limit = 5,
  createdAfter?: Date,
) {
  return prisma.playbook.findMany({
    where: {
      userId,
      ...(createdAfter ? { createdAt: { gt: createdAfter } } : {}),
    },
    orderBy: { updatedAt: 'desc' },
    take: limit,
  })
}

export async function getUserCreditBalance(userId: string): Promise<number> {
  const result = await prisma.userCredit.aggregate({
    where: { userId },
    _sum: { amount: true },
  })
  return result._sum.amount ?? 0
}

export async function getUserSubscription(userId: string) {
  return prisma.userSubscription.findUnique({ where: { userId } })
}

export async function upsertUserPlan(userId: string, plan: string) {
  return prisma.userSubscription.upsert({
    where: { userId },
    update: { plan, status: 'active', updatedAt: new Date() },
    create: { userId, plan, status: 'active' },
  })
}

// How many playbooks per cycle on the growth plan. Drives both the credit
// grant on subscription and the "X playbooks remaining" surfacing in the UI.
export const GROWTH_CYCLE_CREDITS = 10
export const GROWTH_CYCLE_DAYS = 30

// Resets a growth user's credit balance to exactly GROWTH_CYCLE_CREDITS and
// bumps currentPeriodEnd to now + GROWTH_CYCLE_DAYS. We write a single delta
// row so the history still aggregates correctly (positive entries on grant,
// negative on consume). Called on every successful growth subscription
// payment (initial AND renewal) — use-it-or-lose-it.
export async function activateGrowthCycle(userId: string): Promise<void> {
  const current = await getUserCreditBalance(userId)
  const delta = GROWTH_CYCLE_CREDITS - current
  const periodEnd = new Date(Date.now() + GROWTH_CYCLE_DAYS * 24 * 60 * 60 * 1000)

  await prisma.$transaction([
    prisma.userSubscription.upsert({
      where: { userId },
      update: {
        plan: 'growth',
        status: 'active',
        currentPeriodEnd: periodEnd,
        updatedAt: new Date(),
      },
      create: {
        userId,
        plan: 'growth',
        status: 'active',
        currentPeriodEnd: periodEnd,
      },
    }),
    // Always log a row so the audit trail makes sense even when delta is 0.
    prisma.userCredit.create({
      data: {
        userId,
        amount: delta,
        reason: delta >= 0 ? 'growth_cycle_grant' : 'growth_cycle_reset',
      },
    }),
  ])
}

// Reason strings are the audit trail for the credit ledger. Consumption rows
// are written at playbook creation as `playbook_consumed:<id>`; errored-delete
// refunds as `errored_playbook_refund:<id>`. Keying both by playbook id lets us
// pair them and stay idempotent.
export const playbookConsumedReason = (playbookId: string) => `playbook_consumed:${playbookId}`
export const erroredRefundReason = (playbookId: string) => `errored_playbook_refund:${playbookId}`

// When a growth subscriber deletes a playbook that ended in the errored state,
// credit one cycle credit back so they're never charged for a failed
// production. This is deliberately conservative — it returns { refunded: false }
// (rather than throwing) for every case that doesn't strictly qualify:
//
//   • Only growth subscribers have a cycle quota to credit back.
//   • A credit must actually have been consumed for THIS playbook. Anonymous,
//     legacy, or free-tier playbooks have no consumption row → nothing to refund.
//   • Exactly once per playbook (idempotent): a prior refund row blocks a second.
//   • Same-cycle only. Growth credits are use-it-or-lose-it and reset each cycle
//     (see activateGrowthCycle). Refunding a credit spent in an already-reset
//     prior cycle would push the balance above the cycle cap, so we skip it.
//
// The caller is responsible for the two business preconditions this can't see:
// the playbook's final status really is 'error', and the user chose to DELETE
// (not regenerate). UserCredit rows are keyed to the user, not the playbook, so
// this is safe to call after the playbook rows are gone — the ledger survives.
export async function refundGrowthCreditForErroredPlaybook(
  userId: string,
  playbookId: string,
): Promise<{ refunded: boolean; balance: number }> {
  const sub = await getUserSubscription(userId)
  if (sub?.plan !== 'growth') {
    return { refunded: false, balance: await getUserCreditBalance(userId) }
  }

  // Idempotency: never refund the same playbook twice.
  const alreadyRefunded = await prisma.userCredit.findFirst({
    where: { userId, reason: erroredRefundReason(playbookId) },
    select: { id: true },
  })
  if (alreadyRefunded) {
    return { refunded: false, balance: await getUserCreditBalance(userId) }
  }

  // A credit must actually have been consumed for this playbook.
  const consumption = await prisma.userCredit.findFirst({
    where: { userId, reason: playbookConsumedReason(playbookId) },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  if (!consumption) {
    return { refunded: false, balance: await getUserCreditBalance(userId) }
  }

  // Same-cycle guard. currentPeriodEnd anchors the window
  // [periodEnd - GROWTH_CYCLE_DAYS, periodEnd]; a consumption older than that
  // belongs to a prior, already-reset cycle and was forfeited (use-it-or-lose-it).
  if (sub.currentPeriodEnd) {
    const periodStart = new Date(
      sub.currentPeriodEnd.getTime() - GROWTH_CYCLE_DAYS * 24 * 60 * 60 * 1000,
    )
    if (consumption.createdAt < periodStart) {
      return { refunded: false, balance: await getUserCreditBalance(userId) }
    }
  }

  await prisma.userCredit.create({
    data: { userId, amount: 1, reason: erroredRefundReason(playbookId) },
  })
  return { refunded: true, balance: await getUserCreditBalance(userId) }
}
