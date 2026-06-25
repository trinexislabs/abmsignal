import { NextResponse } from 'next/server'
import { isAdmin } from '@/lib/auth/admin'

// Lets the admin login page verify (server-side, against the DB) whether the
// just-signed-in user actually has the admin role. The role is not in the
// Supabase JWT, so the client can't check it directly.
export async function GET() {
  return NextResponse.json({ isAdmin: await isAdmin() })
}
