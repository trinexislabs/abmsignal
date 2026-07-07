interface FunnelStepView {
  key: string
  label: string
  users: number
  description: string
  tracked: boolean
}

// Vertical behavior funnel. Each bar is scaled to the first step (registered),
// with % of the base and step-to-step drop-off. Dependency-free and
// server-renderable, matching the DistributionBars aesthetic in charts.tsx.
export function FunnelSteps({ steps }: { steps: FunnelStepView[] }) {
  const base = Math.max(1, steps[0]?.users ?? 0)

  return (
    <div className="space-y-2">
      {steps.map((step, i) => {
        const pctOfBase = Math.round((step.users / base) * 100)
        const prev = steps[i - 1]
        // Step-to-step conversion vs. the previous step's population.
        const dropPct =
          prev && prev.users > 0 ? Math.round(((prev.users - step.users) / prev.users) * 100) : null

        return (
          <div key={step.key}>
            <div className="flex items-center justify-between mb-1 gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[10px] font-mono text-[#6B7280] w-4 flex-shrink-0">{i + 1}</span>
                <span className="text-xs font-medium text-white truncate">{step.label}</span>
                {step.tracked && (
                  <span
                    className="text-[9px] font-semibold text-[#2563EB] bg-[#2563EB]/10 border border-[#2563EB]/20 px-1.5 py-px rounded-full uppercase tracking-wide flex-shrink-0"
                    title="Relies on event tracking — only has data from the tracking deploy onward"
                  >
                    tracked
                  </span>
                )}
              </div>
              <div className="flex items-baseline gap-2 flex-shrink-0">
                <span className="text-sm font-semibold text-white tabular-nums">{step.users.toLocaleString()}</span>
                <span className="text-[11px] text-[#9CA3AF] tabular-nums w-9 text-right">{pctOfBase}%</span>
              </div>
            </div>

            <div className="h-6 bg-white/[0.04] rounded-md overflow-hidden">
              <div
                className="h-full rounded-md transition-all"
                style={{
                  width: `${Math.max(1.5, pctOfBase)}%`,
                  background: 'linear-gradient(90deg, #0B3D2E 0%, #10B981 100%)',
                }}
              />
            </div>

            {dropPct !== null && dropPct > 0 && (
              <div className="flex items-center gap-1.5 mt-1 mb-1 pl-6">
                <span className="text-[10px] text-[#EF4444]/80">↓ {dropPct}% drop-off</span>
                <span className="text-[10px] text-[#6B7280]">from previous step</span>
              </div>
            )}
            <p className="text-[10px] text-[#6B7280] pl-6 mb-1.5">{step.description}</p>
          </div>
        )
      })}
    </div>
  )
}
