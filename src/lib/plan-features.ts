import type { PlanId } from '@/lib/pricing'

// Maps each feature to the plans that can access it
const PLAN_FEATURES = {
  playbook_generate: ['free', 'one_off', 'growth'],
  dashboard_stats: ['growth'],
  // free (pay-per-playbook) users must see their playbooks to open + unlock them.
  dashboard_recent: ['free', 'one_off', 'growth'],
  playbook_history: ['growth'],
} as const satisfies Record<string, readonly PlanId[]>

export type FeatureKey = keyof typeof PLAN_FEATURES

export function canAccess(plan: string | null | undefined, feature: FeatureKey): boolean {
  const p = (plan ?? 'free') as PlanId
  return (PLAN_FEATURES[feature] as readonly string[]).includes(p)
}

export function isPlanActive(plan: string | null | undefined): boolean {
  return !!plan && plan !== 'free'
}
