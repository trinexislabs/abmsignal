import { type EmailOtpType } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { logUserEvent } from '@/server/analytics/user-events'

// Email OTP confirmation — magic links, signup confirmation, password reset.
// Supabase email templates link here with `?token_hash=...&type=...`.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next') ?? '/dashboard'
  const base = process.env.NEXT_PUBLIC_APP_URL ?? origin

  if (token_hash && type) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.verifyOtp({ type, token_hash })
    if (!error) {
      // Behavior funnel: magic-link / email-OTP verified = user returned to app.
      if (data.user) await logUserEvent(data.user.id, 'auth.login', { path: '/auth/confirm' })
      return NextResponse.redirect(`${base}${next}`)
    }
  }

  return NextResponse.redirect(`${base}/auth/error?error=Verification`)
}
