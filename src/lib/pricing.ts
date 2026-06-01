// MVP plans: one_off + growth. Multi-seat tiers reserved for future.
export type PlanId = 'free' | 'one_off' | 'growth'

export const ONE_OFF_PRICE_USD = 29
export const GROWTH_PRICE_USD = 229

// How many of a user's most recent playbooks we retain on our servers (and
// surface on the dashboard). Once a new playbook pushes the count past this,
// the oldest *terminal* playbooks beyond the window are permanently purged
// (in-flight work and drafts are never touched). Growth keeps a deeper history;
// pay-per-playbook tiers keep a short recent window.
export const PLAYBOOK_RETENTION_LIMITS = {
  free: 5,
  one_off: 5,
  growth: 20,
} as const satisfies Record<PlanId, number>

export function playbookRetentionLimit(plan: string | null | undefined): number {
  const p = (plan ?? 'free') as PlanId
  return PLAYBOOK_RETENTION_LIMITS[p] ?? PLAYBOOK_RETENTION_LIMITS.free
}

export const MVP_PLANS = [
  {
    id: 'one_off' as const,
    name: 'One Off',
    pricePerUse: ONE_OFF_PRICE_USD,
    priceMonthly: null,
    playbooksPerMonth: null, // credit-gated, each credit = 1 playbook
    seats: 1,
    isSubscription: false,
    description: 'Single playbook, no commitment.',
  },
  {
    id: 'growth' as const,
    name: 'Growth',
    pricePerUse: null,
    priceMonthly: 229,
    playbooksPerMonth: 10,
    seats: 1,
    isSubscription: true,
    description: 'Monthly cadence — 10 playbooks per month.',
  },
] as const

// Future plans (schema-ready, not active in MVP)
export const SUBSCRIPTION_PLANS = [
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 229,
    playbooksPerMonth: 10,
    seats: 1,
    description: 'For teams ready to scale ABM with a monthly cadence.',
    highlight: true,
  },
  {
    id: 'professional',
    name: 'Professional',
    priceMonthly: 799,
    playbooksPerMonth: 30,
    seats: 3,
    description: 'For growing ABM teams running multiple accounts in parallel.',
    highlight: false,
  },
  {
    id: 'agency',
    name: 'Agency',
    priceMonthly: 1999,
    playbooksPerMonth: null,
    seats: 10,
    description: 'Full-service ABM at scale with human SME review and white-label.',
    highlight: false,
  },
] as const
