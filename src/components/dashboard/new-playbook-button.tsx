'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Plus, ArrowRight, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface NewPlaybookButtonProps {
  size?: 'default' | 'lg'
  showArrow?: boolean
  className?: string
}

export function NewPlaybookButton({
  size = 'default',
  showArrow = false,
  className,
}: NewPlaybookButtonProps) {
  const router = useRouter()
  const [checking, setChecking] = useState(false)
  const [blockedReason, setBlockedReason] = useState<string | null>(null)

  const handleClick = async () => {
    if (checking) return
    setBlockedReason(null)
    setChecking(true)
    try {
      const res = await fetch('/api/playbooks/can-create')
      const data = (await res.json()) as { allowed: boolean; reason?: string }
      if (!data.allowed) {
        setBlockedReason(data.reason ?? 'Unable to start a new playbook right now.')
        return
      }
      router.push('/playbook/new/product')
    } catch {
      // Network error — just proceed; the form submit will surface the real block
      router.push('/playbook/new/product')
    } finally {
      setChecking(false)
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <Button
        onClick={handleClick}
        disabled={checking}
        size={size}
        className={cn('gap-2', className)}
      >
        {checking
          ? <Loader2 className={cn('animate-spin', size === 'lg' ? 'w-5 h-5' : 'w-4 h-4')} />
          : <Plus className={size === 'lg' ? 'w-5 h-5' : 'w-4 h-4'} />
        }
        {checking ? 'Checking…' : 'New Playbook'}
        {showArrow && !checking && <ArrowRight className="w-4 h-4" />}
      </Button>

      {blockedReason && (
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 max-w-sm">
          <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-300 leading-relaxed">
            {blockedReason} Please go back and try again.
          </p>
        </div>
      )}
    </div>
  )
}
