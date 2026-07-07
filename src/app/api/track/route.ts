import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/session'
import { isUserEventType, logUserEvent } from '@/server/analytics/user-events'

// Lightweight client-beacon sink for behavior events (dashboard / brief /
// paywall views). Writes the event for the *authenticated session user* only —
// any client-supplied user id is ignored. Type is validated against the
// server-side allowlist. Always returns 204 so a blocked/failed beacon never
// surfaces to the user.
export async function POST(request: Request) {
  try {
    const session = await getSession()
    if (!session) return new NextResponse(null, { status: 204 })

    const body = (await request.json().catch(() => ({}))) as {
      type?: unknown
      path?: unknown
    }

    if (isUserEventType(body.type)) {
      await logUserEvent(session.user.id, body.type, {
        path: typeof body.path === 'string' ? body.path.slice(0, 512) : undefined,
      })
    }
  } catch (err) {
    console.error('[api/track] error', err)
  }

  return new NextResponse(null, { status: 204 })
}
