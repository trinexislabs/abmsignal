'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react'
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
  open: boolean
  onOpenChange: (open: boolean) => void
  // Called after the API confirms deletion. If omitted, we navigate to /dashboard.
  onDeleted?: (result: { creditRefunded: boolean }) => void
}

export function DeletePlaybookDialog({
  playbookId,
  productName,
  targetCompany,
  open,
  onOpenChange,
  onDeleted,
}: Props) {
  const router = useRouter()
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleDelete() {
    setError(null)
    setDeleting(true)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({} as Record<string, unknown>))
      if (!res.ok) {
        throw new Error((body as { error?: string }).error ?? `Delete failed (${res.status})`)
      }

      // Growth users get a cycle credit back for deleting a failed production —
      // reassure them right away that they weren't charged for it.
      const data = (body as { data?: { credit_refunded?: boolean; message?: string } }).data
      const creditRefunded = data?.credit_refunded === true
      if (creditRefunded) {
        toast.success('Credit refunded', {
          description:
            data?.message ??
            "We've added 1 credit back to your current cycle quota — you're not charged for failed productions.",
          duration: 7000,
        })
      } else {
        toast.success('Playbook deleted')
      }

      onOpenChange(false)
      if (onDeleted) {
        onDeleted({ creditRefunded })
      } else {
        router.push('/dashboard')
        router.refresh()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not delete playbook.')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-[#141419] border-red-500/20 text-white sm:max-w-md">
        <DialogHeader>
          <div className="w-11 h-11 rounded-xl bg-red-500/10 border border-red-500/25 flex items-center justify-center mb-3">
            <AlertTriangle className="w-5 h-5 text-red-400" />
          </div>
          <DialogTitle className="text-white font-heading">Delete this playbook?</DialogTitle>
          <DialogDescription className="text-[#a1a1aa] leading-relaxed">
            You&apos;re about to permanently delete the playbook for{' '}
            <span className="font-semibold text-white">{targetCompany}</span>
            {productName && (
              <>
                {' '}({productName})
              </>
            )}
            . This removes the product brief, target account info, all research events,
            contacts, sections, and sources from our system.
            <br />
            <br />
            <span className="text-red-400 font-semibold">This action cannot be undone.</span>
          </DialogDescription>
        </DialogHeader>

        {error && (
          <p className="text-xs text-red-400 bg-red-500/10 border border-red-500/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={deleting}
            className="border-white/10 text-white hover:bg-white/[0.04]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-500 hover:bg-red-500/90 text-white gap-2"
          >
            {deleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Deleting…
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                Yes, delete permanently
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
