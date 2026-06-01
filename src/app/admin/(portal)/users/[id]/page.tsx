import Link from 'next/link'
import { notFound } from 'next/navigation'
import { formatDistanceToNow, format } from 'date-fns'
import { ChevronLeft, Mail, Calendar, CreditCard, FileText, Shield } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { StatusBadge } from '@/components/ui/status-badge'
import { getUserInitials } from '@/lib/utils'
import { getUserDetail } from '@/server/admin/admin-repository'
import type { PlaybookStatus } from '@/types'

export default async function AdminUserDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const user = await getUserDetail(id)
  if (!user) notFound()

  const sub = user.subscription
  const providers = user.accounts.map((a) => a.provider)
  const authMethods = [user.password ? 'password' : null, ...providers].filter(Boolean) as string[]

  return (
    <div className="space-y-6">
      <Link href="/admin/users" className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to users
      </Link>

      {/* Profile header */}
      <div className="flex items-start gap-4">
        <Avatar className="w-14 h-14">
          {user.image && <AvatarImage src={user.image} alt={user.name ?? ''} />}
          <AvatarFallback className="bg-[#0B3D2E] text-[#10B981] font-bold">
            {getUserInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="font-heading text-2xl font-bold text-white flex items-center gap-2">
            {user.name ?? 'Unnamed user'}
            {user.role === 'admin' && (
              <span className="text-[10px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded px-1.5 py-0.5 uppercase flex items-center gap-1">
                <Shield className="w-3 h-3" /> Admin
              </span>
            )}
          </h1>
          <div className="flex flex-wrap items-center gap-4 mt-1.5 text-xs text-[#9CA3AF]">
            <span className="flex items-center gap-1.5"><Mail className="w-3.5 h-3.5" />{user.email}</span>
            <span className="flex items-center gap-1.5"><Calendar className="w-3.5 h-3.5" />Joined {format(user.createdAt, 'MMM d, yyyy')}</span>
            {authMethods.length > 0 && <span className="capitalize">via {authMethods.join(', ')}</span>}
          </div>
        </div>
      </div>

      {/* Subscription + credits summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="bg-[#111827] border-[#374151] p-5">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2"><CreditCard className="w-3.5 h-3.5" />Plan</div>
          <p className="text-lg font-bold text-white capitalize">{sub?.plan?.replace(/_/g, ' ') ?? 'free'}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5 capitalize">{sub?.status ?? 'active'}</p>
          {sub?.currentPeriodEnd && (
            <p className="text-[11px] text-[#9CA3AF] mt-1">Renews {format(sub.currentPeriodEnd, 'MMM d, yyyy')}</p>
          )}
        </Card>
        <Card className="bg-[#111827] border-[#374151] p-5">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2"><CreditCard className="w-3.5 h-3.5" />Credit balance</div>
          <p className="text-lg font-bold text-white">{user.creditBalance}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">{user.credits.length} ledger entries</p>
        </Card>
        <Card className="bg-[#111827] border-[#374151] p-5">
          <div className="flex items-center gap-2 text-xs text-[#9CA3AF] mb-2"><FileText className="w-3.5 h-3.5" />Playbooks</div>
          <p className="text-lg font-bold text-white">{user.playbooks.length}</p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {user.playbooks.filter((p) => p.status === 'complete').length} complete
          </p>
        </Card>
      </div>

      {/* Playbooks */}
      <div>
        <h2 className="font-heading text-sm font-semibold text-white mb-3">Playbooks</h2>
        <Card className="bg-[#111827] border-[#374151] overflow-hidden">
          {user.playbooks.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] px-5 py-8 text-center">No playbooks yet.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {user.playbooks.map((p) => (
                <Link key={p.id} href={`/admin/playbooks/${p.id}`} className="flex items-center justify-between gap-3 px-5 py-3 hover:bg-white/[0.02] transition-colors">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate">{p.targetCompany}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate">
                      {p.productName} · {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
                      {p.failedReason ? ` · ${p.failedReason}` : ''}
                    </p>
                  </div>
                  <StatusBadge status={p.status as PlaybookStatus} />
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* Credit ledger */}
      <div>
        <h2 className="font-heading text-sm font-semibold text-white mb-3">Credit Ledger</h2>
        <Card className="bg-[#111827] border-[#374151] overflow-hidden">
          {user.credits.length === 0 ? (
            <p className="text-sm text-[#9CA3AF] px-5 py-8 text-center">No credit activity.</p>
          ) : (
            <div className="divide-y divide-white/[0.04]">
              {user.credits.map((c) => (
                <div key={c.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <div className="min-w-0">
                    <p className="text-xs text-white capitalize">{c.reason.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-[#9CA3AF]">{format(c.createdAt, 'MMM d, yyyy · h:mm a')}</p>
                  </div>
                  <span className={`text-sm font-semibold tabular-nums ${c.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {c.amount >= 0 ? '+' : ''}{c.amount}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
