import { cn } from '@/lib/utils'

// Lightweight, dependency-free visualizations consistent with the app's
// hand-rolled aesthetic. All server-renderable (no client hooks).

interface TrendPoint {
  date: string
  value: number
}

// Vertical bar trend (e.g. signups/day, playbooks/day over the last N days).
export function TrendChart({
  data,
  color = '#f59e0b',
  label,
}: {
  data: TrendPoint[]
  color?: string
  label?: string
}) {
  const max = Math.max(1, ...data.map((d) => d.value))
  const total = data.reduce((s, d) => s + d.value, 0)

  return (
    <div>
      {label && (
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs text-[#a1a1aa]">{label}</span>
          <span className="text-xs font-medium text-white">{total} total</span>
        </div>
      )}
      <div className="flex items-end gap-[2px] h-24">
        {data.map((d) => (
          <div
            key={d.date}
            className="flex-1 rounded-t-sm transition-all hover:opacity-80 min-h-[2px]"
            style={{
              height: `${Math.max(2, (d.value / max) * 100)}%`,
              backgroundColor: d.value > 0 ? color : 'rgba(255,255,255,0.06)',
            }}
            title={`${d.date}: ${d.value}`}
          />
        ))}
      </div>
    </div>
  )
}

interface DistributionItem {
  label: string
  value: number
  color?: string
}

// Labeled horizontal bars for categorical distributions (plans, statuses).
export function DistributionBars({ items }: { items: DistributionItem[] }) {
  const max = Math.max(1, ...items.map((i) => i.value))
  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.label}>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-[#a1a1aa] capitalize">{item.label}</span>
            <span className="text-xs font-medium text-white">{item.value}</span>
          </div>
          <div className="h-2 bg-white/[0.06] rounded-full overflow-hidden">
            <div
              className={cn('h-full rounded-full', !item.color && 'bg-amber-500')}
              style={{
                width: `${(item.value / max) * 100}%`,
                backgroundColor: item.color,
              }}
            />
          </div>
        </div>
      ))}
    </div>
  )
}
