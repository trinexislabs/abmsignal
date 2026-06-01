import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Users, DollarSign, FileText, CheckCircle2, AlertTriangle, Activity, CreditCard } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { StatCard } from '@/components/admin/stat-card'
import { TrendChart, DistributionBars } from '@/components/admin/charts'
import {
  getPlatformStats,
  getRevenueEstimate,
  getUsageTimeseries,
  getRecentFailedPlaybooks,
  getRecentSignups,
} from '@/server/admin/admin-repository'
import type { PlaybookStatus } from '@/types'

const PLAN_COLORS: Record<string, string> = {
  free: '#9CA3AF',
  one_off: '#10B981',
  growth: '#f59e0b',
}

const STATUS_COLORS: Record<string, string> = {
  complete: '#10B981',
  draft: '#9CA3AF',
  queued: '#9CA3AF',
  pending_queue: '#818cf8',
  researching: '#10B981',
  contact_review: '#f59e0b',
  writing: '#a78bfa',
  reviewing: '#fb923c',
  error: '#ef4444',
  rejected: '#ef4444',
  failed: '#ef4444',
  cancelled: '#ef4444',
}

export default async function AdminOverviewPage() {
  const [stats, revenue, timeseries, failed, signups] = await Promise.all([
    getPlatformStats(),
    getRevenueEstimate(),
    getUsageTimeseries(30),
    getRecentFailedPlaybooks(6),
    getRecentSignups(6),
  ])

  const planItems = Object.entries(stats.usersByPlan)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label, value, color: PLAN_COLORS[label] ?? '#9CA3AF' }))

  const statusItems = Object.entries(stats.playbooksByStatus)
    .sort((a, b) => b[1] - a[1])
    .map(([label, value]) => ({ label: label.replace(/_/g, ' '), value, color: STATUS_COLORS[label] ?? '#9CA3AF' }))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Overview</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Platform-wide health, usage, and revenue.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Users" value={stats.totalUsers} icon={Users} accent="amber" hint={`+${stats.newUsers30d} in last 30d`} />
        <StatCard label="Est. MRR" value={`$${revenue.mrr.toLocaleString()}`} icon={DollarSign} accent="green" hint={`${revenue.growthSubscribers} growth subs`} />
        <StatCard label="Total Playbooks" value={stats.totalPlaybooks} icon={FileText} accent="blue" hint={`${stats.inProgress} in progress`} />
        <StatCard label="Success Rate" value={`${stats.successRate}%`} icon={CheckCircle2} accent={stats.successRate >= 80 ? 'green' : stats.successRate >= 50 ? 'amber' : 'red'} hint={`${stats.completed} ok · ${stats.failed} failed`} />
      </div>

      {/* Trends */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border-[#374151] p-5">
          <TrendChart label="Signups (30d)" data={timeseries.map((d) => ({ date: d.date, value: d.signups }))} color="#f59e0b" />
        </Card>
        <Card className="bg-[#111827] border-[#374151] p-5">
          <TrendChart label="Playbooks created (30d)" data={timeseries.map((d) => ({ date: d.date, value: d.playbooks }))} color="#10B981" />
        </Card>
      </div>

      {/* Distributions + revenue */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="bg-[#111827] border-[#374151] p-5">
          <h2 className="font-heading text-sm font-semibold text-white mb-4">Users by Plan</h2>
          {planItems.length ? <DistributionBars items={planItems} /> : <p className="text-xs text-[#9CA3AF]">No users yet.</p>}
        </Card>
        <Card className="bg-[#111827] border-[#374151] p-5">
          <h2 className="font-heading text-sm font-semibold text-white mb-4">Playbooks by Status</h2>
          {statusItems.length ? <DistributionBars items={statusItems} /> : <p className="text-xs text-[#9CA3AF]">No playbooks yet.</p>}
        </Card>
        <Card className="bg-[#111827] border-[#374151] p-5">
          <h2 className="font-heading text-sm font-semibold text-white mb-4">Revenue & Usage</h2>
          <div className="space-y-3 text-sm">
            <Row icon={DollarSign} label="Monthly recurring" value={`$${revenue.mrr.toLocaleString()}`} />
            <Row icon={CreditCard} label="One-off revenue" value={`$${revenue.oneOffRevenue.toLocaleString()}`} />
            <Row icon={DollarSign} label="Total to date" value={`$${revenue.totalToDate.toLocaleString()}`} />
            <div className="h-px bg-white/[0.06] my-1" />
            <Row icon={Activity} label="Credits consumed" value={stats.creditsConsumed} />
            <Row icon={CheckCircle2} label="Verified contacts" value={stats.confirmedContacts} />
          </div>
        </Card>
      </div>

      {/* Recent failures + signups */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="bg-[#111827] border-[#374151] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#374151]">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <h2 className="font-heading text-sm font-semibold text-white">Recent Failed Playbooks</h2>
          </div>
          {failed.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] px-5 py-8 text-center">No failures. 🎉</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {failed.map((p) => (
                <Link key={p.id} href={`/admin/playbooks/${p.id}`} className="block px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{p.targetCompany}</p>
                      <p className="text-[11px] text-[#9CA3AF] truncate">
                        {p.user?.email ?? 'unknown'} · {p.failedReason ?? 'no reason recorded'}
                      </p>
                    </div>
                    <StatusBadge status={p.status as PlaybookStatus} />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card className="bg-[#111827] border-[#374151] overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#374151]">
            <Users className="w-4 h-4 text-amber-400" />
            <h2 className="font-heading text-sm font-semibold text-white">Recent Signups</h2>
          </div>
          {signups.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] px-5 py-8 text-center">No users yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {signups.map((u) => (
                <Link key={u.id} href={`/admin/users/${u.id}`} className="block px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-white truncate">{u.name ?? u.email}</p>
                      <p className="text-[11px] text-[#9CA3AF] truncate">{u.email}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="text-[11px] font-medium text-amber-400 capitalize">{u.subscription?.plan ?? 'free'}</p>
                      <p className="text-[10px] text-[#9CA3AF]">{formatDistanceToNow(u.createdAt, { addSuffix: true })}</p>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}

function Row({ icon: Icon, label, value }: { icon: typeof DollarSign; label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2 text-[#9CA3AF]">
        <Icon className="w-3.5 h-3.5" />
        {label}
      </span>
      <span className="font-medium text-white">{value}</span>
    </div>
  )
}
