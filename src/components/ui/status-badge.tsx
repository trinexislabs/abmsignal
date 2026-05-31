'use client'

import { Badge } from '@/components/ui/badge'
import type { PlaybookStatus } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<PlaybookStatus, { label: string; className: string; dot: string }> = {
  draft: {
    label: 'Draft',
    className: 'bg-white/10 text-white/60 border-white/20',
    dot: 'bg-white/40',
  },
  researching: {
    label: 'Researching',
    className: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    dot: 'bg-blue-400 animate-pulse',
  },
  contact_review: {
    label: 'Contact Review',
    className: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    dot: 'bg-amber-400',
  },
  writing: {
    label: 'Writing',
    className: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    dot: 'bg-purple-400 animate-pulse',
  },
  reviewing: {
    label: 'Reviewing',
    className: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
    dot: 'bg-orange-400 animate-pulse',
  },
  complete: {
    label: 'Complete',
    className: 'bg-green-500/20 text-green-400 border-green-500/30',
    dot: 'bg-green-400',
  },
  error: {
    label: 'Error',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
  rejected: {
    label: 'Rejected',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
  queued: {
    label: 'Queued',
    className: 'bg-white/10 text-white/60 border-white/20',
    dot: 'bg-white/40 animate-pulse',
  },
  pending_queue: {
    label: 'In Queue',
    className: 'bg-indigo-500/15 text-indigo-400 border-indigo-500/25',
    dot: 'bg-indigo-400',
  },
  failed: {
    label: 'Failed',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
  cancelled: {
    label: 'Cancelled',
    className: 'bg-red-500/20 text-red-400 border-red-500/30',
    dot: 'bg-red-400',
  },
}

interface StatusBadgeProps {
  status: PlaybookStatus
  className?: string
  showDot?: boolean
}

export function StatusBadge({ status, className, showDot = true }: StatusBadgeProps) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn(
        'inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5',
        config.className,
        className
      )}
    >
      {showDot && (
        <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', config.dot)} />
      )}
      {config.label}
    </Badge>
  )
}
