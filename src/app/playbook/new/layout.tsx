import { requireAuth } from '@/lib/auth/session'

// Entry gate for the playbook-creation flow. Generation is free under the
// post-generation paywall, so there's no plan or credit gate here — any signed-in
// user can build a playbook and is asked to pay (one-off $29 or Growth $229/mo)
// only after it's generated. Runtime concurrency is still enforced server-side in
// POST /api/playbooks.
export default async function NewPlaybookLayout({
  children,
}: {
  children: React.ReactNode
}) {
  await requireAuth()
  return <>{children}</>
}
