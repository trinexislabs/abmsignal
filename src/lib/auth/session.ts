import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export interface SessionUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

export interface AppSession {
  user: SessionUser
}

// Returns the current Supabase-authenticated user in a NextAuth-compatible
// shape (`{ user: { id, email, name, image } }`) so callers that previously
// read `session.user.id` keep working. `getUser()` validates the JWT against
// Supabase, so this is safe to trust server-side. Returns null when signed out.
export async function getSession(): Promise<AppSession | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const meta = (user.user_metadata ?? {}) as Record<string, unknown>
  return {
    user: {
      id: user.id,
      email: user.email ?? '',
      name: (meta.full_name as string) ?? (meta.name as string) ?? null,
      image: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
    },
  }
}

export async function requireAuth(): Promise<AppSession> {
  const session = await getSession()
  if (!session) redirect('/auth/signin')
  return session
}
