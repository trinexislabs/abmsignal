import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { getUserSubscription } from '@/server/users/user-repository'
import { PlanSelector } from './plan-selector'

export default async function OnboardingPlanPage() {
  const session = await requireAuth()
  const sub = await getUserSubscription(session.user.id)

  // Already on an active plan — skip onboarding
  if (sub?.plan && sub.plan !== 'free') {
    redirect('/dashboard')
  }

  const firstName = session.user?.name?.split(' ')[0] ?? 'there'
  return <PlanSelector firstName={firstName} />
}
