'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, Loader2 } from 'lucide-react'

export function AdminPlaybookApprove({ playbookId, status }: { playbookId: string; status: string }) {
  const router = useRouter()
  const [busy, setBusy] = useState(false)

  if (status !== 'contact_review') return null

  async function handleApprove(e: React.MouseEvent) {
    e.preventDefault() // row is wrapped in a Link — don't navigate
    e.stopPropagation()
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}`, { method: 'PATCH' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (res.status === 409) {
        toast.message('This playbook is not at contact review stage')
        return
      }
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `Approve failed (${res.status})`)
      toast.success('Contacts approved', {
        description: 'Writing phase queued',
      })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not approve contacts.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      onClick={handleApprove}
      disabled={busy}
      title="Approve contacts and continue to writing"
      className="inline-flex items-center justify-center gap-1 h-7 px-2 rounded-md text-[11px] border border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 transition-colors disabled:opacity-50"
    >
      {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <CheckCircle2 className="w-3 h-3" />}
      Approve
    </button>
  )
}
