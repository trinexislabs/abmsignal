import { redirect } from 'next/navigation'
import { requireAuth } from '@/lib/auth/session'
import { MockPaymentForm } from './mock-payment-form'

export default async function MockPaymentPage({
  searchParams,
}: {
  searchParams: Promise<{ purpose?: string; plan?: string; amount?: string; returnTo?: string }>
}) {
  await requireAuth()
  const params = await searchParams
  const purpose = (params.purpose === 'plan' || params.purpose === 'playbook') ? params.purpose : null
  const plan = params.plan === 'growth' || params.plan === 'one_off' ? params.plan : undefined
  const amount = Number(params.amount ?? 0)
  if (!purpose || !amount || amount < 1) redirect('/dashboard')

  // Only forward same-origin paths; the API re-validates before honoring it.
  const returnTo =
    params.returnTo && params.returnTo.startsWith('/') && !params.returnTo.startsWith('//')
      ? params.returnTo
      : undefined

  return <MockPaymentForm purpose={purpose} plan={plan} amount={amount} returnTo={returnTo} />
}
