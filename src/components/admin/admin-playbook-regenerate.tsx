'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { RefreshCw, Loader2 } from 'lucide-react'

// Terminal/raw statuses where regeneration is allowed. Anything in
// (queued, pending_queue, researching,
// writing, reviewing) hold runtime resources and must not be re-enqueued.
// contact_review is included: admin may regenerate directly without waiting
// for contact approval (Force-stop remains available separately).
const REGENERABLE_STATUSES = new Set([
  'failed',
  'error',
  'rejected',
  'complete',
  'cancelled',
  'draft',
  'contact_review',
])

export function AdminPlaybookRegenerate({ playbookId, status }: { playbookId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (!REGENERABLE_STATUSES.has(status)) return null

  async function handleRegenerate(e: React.MouseEvent) {
    e.preventDefault() // row is wrapped in a Link — don't navigate
    e.stopPropagation()
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}`, { method: 'PUT' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (res.status === 409) {
        toast.message('This playbook is already generating')
        return
      }
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `Regenerate failed (${res.status})`)
      toast.success('Regeneration started', {
        description: 'The playbook was re-enqueued through the full agent pipeline.',
      })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not regenerate playbook.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleRegenerate}
      disabled={busy}
      title="Regenerate playbook"
      className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[11px] border border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
      Regenerate
    </button>
  )
}
