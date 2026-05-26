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
