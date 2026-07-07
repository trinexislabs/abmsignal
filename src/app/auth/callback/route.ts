import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logUserEvent } from '@/server/analytics/user-events'

// OAuth (Google) + PKCE code exchange. Supabase redirects here with `?code=`
// after the user authenticates with the provider.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'
  // Behind Cloudflare Tunnel the request origin is localhost; trust the
  // configured public URL for the post-login redirect.
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // Behavior funnel: OAuth code exchanged = user returned to app.
      if (data.user) await logUserEvent(data.user.id, 'auth.login', { path: '/auth/callback' })
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${base}/auth/error?error=OAuthCallback`)
}
