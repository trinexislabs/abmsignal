import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import {
  getUserCreditBalance,
  getUserSubscription,
} from '@/server/users/user-repository'
import { ONE_OFF_PRICE_USD } from '@/lib/pricing'

// Server-side gate for the playbook-creation flow.
// - free  → onboarding plan picker
// - one_off → no gate at entry; the $49 charge fires only after the user
//             clicks "Start research" on the target-account page (handled
//             client-side in /playbook/new/processing when POST returns 402).
//             This lets prospects experience the brief/account flow first to
//             build trust before being asked to pay.
// - growth  → require ≥1 credit (10 are granted per 30-day cycle; mid-cycle
//             top-ups follow the same $49 path as one_off)
export default async function NewPlaybookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await requireAuth()
  const userId = session.user.id as string

  const sub = await getUserSubscription(userId)
  const plan = sub?.plan ?? 'free'

  if (plan === 'free') {
    redirect('/onboarding/plan')
  }

  if (plan === 'growth') {
    const credits = await getUserCreditBalance(userId)
    if (credits < 1) {
      redirect(`/payment/mock?purpose=playbook&amount=${ONE_OFF_PRICE_USD}`)
    }
  }

  return <>{children}</>
}
