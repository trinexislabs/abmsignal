import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

const PROTECTED = ['/dashboard', '/playbook/new', '/playbook/', '/settings', '/onboarding']
const AUTH_PAGES = ['/auth/signin', '/auth/signup']

export async function middleware(request: NextRequest) {
  // Always refresh the Supabase session first; `supabaseResponse` carries the
  // refreshed auth cookies that MUST be returned (or copied onto a redirect).
  const { supabaseResponse, user } = await updateSession(request)

  const { nextUrl } = request
  const path = nextUrl.pathname
  const isLoggedIn = !!user

  // Build a redirect that preserves the refreshed auth cookies.
  const redirectTo = (target: string) => {
    const res = NextResponse.redirect(new URL(target, nextUrl))
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c))
    return res
  }

  // ── Admin portal ───────────────────────────────────────────────────────────
  // /admin/login is public. Other /admin/* requires an authenticated user; the
  // actual admin-role check is enforced server-side in requireAdmin() (the role
  // lives in the DB, not the JWT, so we can't check it in Edge middleware).
  if (path === '/admin/login') return supabaseResponse
  if (path.startsWith('/admin')) {
    if (!isLoggedIn) return redirectTo('/admin/login')
    return supabaseResponse
  }

  const isProtected = PROTECTED.some((p) => path.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => path.startsWith(p))

  if (isProtected && !isLoggedIn) {
    const callbackUrl = path + nextUrl.search
    return redirectTo(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`)
  }

  if (isAuthPage && isLoggedIn) {
    return redirectTo('/dashboard')
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
