'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Trash2, OctagonX, RefreshCw, CheckCircle2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface Props {
  playbookId: string
  productName: string
  targetCompany: string
  status: string
}

// Raw DB statuses where a generation is actively holding runtime resources (a
// queue job, the runtime slot, and possibly a live OpenClaw subprocess). Only
// then do we offer Force-stop. (Terminal states and 'draft' hold nothing.)
const RUNTIME_ACTIVE_STATUSES = new Set([
  'queued',
  'pending_queue',
  'researching',
  'contact_review',
  'writing',
  'reviewing',
])

// Terminal statuses + draft where regeneration is offered. Complement of
// RUNTIME_ACTIVE_STATUSES — explicit so a future new status defaults to hidden.
// pending_queue is included: a queued playbook may be stuck behind a failed
// run that never freed the slot — it holds no actual runtime, so admin can
// regenerate it directly (Force-stop remains available separately).
const REGENERABLE_STATUSES = new Set([
  'failed',
  'error',
  'rejected',
  'complete',
  'cancelled',
  'draft',
  'contact_review',
  'pending_queue',
])

export function AdminPlaybookActions({ playbookId, productName, targetCompany, status }: Props) {
  const router = useRouter()
  const [stopOpen, setStopOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [regenOpen, setRegenOpen] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const canForceStop = RUNTIME_ACTIVE_STATUSES.has(status)
  const canRegenerate = REGENERABLE_STATUSES.has(status)

  async function handleRegenerate() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}`, { method: 'PUT' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (res.status === 409) {
        toast.message('This playbook is already generating')
        setRegenOpen(false)
        return
      }
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `Regenerate failed (${res.status})`)

      toast.success('Regeneration started', {
        description: 'The playbook was re-enqueued through the full agent pipeline.',
      })
      setRegenOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not regenerate playbook.')
    } finally {
      setBusy(false)
    }
  }

  async function handleApprove() {
    setError(null)
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
      setError(err instanceof Error ? err.message : 'Could not approve contacts.')
    } finally {
      setBusy(false)
    }
  }

  async function handleForceStop() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}`, { method: 'POST' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `Force-stop failed (${res.status})`)

      const data = (body as { data?: { stopped?: boolean; reason?: string } }).data
      if (data?.stopped) {
        toast.success('Generation stopped', {
          description: 'The run was cancelled and its runtime slot freed.',
        })
      } else {
        toast.message('Nothing to stop', {
          description: data?.reason === 'not_running' ? 'This playbook is not currently generating.' : 'No active run found.',
        })
      }
      setStopOpen(false)
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not force-stop generation.')
    } finally {
      setBusy(false)
    }
  }

  async function handleDelete() {
    setError(null)
    setBusy(true)
    try {
      const res = await fetch(`/api/admin/playbooks/${playbookId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) throw new Error((body as { error?: string }).error ?? `Delete failed (${res.status})`)

      toast.success('Playbook deleted', {
        description: 'All runtime resources were released and the record removed.',
      })
      setDeleteOpen(false)
      router.push('/admin/playbooks')
      router.refresh()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete playbook.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      {canForceStop && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setError(null); setStopOpen(true) }}
          className="h-8 text-xs border-amber-500/30 text-amber-400 hover:bg-amber-500/10 hover:border-amber-500/50 gap-1.5"
        >
          <OctagonX className="w-3.5 h-3.5" /> Force-stop
        </Button>
      )}
      {canRegenerate && (
        <Button
          size="sm"
          variant="outline"
          onClick={() => { setError(null); setRegenOpen(true) }}
          className="h-8 text-xs border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 gap-1.5"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Regenerate
        </Button>
      )}
      {status === 'contact_review' && (
        <Button
          size="sm"
          variant="outline"
          onClick={handleApprove}
          disabled={busy}
          className="h-8 text-xs border-green-500/30 text-green-400 hover:bg-green-500/10 hover:border-green-500/50 gap-1.5"
        >
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Approve &amp; Continue
        </Button>
      )}
      <Button
        size="sm"
        variant="outline"
        onClick={() => { setError(null); setDeleteOpen(true) }}
        className="h-8 text-xs border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 gap-1.5"
      >
        <Trash2 className="w-3.5 h-3.5" /> Delete
      </Button>

      {/* Force-stop confirm */}
      <Dialog open={stopOpen} onOpenChange={(o) => !busy && setStopOpen(o)}>
        <DialogContent className="bg-[#111827] border-amber-500/20 text-white sm:max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center mb-3">
              <OctagonX className="w-5 h-5 text-amber-400" />
            </div>
            <DialogTitle className="text-white font-heading">Force-stop this generation?</DialogTitle>
            <DialogDescription className="text-[#9CA3AF] leading-relaxed">
              This cancels the running generation for{' '}
              <span className="font-semibold text-white">{targetCompany}</span>
              {productName && <> ({productName})</>}, kills its OpenClaw subprocess, and frees the runtime slot.
              The playbook is kept and can be regenerated.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setStopOpen(false)} disabled={busy} className="border-[#374151] text-white hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleForceStop} disabled={busy} className="bg-amber-500 hover:bg-amber-500/90 text-black font-medium gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Stopping…</> : <><OctagonX className="w-4 h-4" /> Yes, force-stop</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <Dialog open={deleteOpen} onOpenChange={(o) => !busy && setDeleteOpen(o)}>
        <DialogContent className="bg-[#111827] border-red-500/20 text-white sm:max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-3">
              <AlertTriangle className="w-5 h-5 text-red-400" />
            </div>
            <DialogTitle className="text-white font-heading">Delete this playbook?</DialogTitle>
            <DialogDescription className="text-[#9CA3AF] leading-relaxed">
              Permanently deletes the playbook for{' '}
              <span className="font-semibold text-white">{targetCompany}</span>
              {productName && <> ({productName})</>} — brief, contacts, sections, sources, runs, and events.
              Any running generation is stopped and all runtime resources released.
              <br /><br />
              <span className="text-red-400 font-semibold">This action cannot be undone.</span>
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setDeleteOpen(false)} disabled={busy} className="border-[#374151] text-white hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleDelete} disabled={busy} className="bg-red-500 hover:bg-red-500/90 text-white gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Deleting…</> : <><Trash2 className="w-4 h-4" /> Yes, delete permanently</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Regenerate confirm */}
      <Dialog open={regenOpen} onOpenChange={(o) => !busy && setRegenOpen(o)}>
        <DialogContent className="bg-[#111827] border-[#339af0]/20 text-white sm:max-w-md">
          <DialogHeader>
            <div className="w-11 h-11 rounded-xl bg-[#339af0]/10 border border-[#339af0]/25 flex items-center justify-center mb-3">
              <RefreshCw className="w-5 h-5 text-[#339af0]" />
            </div>
            <DialogTitle className="text-white font-heading">Regenerate this playbook?</DialogTitle>
            <DialogDescription className="text-[#9CA3AF] leading-relaxed">
              This will re-run the full agent pipeline (research → contacts → writing → review) for{' '}
              <span className="font-semibold text-white">{targetCompany}</span>.
              The existing playbook content will be replaced.
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">{error}</p>
          )}
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" onClick={() => setRegenOpen(false)} disabled={busy} className="border-[#374151] text-white hover:bg-white/[0.04]">Cancel</Button>
            <Button onClick={handleRegenerate} disabled={busy} className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-medium gap-2">
              {busy ? <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating…</> : <><RefreshCw className="w-4 h-4" /> Yes, regenerate</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
