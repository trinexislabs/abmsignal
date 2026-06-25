'use client'

import { useEffect, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/client'

export interface AuthUser {
  id: string
  email: string
  name: string | null
  image: string | null
}

function toAuthUser(u: User | null): AuthUser | null {
  if (!u) return null
  const meta = (u.user_metadata ?? {}) as Record<string, unknown>
  return {
    id: u.id,
    email: u.email ?? '',
    name: (meta.full_name as string) ?? (meta.name as string) ?? null,
    image: (meta.avatar_url as string) ?? (meta.picture as string) ?? null,
  }
}

// Client-side replacement for NextAuth's useSession(). Returns a normalized
// user ({ id, email, name, image }) and a loading flag, kept in sync via
// onAuthStateChange.
export function useUser() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data }) => {
      setUser(toAuthUser(data.user))
      setLoading(false)
    })

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(toAuthUser(session?.user ?? null))
      setLoading(false)
    })

    return () => sub.subscription.unsubscribe()
  }, [])

  return { user, loading }
}
