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

// ── Behavioral funnel ────────────────────────────────────────────────────────
// Distinct-user counts for each step of the product journey, the return-activity
// metrics, and the per-step drop-off user lists (for outreach). Combines two
// data sources:
//   • Derived (retroactive): Playbook status/paidAt + Payment ledger — works on
//     all historical data.
//   • Event-based (from tracking deploy forward only, no backfill): UserEvent
//     'auth.login' / 'brief.viewed' / 'contact_review.submitted'.
// Everything is loaded once here and computed in JS (admin scale), so the funnel
// page makes a single round-trip.

// Playbook status groupings for the funnel (mirror PlaybookStatus).
const GENERATION_STARTED_STATUSES: PlaybookStatus[] = [
  'queued',
  'pending_queue',
  'researching',
  'contact_review',
  'writing',
  'reviewing',
  'complete',
  ...FAILED_STATUSES,
]
const REACHED_REVIEW_STATUSES: PlaybookStatus[] = ['contact_review', 'writing', 'reviewing', 'complete']
const PASSED_REVIEW_STATUSES: PlaybookStatus[] = ['writing', 'reviewing', 'complete']
// Payment ledger states that mean money actually cleared / access was granted.
const PAID_PAYMENT_STATUSES = ['payment_succeeded', 'subscription_active', 'manual_unlock']

export interface FunnelStep {
  key: string
  label: string
  users: number
  description: string
  tracked: boolean // true = relies on new event tracking (no pre-deploy backfill)
}

export interface FunnelSegmentUser {
  id: string
  name: string | null
  email: string
  createdAt: Date
}

export interface FunnelSegment {
  key: string
  label: string
  description: string
  count: number
  users: FunnelSegmentUser[] // capped sample, most recent first
}

export interface FunnelReturnMetrics {
  returners: number // users with ≥1 login event
  repeatLoginUsers: number // users with ≥2 login events
  postBriefReturners: number // any activity after their first brief
  postCompletionReturners: number // any activity after a playbook completed
}

export interface FunnelAnalytics {
  totalUsers: number
  steps: FunnelStep[]
  metrics: FunnelReturnMetrics
  segments: FunnelSegment[]
  hasEventData: boolean // any UserEvent rows exist yet
}

const SEGMENT_SAMPLE_CAP = 50

export async function getFunnelAnalytics(): Promise<FunnelAnalytics> {
  const [users, playbooks, events, payments] = await Promise.all([
    prisma.user.findMany({ select: { id: true, name: true, email: true, createdAt: true } }),
    prisma.playbook.findMany({
      where: { userId: { not: null } },
      select: { userId: true, status: true, completedAt: true, paymentStatus: true, createdAt: true },
    }),
    prisma.userEvent.findMany({ select: { userId: true, type: true, createdAt: true } }),
    prisma.payment.findMany({
      where: { userId: { not: null }, status: { in: PAID_PAYMENT_STATUSES } },
      select: { userId: true },
    }),
  ])

  const userDir = new Map(users.map((u) => [u.id, u]))
  const totalUsers = users.length

  // Distinct-user sets per step.
  const registered = new Set(users.map((u) => u.id))
  const loggedIn = new Set<string>()
  const repeatLoginCount = new Map<string, number>()
  const briefViewed = new Set<string>()
  const reviewSubmittedEvt = new Set<string>()

  for (const e of events) {
    if (e.type === 'auth.login') {
      loggedIn.add(e.userId)
      repeatLoginCount.set(e.userId, (repeatLoginCount.get(e.userId) ?? 0) + 1)
    } else if (e.type === 'brief.viewed') {
      briefViewed.add(e.userId)
    } else if (e.type === 'contact_review.submitted') {
      reviewSubmittedEvt.add(e.userId)
    }
  }

  const briefCreated = new Set<string>()
  const generationStarted = new Set<string>()
  const reachedReview = new Set<string>()
  const passedReview = new Set<string>()
  const completed = new Set<string>()
  const paid = new Set<string>()
  // Earliest brief-created / completed time per user, for return-activity metrics.
  const firstBriefAt = new Map<string, Date>()
  const firstCompletedAt = new Map<string, Date>()

  for (const p of playbooks) {
    const uid = p.userId as string
    briefCreated.add(uid)
    const prevBrief = firstBriefAt.get(uid)
    if (!prevBrief || p.createdAt < prevBrief) firstBriefAt.set(uid, p.createdAt)

    const status = p.status as PlaybookStatus
    if (GENERATION_STARTED_STATUSES.includes(status)) generationStarted.add(uid)
    if (REACHED_REVIEW_STATUSES.includes(status)) reachedReview.add(uid)
    if (PASSED_REVIEW_STATUSES.includes(status)) passedReview.add(uid)
    if (status === 'complete') {
      completed.add(uid)
      if (p.completedAt) {
        const prev = firstCompletedAt.get(uid)
        if (!prev || p.completedAt < prev) firstCompletedAt.set(uid, p.completedAt)
      }
    }
    if (p.paymentStatus === 'paid') paid.add(uid)
  }

  for (const pay of payments) paid.add(pay.userId as string)

  // Unions of derived + event-based signals.
  const reachedBrief = union(briefViewed, briefCreated)
  const passedReviewAll = union(passedReview, reviewSubmittedEvt)

  // Return-activity metrics.
  let repeatLoginUsers = 0
  for (const n of repeatLoginCount.values()) if (n >= 2) repeatLoginUsers++

  // "Activity after X" = a login or dashboard view whose timestamp is later than
  // the user's first brief / first completion.
  const returnEvents = events.filter((e) => e.type === 'auth.login' || e.type === 'dashboard.viewed')
  const postBrief = new Set<string>()
  const postCompletion = new Set<string>()
  for (const e of returnEvents) {
    const briefAt = firstBriefAt.get(e.userId)
    if (briefAt && e.createdAt > briefAt) postBrief.add(e.userId)
    const compAt = firstCompletedAt.get(e.userId)
    if (compAt && e.createdAt > compAt) postCompletion.add(e.userId)
  }

  const steps: FunnelStep[] = [
    { key: 'registered', label: 'Registered', users: registered.size, description: 'Signed up for an account', tracked: false },
    { key: 'returned', label: 'Returned to app', users: loggedIn.size, description: 'Verified a magic-link / login and came back', tracked: true },
    { key: 'brief', label: 'Reached product brief', users: reachedBrief.size, description: 'Opened the product-brief step or created one', tracked: false },
    { key: 'generation', label: 'Started generation', users: generationStarted.size, description: 'Kicked off playbook generation', tracked: false },
    { key: 'review', label: 'Reached contact review', users: reachedReview.size, description: 'Research finished; hit the contact-review gate', tracked: false },
    { key: 'review_cta', label: 'Passed contact-review CTA', users: passedReviewAll.size, description: 'Approved contacts and continued to writing', tracked: false },
    { key: 'completed', label: 'Playbook completed', users: completed.size, description: 'A playbook finished generating', tracked: false },
    { key: 'returned_after_complete', label: 'Returned after completion', users: postCompletion.size, description: 'Came back to the app after a playbook completed', tracked: true },
    { key: 'paid', label: 'Past the paywall', users: paid.size, description: 'Unlocked a playbook / paid', tracked: false },
  ]

  const metrics: FunnelReturnMetrics = {
    returners: loggedIn.size,
    repeatLoginUsers,
    postBriefReturners: postBrief.size,
    postCompletionReturners: postCompletion.size,
  }

  // Drop-off segments (reached step N but not N+1), most valuable for outreach.
  const segments: FunnelSegment[] = [
    buildSegment('registered_not_returned', 'Registered · never returned', 'Signed up but no recorded return visit (tracking starts at deploy).', difference(registered, loggedIn), userDir),
    buildSegment('returned_not_briefed', 'Returned · no product brief', 'Came back but never opened the product-brief step.', difference(loggedIn, reachedBrief), userDir),
    buildSegment('briefed_not_generated', 'Briefed · never generated', 'Started a product brief but never launched generation.', difference(reachedBrief, generationStarted), userDir),
    buildSegment('review_not_submitted', 'Stuck at contact review', 'Reached the contact-review gate but never approved contacts.', difference(reachedReview, passedReviewAll), userDir),
    buildSegment('completed_not_paid', 'Completed · did not pay', 'Playbook finished but never made it past the paywall.', difference(completed, paid), userDir),
  ]

  return { totalUsers, steps, metrics, segments, hasEventData: events.length > 0 }
}

function union(a: Set<string>, b: Set<string>): Set<string> {
  const out = new Set(a)
  for (const v of b) out.add(v)
  return out
}

function difference(a: Set<string>, b: Set<string>): string[] {
  const out: string[] = []
  for (const v of a) if (!b.has(v)) out.push(v)
  return out
}

function buildSegment(
  key: string,
  label: string,
  description: string,
  ids: string[],
  userDir: Map<string, { id: string; name: string | null; email: string; createdAt: Date }>,
): FunnelSegment {
  const users = ids
    .map((id) => userDir.get(id))
    .filter((u): u is NonNullable<typeof u> => Boolean(u))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
  return {
    key,
    label,
    description,
    count: users.length,
    users: users.slice(0, SEGMENT_SAMPLE_CAP).map((u) => ({ id: u.id, name: u.name, email: u.email, createdAt: u.createdAt })),
  }
}
