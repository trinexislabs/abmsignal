'use client'

import { useEffect, useRef } from 'react'
import { track } from '@/lib/analytics/track'

// Drop-in page-view tracker. Renders nothing; fires a single behavior event on
// mount. Safe inside server-rendered pages (it's a client component). The ref
// guards against React 18 StrictMode's double-invoke in development.
export function TrackEvent({ type }: { type: string }) {
  const fired = useRef(false)
  useEffect(() => {
    if (fired.current) return
    fired.current = true
    track(type)
  }, [type])
  return null
}
