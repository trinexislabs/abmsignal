import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { getUserInitials } from '@/lib/utils'
import { SearchInput, FilterSelect, Pagination } from '@/components/admin/table-controls'
import { listUsers } from '@/server/admin/admin-repository'

const PLAN_OPTIONS = [
  { value: 'all', label: 'All plans' },
  { value: 'free', label: 'Free' },
  { value: 'one_off', label: 'One Off' },
  { value: 'growth', label: 'Growth' },
]

const PLAN_BADGE: Record<string, string> = {
  free: 'bg-white/10 text-[#a1a1aa] border-white/15',
  one_off: 'bg-[#339af0]/15 text-[#339af0] border-[#339af0]/25',
  growth: 'bg-amber-500/15 text-amber-400 border-amber-500/25',
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; plan?: string; page?: string }>
}) {
  const params = await searchParams
  const result = await listUsers({
    search: params.search,
    plan: params.plan,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Users</h1>
        <p className="text-sm text-[#a1a1aa] mt-0.5">All customers, their plan, usage, and credits.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search name or email…" />
        <FilterSelect param="plan" options={PLAN_OPTIONS} />
      </div>

      <Card className="bg-[#141419] border-white/[0.06] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_110px_110px_90px_90px_120px] gap-4 px-5 py-3 border-b border-white/[0.06] text-[11px] font-medium text-[#a1a1aa] uppercase tracking-wider">
          <span>User</span>
          <span>Plan</span>
          <span>Status</span>
          <span className="text-right">Playbooks</span>
          <span className="text-right">Credits</span>
          <span className="text-right">Last active</span>
        </div>

        {result.rows.length === 0 ? (
          <p className="text-sm text-[#a1a1aa] px-5 py-12 text-center">No users match your filters.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {result.rows.map((u) => (
              <Link
                key={u.id}
                href={`/admin/users/${u.id}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_110px_110px_90px_90px_120px] gap-2 md:gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors md:items-center"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="w-8 h-8 flex-shrink-0">
                    {u.image && <AvatarImage src={u.image} alt={u.name ?? ''} />}
                    <AvatarFallback className="bg-[#1e3a5f] text-[#339af0] font-bold text-[10px]">
                      {getUserInitials(u.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white truncate flex items-center gap-1.5">
                      {u.name ?? '—'}
                      {u.role === 'admin' && (
                        <span className="text-[9px] font-bold text-amber-400 bg-amber-500/15 border border-amber-500/25 rounded px-1 uppercase">Admin</span>
                      )}
                    </p>
                    <p className="text-[11px] text-[#a1a1aa] truncate">{u.email}</p>
                  </div>
                </div>
                <div className="md:block">
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border capitalize ${PLAN_BADGE[u.plan] ?? PLAN_BADGE.free}`}>
                    {u.plan.replace(/_/g, ' ')}
                  </span>
                </div>
                <div className="text-xs text-[#a1a1aa] capitalize">{u.status}</div>
                <div className="text-sm text-white md:text-right">{u.playbookCount}</div>
                <div className="text-sm text-white md:text-right">{u.credits}</div>
                <div className="text-[11px] text-[#a1a1aa] md:text-right">
                  {u.lastActivity ? formatDistanceToNow(u.lastActivity, { addSuffix: true }) : '—'}
                </div>
              </Link>
            ))}
          </div>
        )}
      </Card>

      <Pagination page={result.page} totalPages={result.totalPages} total={result.total} />
    </div>
  )
}
