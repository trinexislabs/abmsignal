'use client'

import { useEffect } from 'react'

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[ErrorBoundary] Uncaught error:', error)
    console.error('[ErrorBoundary] Error message:', error.message)
    console.error('[ErrorBoundary] Error stack:', error.stack)
    console.error('[ErrorBoundary] Error digest:', error.digest)
  }, [error])

  return (
    <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center">
      <div className="text-center max-w-lg px-6">
        <div className="w-16 h-16 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center mx-auto mb-5">
          <span className="text-3xl">⚠️</span>
        </div>
        <h1 className="text-xl font-bold text-white mb-3">Something went wrong</h1>
        <p className="text-sm text-[#9CA3AF] mb-2">
          An error occurred while loading this page.
        </p>
        <div className="bg-[#111827] border border-red-500/20 rounded-lg p-3 mb-6 text-left">
          <p className="text-xs text-red-400 font-mono break-all">{error.message}</p>
          {error.digest && (
            <p className="text-xs text-[#9CA3AF] mt-1">Digest: {error.digest}</p>
          )}
        </div>
        <div className="flex items-center justify-center gap-4">
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-[#10B981] text-white rounded-lg text-sm font-medium hover:bg-[#10B981]/90 transition-colors"
          >
            Try Again
          </button>
          <a href="/dashboard" className="text-[#10B981] text-sm hover:underline">
            ← Dashboard
          </a>
        </div>
      </div>
    </div>
  )
}