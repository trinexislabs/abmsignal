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

export async function getUserRecentPlaybooks(userId: string, limit = 5) {
  return prisma.playbook.findMany({
    where: { userId },
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
