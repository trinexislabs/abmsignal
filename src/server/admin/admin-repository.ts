import { prisma } from '@/server/db'
import { GROWTH_PRICE_USD, ONE_OFF_PRICE_USD } from '@/lib/pricing'
import type { PlaybookStatus } from '@/types'

// Playbook status buckets (mirrors src/types/index.ts PlaybookStatus).
export const FAILED_STATUSES: PlaybookStatus[] = ['error', 'rejected', 'failed', 'cancelled']
export const IN_PROGRESS_STATUSES: PlaybookStatus[] = [
  'queued',
  'pending_queue',
  'researching',
  'contact_review',
  'writing',
  'reviewing',
]
const SUCCESS_STATUS: PlaybookStatus = 'complete'

export interface PlatformStats {
  totalUsers: number
  newUsers30d: number
  usersByPlan: Record<string, number>
  activeSubscriptions: number
  totalPlaybooks: number
  playbooksByStatus: Record<string, number>
  completed: number
  failed: number
  inProgress: number
  successRate: number // 0-100, of terminal (completed + failed) playbooks
  creditsGranted: number
  creditsConsumed: number
  confirmedContacts: number
}

// ── Platform-wide KPIs ────────────────────────────────────────────────────────
export async function getPlatformStats(): Promise<PlatformStats> {
  const since30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

  const [
    totalUsers,
    newUsers30d,
    planGroups,
    activeSubscriptions,
    totalPlaybooks,
    statusGroups,
    creditAgg,
    consumedAgg,
    confirmedContacts,
  ] = await Promise.all([
    prisma.user.count(),
    prisma.user.count({ where: { createdAt: { gte: since30d } } }),
    prisma.userSubscription.groupBy({ by: ['plan'], _count: { _all: true } }),
    prisma.userSubscription.count({ where: { status: 'active', plan: { not: 'free' } } }),
    prisma.playbook.count(),
    prisma.playbook.groupBy({ by: ['status'], _count: { _all: true } }),
    prisma.userCredit.aggregate({ where: { amount: { gt: 0 } }, _sum: { amount: true } }),
    prisma.userCredit.aggregate({ where: { amount: { lt: 0 } }, _sum: { amount: true } }),
    prisma.playbookContact.count({ where: { verificationStatus: 'confirmed' } }),
  ])

  const usersByPlan: Record<string, number> = {}
  for (const g of planGroups) usersByPlan[g.plan] = g._count._all

  const playbooksByStatus: Record<string, number> = {}
  for (const g of statusGroups) playbooksByStatus[g.status] = g._count._all

  const completed = playbooksByStatus[SUCCESS_STATUS] ?? 0
  const failed = FAILED_STATUSES.reduce((sum, s) => sum + (playbooksByStatus[s] ?? 0), 0)
  const inProgress = IN_PROGRESS_STATUSES.reduce((sum, s) => sum + (playbooksByStatus[s] ?? 0), 0)
  const terminal = completed + failed
  const successRate = terminal > 0 ? Math.round((completed / terminal) * 100) : 0

  return {
    totalUsers,
    newUsers30d,
    usersByPlan,
    activeSubscriptions,
    totalPlaybooks,
    playbooksByStatus,
    completed,
    failed,
    inProgress,
    successRate,
    creditsGranted: creditAgg._sum.amount ?? 0,
    creditsConsumed: Math.abs(consumedAgg._sum.amount ?? 0),
    confirmedContacts,
  }
}

export interface RevenueEstimate {
  mrr: number
  growthSubscribers: number
  oneOffRevenue: number
  oneOffPurchases: number
  totalToDate: number
}

// Best-effort revenue from the mock billing data:
//  • MRR  = active growth subscriptions × monthly price
//  • One-off = count of one-off payment credit rows × per-playbook price
export async function getRevenueEstimate(): Promise<RevenueEstimate> {
  const [growthSubscribers, oneOffPurchases] = await Promise.all([
    prisma.userSubscription.count({ where: { plan: 'growth', status: 'active' } }),
    prisma.userCredit.count({ where: { reason: 'mock_payment_one_off' } }),
  ])

  const mrr = growthSubscribers * GROWTH_PRICE_USD
  const oneOffRevenue = oneOffPurchases * ONE_OFF_PRICE_USD

  return {
    mrr,
    growthSubscribers,
    oneOffRevenue,
    oneOffPurchases,
    totalToDate: mrr + oneOffRevenue,
  }
}

export interface DayPoint {
  date: string // YYYY-MM-DD
  signups: number
  playbooks: number
}

// Daily signups + playbooks created over the last `days`. We pull raw createdAt
// timestamps and bucket in JS to avoid SQLite-specific date SQL.
export async function getUsageTimeseries(days = 30): Promise<DayPoint[]> {
  const since = new Date(Date.now() - (days - 1) * 24 * 60 * 60 * 1000)
  since.setHours(0, 0, 0, 0)

  const [users, playbooks] = await Promise.all([
    prisma.user.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
    prisma.playbook.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
  ])

  const key = (d: Date) => d.toISOString().slice(0, 10)
  const buckets = new Map<string, DayPoint>()
  for (let i = 0; i < days; i++) {
    const d = new Date(since.getTime() + i * 24 * 60 * 60 * 1000)
    buckets.set(key(d), { date: key(d), signups: 0, playbooks: 0 })
  }
  for (const u of users) {
    const b = buckets.get(key(u.createdAt))
    if (b) b.signups++
  }
  for (const p of playbooks) {
    const b = buckets.get(key(p.createdAt))
    if (b) b.playbooks++
  }
  return [...buckets.values()]
}

const PAGE_SIZE = 25

export interface AdminUserRow {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
  plan: string
  status: string
  playbookCount: number
  credits: number
  createdAt: Date
  lastActivity: Date | null
}

export interface ListUsersResult {
  rows: AdminUserRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Users list (search + plan filter + pagination) ──────────────────────────
export async function listUsers(opts: {
  search?: string
  plan?: string
  page?: number
}): Promise<ListUsersResult> {
  const page = Math.max(1, opts.page ?? 1)
  const where: Record<string, unknown> = {}
  if (opts.search) {
    where.OR = [
      { email: { contains: opts.search } },
      { name: { contains: opts.search } },
    ]
  }
  if (opts.plan && opts.plan !== 'all') {
    where.subscription = { is: { plan: opts.plan } }
  }

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: {
        subscription: true,
        _count: { select: { playbooks: true } },
        playbooks: { orderBy: { updatedAt: 'desc' }, take: 1, select: { updatedAt: true } },
      },
    }),
  ])

  // Credit balances in one grouped query rather than N per-user aggregates.
  const ids = users.map((u) => u.id)
  const creditGroups = ids.length
    ? await prisma.userCredit.groupBy({
        by: ['userId'],
        where: { userId: { in: ids } },
        _sum: { amount: true },
      })
    : []
  const creditByUser = new Map(creditGroups.map((g) => [g.userId, g._sum.amount ?? 0]))

  const rows: AdminUserRow[] = users.map((u) => ({
    id: u.id,
    name: u.name,
    email: u.email,
    image: u.image,
    role: u.role,
    plan: u.subscription?.plan ?? 'free',
    status: u.subscription?.status ?? 'active',
    playbookCount: u._count.playbooks,
    credits: creditByUser.get(u.id) ?? 0,
    createdAt: u.createdAt,
    lastActivity: u.playbooks[0]?.updatedAt ?? null,
  }))

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

// ── Single user detail ────────────────────────────────────────────────────────
export async function getUserDetail(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      subscription: true,
      credits: { orderBy: { createdAt: 'desc' } },
      playbooks: { orderBy: { updatedAt: 'desc' } },
      accounts: { select: { provider: true } },
    },
  })
  if (!user) return null

  const balance = user.credits.reduce((sum, c) => sum + c.amount, 0)
  return { ...user, creditBalance: balance }
}

export interface AdminPlaybookRow {
  id: string
  productName: string
  targetCompany: string
  status: string
  progressPct: number
  failedReason: string | null
  createdAt: Date
  updatedAt: Date
  ownerId: string | null
  ownerName: string | null
  ownerEmail: string | null
}

export interface ListPlaybooksResult {
  rows: AdminPlaybookRow[]
  total: number
  page: number
  pageSize: number
  totalPages: number
}

// ── Playbooks list (status filter + search + pagination) ────────────────────
export async function listPlaybooks(opts: {
  status?: string
  search?: string
  page?: number
}): Promise<ListPlaybooksResult> {
  const page = Math.max(1, opts.page ?? 1)
  const where: Record<string, unknown> = {}

  if (opts.status && opts.status !== 'all') {
    if (opts.status === 'failed_any') where.status = { in: FAILED_STATUSES }
    else if (opts.status === 'in_progress') where.status = { in: IN_PROGRESS_STATUSES }
    else where.status = opts.status
  }
  if (opts.search) {
    where.OR = [
      { productName: { contains: opts.search } },
      { targetCompany: { contains: opts.search } },
    ]
  }

  const [total, playbooks] = await Promise.all([
    prisma.playbook.count({ where }),
    prisma.playbook.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: { user: { select: { id: true, name: true, email: true } } },
    }),
  ])

  const rows: AdminPlaybookRow[] = playbooks.map((p) => ({
    id: p.id,
    productName: p.productName,
    targetCompany: p.targetCompany,
    status: p.status,
    progressPct: p.progressPct,
    failedReason: p.failedReason,
    createdAt: p.createdAt,
    updatedAt: p.updatedAt,
    ownerId: p.user?.id ?? null,
    ownerName: p.user?.name ?? null,
    ownerEmail: p.user?.email ?? null,
  }))

  return { rows, total, page, pageSize: PAGE_SIZE, totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)) }
}

// ── Single playbook detail (full content + diagnostics) ─────────────────────
export async function getPlaybookDetail(playbookId: string) {
  return prisma.playbook.findUnique({
    where: { id: playbookId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      runs: { orderBy: { createdAt: 'desc' } },
      events: { orderBy: { createdAt: 'desc' }, take: 100 },
      sections: { orderBy: { orderIndex: 'asc' } },
      contacts: { orderBy: { createdAt: 'asc' } },
      sources: true,
    },
  })
}

// Recent failed playbooks for the overview dashboard.
export async function getRecentFailedPlaybooks(limit = 6) {
  const playbooks = await prisma.playbook.findMany({
    where: { status: { in: FAILED_STATUSES } },
    orderBy: { updatedAt: 'desc' },
    take: limit,
    include: { user: { select: { name: true, email: true } } },
  })
  return playbooks
}

// Most recent signups for the overview dashboard.
export async function getRecentSignups(limit = 6) {
  return prisma.user.findMany({
    orderBy: { createdAt: 'desc' },
    take: limit,
    include: { subscription: { select: { plan: true } } },
  })
}
