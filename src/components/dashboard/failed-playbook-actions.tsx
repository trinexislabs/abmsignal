'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefreshCw, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { DeletePlaybookDialog } from '@/components/playbook/delete-playbook-dialog'

interface Props {
  playbookId: string
  productName: string
  targetCompany: string
}

// Inline actions for a failed/errored/cancelled playbook row in the dashboard's
// recent list. Retry kicks a fresh run on the same brief + target account; delete
// opens a confirmation dialog before wiping the playbook.
export function FailedPlaybookActions({ playbookId, productName, targetCompany }: Props) {
  const router = useRouter()
  const [retrying, setRetrying] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  async function handleRetry() {
    setRetrying(true)
    try {
      const res = await fetch(`/api/playbooks/${playbookId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: '{}',
      })
      if (!res.ok) throw new Error(`Retry failed (${res.status})`)
      router.push(`/playbook/${playbookId}/processing`)
    } catch (err) {
      console.error('[retry] failed:', err)
      setRetrying(false)
    }
  }

  return (
    <>
      <div className="flex items-center gap-1.5 justify-end">
        <Button
          size="sm"
          variant="outline"
          onClick={handleRetry}
          disabled={retrying}
          className="h-7 text-xs px-2.5 border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 gap-1.5"
        >
          {retrying ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <RefreshCw className="w-3 h-3" />
          )}
          Retry
        </Button>
        <Button
          size="sm"
          variant="outline"
          onClick={() => setDeleteOpen(true)}
          disabled={retrying}
          className="h-7 text-xs px-2.5 border-red-500/25 text-red-400 hover:bg-red-500/10 hover:border-red-500/50 hover:text-red-400 gap-1.5"
        >
          <Trash2 className="w-3 h-3" />
          Delete
        </Button>
      </div>

      <DeletePlaybookDialog
        playbookId={playbookId}
        productName={productName}
        targetCompany={targetCompany}
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => router.refresh()}
      />
    </>
  )
}
