import { Badge } from '@/components/ui/badge'
import type { PlaybookStatus } from '@/types'
import { cn } from '@/lib/utils'

const STATUS_CONFIG: Record<PlaybookStatus, { label: string; className: string }> = {
  draft: { label: 'Draft', className: 'bg-white/10 text-white/60 border-white/20' },
  researching: { label: 'Researching', className: 'bg-blue-500/20 text-blue-400 border-blue-500/30 animate-pulse' },
  contact_review: { label: 'Contact Review', className: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30' },
  writing: { label: 'Writing', className: 'bg-purple-500/20 text-purple-400 border-purple-500/30 animate-pulse' },
  reviewing: { label: 'Reviewing', className: 'bg-orange-500/20 text-orange-400 border-orange-500/30 animate-pulse' },
  complete: { label: 'Complete', className: 'bg-green-500/20 text-green-400 border-green-500/30' },
  error: { label: 'Error', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
  rejected: { label: 'Rejected', className: 'bg-red-500/20 text-red-400 border-red-500/30' },
}

export function PlaybookStatusBadge({ status, className }: { status: PlaybookStatus; className?: string }) {
  const config = STATUS_CONFIG[status]
  return (
    <Badge
      variant="outline"
      className={cn('text-[11px] font-medium px-2 py-0.5', config.className, className)}
    >
      {config.label}
    </Badge>
  )
}
