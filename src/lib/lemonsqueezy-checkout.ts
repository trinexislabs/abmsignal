'use client'

// Thin client wrapper around Lemon.js for the overlay (modal) checkout, so users
// stay on ABMSignal while paying. Lemon.js is loaded on first use.

/* eslint-disable @typescript-eslint/no-explicit-any */
declare global {
  interface Window {
    LemonSqueezy?: any
    createLemonSqueezy?: () => void
  }
}

let loadPromise: Promise<void> | null = null
let currentOnSuccess: (() => void) | null = null

function loadLemon(): Promise<void> {
  if (typeof window === 'undefined') return Promise.reject(new Error('no window'))
  if (window.LemonSqueezy) return Promise.resolve()
  if (loadPromise) return loadPromise

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script')
    script.src = 'https://assets.lemonsqueezy.com/lemon.js'
    script.defer = true
    script.onload = () => {
      try {
        window.createLemonSqueezy?.()
        // Single global handler → dispatches to whichever checkout is open.
        window.LemonSqueezy?.Setup({
          eventHandler: (event: any) => {
            if (event?.event === 'Checkout.Success') {
              currentOnSuccess?.()
            }
          },
        })
        resolve()
      } catch (e) {
        reject(e as Error)
      }
    }
    script.onerror = () => reject(new Error('Failed to load Lemon.js'))
    document.head.appendChild(script)
  })
  return loadPromise
}

/**
 * Open the Lemon Squeezy checkout as an overlay. `onSuccess` fires when the
 * payment completes (entitlement still applies via webhook — poll afterwards).
 */
export async function openCheckoutOverlay(url: string, onSuccess: () => void): Promise<void> {
  await loadLemon()
  currentOnSuccess = onSuccess
  window.LemonSqueezy.Url.Open(url)
}
