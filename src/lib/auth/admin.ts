import { redirect } from 'next/navigation'
import { getSession } from '@/lib/auth/session'
import { prisma } from '@/server/db'

export interface AdminUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

// Server-side admin gate. The `role` lives in our `User` (profile) table, not in
// the Supabase JWT, so we always verify against the DB — a demoted user can't
// keep operating and a freshly-promoted user is recognized without re-login.
// Redirects to /admin/login when the caller is not an authenticated admin.
export async function requireAdmin(): Promise<AdminUser> {
  const session = await getSession()
  const userId = session?.user?.id
  if (!userId) redirect('/admin/login')

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, name: true, email: true, image: true, role: true },
  })

  if (!user || user.role !== 'admin') redirect('/admin/login')

  return user
}

// Non-redirecting variant for places that need to branch on admin status.
export async function isAdmin(): Promise<boolean> {
  const session = await getSession()
  const userId = session?.user?.id
  if (!userId) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === 'admin'
}
