// Client-side behavior-event beacon. Fire-and-forget: uses sendBeacon when
// available (survives page unload / navigation), falling back to keepalive
// fetch. Never throws — analytics must not affect the UX.
export function track(type: string, meta?: Record<string, unknown>): void {
  if (typeof window === 'undefined') return

  const payload = JSON.stringify({ type, path: window.location.pathname, ...meta })

  try {
    if (navigator.sendBeacon) {
      const blob = new Blob([payload], { type: 'application/json' })
      const ok = navigator.sendBeacon('/api/track', blob)
      if (ok) return
    }
    void fetch('/api/track', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: payload,
      keepalive: true,
    }).catch(() => {})
  } catch {
    // swallow — best-effort telemetry
  }
}
