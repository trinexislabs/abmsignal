import { redirect } from 'next/navigation'
import { auth } from '@/auth'
import { prisma } from '@/server/db'

export interface AdminUser {
  id: string
  name: string | null
  email: string
  image: string | null
  role: string
}

// Server-side admin gate. Re-verifies the role against the DB rather than
// trusting only the JWT, so a demoted user can't keep operating on a stale
// token and a freshly-promoted user is recognized without re-login. Redirects
// to /admin/login when the caller is not an authenticated admin.
export async function requireAdmin(): Promise<AdminUser> {
  const session = await auth()
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
  const session = await auth()
  const userId = session?.user?.id
  if (!userId) return false
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  })
  return user?.role === 'admin'
}
