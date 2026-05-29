import NextAuth from 'next-auth'
import { authConfig } from '@/auth.config'
import { NextResponse } from 'next/server'

const { auth } = NextAuth(authConfig)

const PROTECTED = ['/dashboard', '/playbook/new', '/playbook/', '/settings', '/onboarding']
const AUTH_PAGES = ['/auth/signin', '/auth/signup']

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user
  const isAdmin = session?.user?.role === 'admin'

  // ── Admin portal (separate from the customer journey) ──────────────────────
  // The /admin/login page is public; everything else under /admin requires an
  // authenticated admin. The JWT role here is a gate hint — pages additionally
  // re-verify via requireAdmin() against the DB.
  if (nextUrl.pathname === '/admin/login') {
    if (isAdmin) return NextResponse.redirect(new URL('/admin', nextUrl))
    return NextResponse.next()
  }
  if (nextUrl.pathname.startsWith('/admin')) {
    if (!isAdmin) return NextResponse.redirect(new URL('/admin/login', nextUrl))
    return NextResponse.next()
  }

  const isProtected = PROTECTED.some((p) => nextUrl.pathname.startsWith(p))
  const isAuthPage = AUTH_PAGES.some((p) => nextUrl.pathname.startsWith(p))

  if (isProtected && !isLoggedIn) {
    const callbackUrl = nextUrl.pathname + nextUrl.search
    return NextResponse.redirect(
      new URL(`/auth/signin?callbackUrl=${encodeURIComponent(callbackUrl)}`, nextUrl)
    )
  }

  if (isAuthPage && isLoggedIn) {
    return NextResponse.redirect(new URL('/dashboard', nextUrl))
  }

  return NextResponse.next()
})

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
