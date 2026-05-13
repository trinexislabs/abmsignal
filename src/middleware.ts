import { NextResponse, type NextRequest } from 'next/server'

// Prototype mode: no auth middleware
// TODO: Re-enable Supabase auth when backend is connected
export async function middleware(request: NextRequest) {
  return NextResponse.next()
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}