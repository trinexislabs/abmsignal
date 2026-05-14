'use client'

import { useEffect } from 'react'

export default function GlobalErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[GlobalErrorBoundary] Uncaught error:', error)
    console.error('[GlobalErrorBoundary] Error message:', error.message)
    console.error('[GlobalErrorBoundary] Error stack:', error.stack)
    console.error('[GlobalErrorBoundary] Error digest:', error.digest)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-sm text-[#a1a1aa] mb-2">
          An unexpected error occurred. Our team has been notified.
        </p>
        <div className="bg-[#141419] border border-red-500/20 rounded-lg p-3 mb-6 text-left">
          <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
          {error.digest && (
            <p className="text-xs text-[#a1a1aa] mt-1">Error ID: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#339af0] text-white rounded-lg text-sm font-medium hover:bg-[#339af0]/90 transition-colors"
          >
            Try Again
          </button>
          <a href="/dashboard" className="text-[#339af0] text-sm hover:underline">
            ← Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}