export const ONE_OFF_PRICE_USD = 49

export const SUBSCRIPTION_PLANS = [
  {
    id: 'growth',
    name: 'Growth',
    priceMonthly: 299,
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
    playbooksPerMonth: null, // unlimited
    seats: 10,
    description: 'Full-service ABM at scale with human SME review and white-label.',
    highlight: false,
  },
] as const

export type PlanId = (typeof SUBSCRIPTION_PLANS)[number]['id'] | 'one_off' | 'free'

export function getPlanByPlaybooksUsed(
  plan: PlanId,
  used: number
): { label: string; max: number | null; pct: number } {
  const found = SUBSCRIPTION_PLANS.find((p) => p.id === plan)
  if (!found) return { label: 'Pay-per-playbook', max: null, pct: 0 }
  if (found.playbooksPerMonth === null) return { label: found.name, max: null, pct: 0 }
  const pct = Math.min(100, Math.round((used / found.playbooksPerMonth) * 100))
  return { label: found.name, max: found.playbooksPerMonth, pct }
}
