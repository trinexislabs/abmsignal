import { Card } from '@/components/ui/card'
import { TrendChart, DistributionBars } from '@/components/admin/charts'
import { StatCard } from '@/components/admin/stat-card'
import { TrendingUp, Users, FileText, CheckCircle2 } from 'lucide-react'
import { getPlatformStats, getUsageTimeseries } from '@/server/admin/admin-repository'

const PLAN_COLORS: Record<string, string> = {
  free: '#a1a1aa',
  one_off: '#339af0',
  growth: '#f59e0b',
}

export default async function AdminAnalyticsPage() {
  const [stats, timeseries] = await Promise.all([
    getPlatformStats(),
    getUsageTimeseries(30),
  ])

  const planItems = Object.entries(stats.usersByPlan)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: PLAN_COLORS[label] ?? '#a1a1aa' }))

  const outcomeItems = [
    { label: 'Completed', value: stats.completed, color: '#22c55e' },
    { label: 'Failed', value: stats.failed, color: '#ef4444' },
    { label: 'In progress', value: stats.inProgress, color: '#339af0' },
  ]

  const avgSignups = (timeseries.reduce((s, d) => s + d.signups, 0) / Math.max(1, timeseries.length)).toFixed(1)
  const avgPlaybooks = (timeseries.reduce((s, d) => s + d.playbooks, 0) / Math.max(1, timeseries.length)).toFixed(1)
  const conversionRate = stats.totalUsers
    ? Math.round((((stats.usersByPlan.one_off ?? 0) + (stats.usersByPlan.growth ?? 0)) / stats.totalUsers) * 100)
    : 0

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Analytics</h1>
        <p className="text-sm text-[#a1a1aa] mt-0.5">Usage trends and conversion across the platform.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Avg signups / day" value={avgSignups} icon={Users} accent="amber" hint="last 30 days" />
        <StatCard label="Avg playbooks / day" value={avgPlaybooks} icon={FileText} accent="blue" hint="last 30 days" />
        <StatCard label="Paid conversion" value={`${conversionRate}%`} icon={TrendingUp} accent="green" hint="of all users on a paid plan" />
        <StatCard label="Success rate" value={`${stats.successRate}%`} icon={CheckCircle2} accent={stats.successRate >= 80 ? 'green' : 'amber'} hint="of terminal playbooks" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#141419] border-white/[0.06] p-5">
          <TrendChart label="Signups over time (30d)" data={timeseries.map((d) => ({ date: d.date, value: d.signups }))} color="#f59e0b" />
        </Card>
        <Card className="bg-[#141419] border-white/[0.06] p-5">
          <TrendChart label="Playbooks created over time (30d)" data={timeseries.map((d) => ({ date: d.date, value: d.playbooks }))} color="#339af0" />
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#141419] border-white/[0.06] p-5">
          <h2 className="font-heading text-sm font-semibold text-white mb-4">Plan Mix</h2>
          {planItems.length ? <DistributionBars items={planItems} /> : <p className="text-xs text-[#a1a1aa]">No users yet.</p>}
        </Card>
        <Card className="bg-[#141419] border-white/[0.06] p-5">
          <h2 className="font-heading text-sm font-semibold text-white mb-4">Playbook Outcomes</h2>
          <DistributionBars items={outcomeItems} />
        </Card>
      </div>
    </div>
  )
}
