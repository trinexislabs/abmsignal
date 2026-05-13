'use client'

import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import {
  FileText,
  Microscope,
  Users,
  Clock,
  Plus,
  ArrowRight,
  Eye,
  Play,
  PenLine,
  TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import type { PlaybookStatus } from '@/types'

// ──────────────────────────────────────────────────────────
// Static mock data for the dashboard
// ──────────────────────────────────────────────────────────

const STATS = [
  {
    label: 'Total Playbooks',
    value: '12',
    icon: FileText,
    change: '+3 this month',
    positive: true,
  },
  {
    label: 'Active Research',
    value: '2',
    icon: Microscope,
    change: '1 nearly done',
    positive: true,
  },
  {
    label: 'Contacts Verified',
    value: '47',
    icon: Users,
    change: 'Across all playbooks',
    positive: true,
  },
  {
    label: 'Avg Generation Time',
    value: '47 min',
    icon: Clock,
    change: '−8 min vs last week',
    positive: true,
  },
]

interface RecentPlaybook {
  id: string
  company: string
  product: string
  status: PlaybookStatus
  createdAt: Date
}

const RECENT_PLAYBOOKS: RecentPlaybook[] = [
  {
    id: 'pb_belfius_fintech_2025',
    company: 'Belfius Bank',
    product: 'FinFlow AI',
    status: 'complete',
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'pb_ing_saas_2025',
    company: 'ING Group',
    product: 'FinFlow AI',
    status: 'researching',
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000),
  },
  {
    id: 'pb_kbc_2025',
    company: 'KBC Bank',
    product: 'FinFlow AI',
    status: 'contact_review',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000),
  },
  {
    id: 'pb_soc_gen_2025',
    company: 'Société Générale',
    product: 'FinFlow AI',
    status: 'draft',
    createdAt: new Date(Date.now() - 1 * 60 * 60 * 1000),
  },
]

function getActionButton(pb: RecentPlaybook) {
  switch (pb.status) {
    case 'complete':
      return (
        <Link href={`/playbook/${pb.id}`}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-3 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 gap-1.5"
          >
            <Eye className="w-3 h-3" />
            View
          </Button>
        </Link>
      )
    case 'draft':
      return (
        <Link href={`/playbook/new/product`}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-3 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20 gap-1.5"
          >
            <PenLine className="w-3 h-3" />
            Continue
          </Button>
        </Link>
      )
    default:
      return (
        <Link href={`/playbook/${pb.id}`}>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-3 border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 hover:border-[#339af0]/50 gap-1.5"
          >
            <Play className="w-3 h-3" />
            Resume
          </Button>
        </Link>
      )
  }
}

// ──────────────────────────────────────────────────────────
// Page Component
// ──────────────────────────────────────────────────────────

export default function DashboardPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-sm text-[#a1a1aa] mt-0.5">
            Welcome back, Alex. Your pipeline is looking strong.
          </p>
        </div>
        <Link href="/playbook/new/product">
          <Button className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-medium gap-2 hidden sm:flex">
            <Plus className="w-4 h-4" />
            New Playbook
          </Button>
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {STATS.map((stat) => {
          const Icon = stat.icon
          return (
            <Card
              key={stat.label}
              className="bg-[#141419] border-white/[0.06] p-5 hover:border-white/10 transition-colors group"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-[#1e3a5f]/60 border border-[#339af0]/15 flex items-center justify-center group-hover:border-[#339af0]/30 transition-colors">
                  <Icon className="w-4 h-4 text-[#339af0]" />
                </div>
                {stat.positive && (
                  <TrendingUp className="w-3.5 h-3.5 text-green-400 opacity-60" />
                )}
              </div>
              <p className="text-2xl font-bold text-white font-heading">{stat.value}</p>
              <p className="text-xs text-[#a1a1aa] mt-0.5">{stat.label}</p>
              <p className="text-[11px] text-green-400/80 mt-1.5">{stat.change}</p>
            </Card>
          )
        })}
      </div>

      {/* Quick Action Hero */}
      <Card className="bg-gradient-to-br from-[#1e3a5f]/60 via-[#141419] to-[#141419] border-[#339af0]/20 p-6 sm:p-8 relative overflow-hidden">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#339af0]/5 rounded-full blur-3xl pointer-events-none" />

        <div className="relative flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[11px] font-semibold text-[#339af0] bg-[#339af0]/10 border border-[#339af0]/20 px-2 py-0.5 rounded-full uppercase tracking-wider">
                AI-Powered
              </span>
            </div>
            <h2 className="font-heading text-xl font-bold text-white mb-1.5">
              Generate a new ABM playbook
            </h2>
            <p className="text-sm text-[#a1a1aa] max-w-md">
              Enter your product brief and target account — our AI agent swarm will build a
              complete, hyper-personalized playbook in 30–120 minutes.
            </p>
            <div className="flex items-center gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                Verified contacts
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-[#339af0]" />
                12 playbook sections
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#a1a1aa]">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />
                Cultural adaptation
              </div>
            </div>
          </div>
          <div className="flex-shrink-0">
            <Link href="/playbook/new/product">
              <Button
                size="lg"
                className="bg-[#339af0] hover:bg-[#339af0]/90 text-white font-semibold gap-2 px-6 shadow-[0_0_20px_rgba(51,154,240,0.3)] hover:shadow-[0_0_30px_rgba(51,154,240,0.4)] transition-shadow"
              >
                <Plus className="w-5 h-5" />
                New Playbook
                <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </div>
      </Card>

      {/* Recent Playbooks */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading text-lg font-semibold text-white">Recent Playbooks</h2>
          <Link
            href="/dashboard/playbooks"
            className="text-xs text-[#339af0] hover:text-[#339af0]/80 transition-colors flex items-center gap-1"
          >
            View all
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <Card className="bg-[#141419] border-white/[0.06] overflow-hidden">
          {/* Table header */}
          <div className="grid grid-cols-[1fr_120px_140px_100px] gap-4 px-5 py-3 border-b border-white/[0.04] text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider hidden sm:grid">
            <span>Account / Product</span>
            <span>Status</span>
            <span>Created</span>
            <span className="text-right">Action</span>
          </div>

          <div className="divide-y divide-white/[0.04]">
            {RECENT_PLAYBOOKS.map((pb) => (
              <div
                key={pb.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_120px_140px_100px] gap-2 sm:gap-4 px-5 py-4 hover:bg-white/[0.02] transition-colors items-center group"
              >
                {/* Company / Product */}
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#1e3a5f]/50 border border-[#339af0]/10 flex items-center justify-center flex-shrink-0 group-hover:border-[#339af0]/25 transition-colors">
                    <FileText className="w-3.5 h-3.5 text-[#339af0]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{pb.company}</p>
                    <p className="text-[11px] text-[#a1a1aa]">{pb.product}</p>
                  </div>
                </div>

                {/* Status */}
                <div className="sm:block flex items-center gap-2">
                  <span className="text-[11px] text-[#a1a1aa] sm:hidden">Status: </span>
                  <StatusBadge status={pb.status} />
                </div>

                {/* Created */}
                <div>
                  <p className="text-sm text-[#a1a1aa]">
                    {formatDistanceToNow(pb.createdAt, { addSuffix: true })}
                  </p>
                </div>

                {/* Action */}
                <div className="sm:text-right">
                  {getActionButton(pb)}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  )
}
