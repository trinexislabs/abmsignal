import { Card } from '@/components/ui/card'
import { cn } from '@/lib/utils'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  label: string
  value: string | number
  icon: LucideIcon
  hint?: string
  accent?: 'amber' | 'blue' | 'green' | 'red' | 'purple'
}

const ACCENTS = {
  amber: 'bg-amber-500/10 border-amber-500/20 text-amber-400',
  blue: 'bg-[#0B3D2E]/60 border-[#10B981]/20 text-[#10B981]',
  green: 'bg-green-500/10 border-green-500/20 text-green-400',
  red: 'bg-red-500/10 border-red-500/20 text-red-400',
  purple: 'bg-purple-500/10 border-purple-500/20 text-purple-400',
} as const

export function StatCard({ label, value, icon: Icon, hint, accent = 'amber' }: StatCardProps) {
  return (
    <Card className="bg-[#111827] border-[#374151] p-5">
      <div className="flex items-start justify-between mb-3">
        <div className={cn('w-9 h-9 rounded-lg border flex items-center justify-center', ACCENTS[accent])}>
          <Icon className="w-4 h-4" />
        </div>
      </div>
      <p className="text-2xl font-bold text-white font-heading">{value}</p>
      <p className="text-xs text-[#9CA3AF] mt-0.5">{label}</p>
      {hint && <p className="text-[10px] text-[#9CA3AF]/70 mt-0.5">{hint}</p>}
    </Card>
  )
}
