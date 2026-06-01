import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { SearchInput, FilterSelect, Pagination } from '@/components/admin/table-controls'
import { listPlaybooks } from '@/server/admin/admin-repository'
import type { PlaybookStatus } from '@/types'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'complete', label: 'Complete' },
  { value: 'failed_any', label: 'Failed (any)' },
  { value: 'error', label: 'Error' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'failed', label: 'Failed' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'draft', label: 'Draft' },
]

export default async function AdminPlaybooksPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; status?: string; page?: string }>
}) {
  const params = await searchParams
  const result = await listPlaybooks({
    search: params.search,
    status: params.status,
    page: params.page ? Number(params.page) : 1,
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading text-2xl font-bold text-white">Playbooks</h1>
        <p className="text-sm text-[#9CA3AF] mt-0.5">Every playbook across all customers, with run status.</p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <SearchInput placeholder="Search product or company…" />
        <FilterSelect param="status" options={STATUS_OPTIONS} />
      </div>

      <Card className="bg-[#111827] border-[#374151] overflow-hidden">
        <div className="hidden md:grid grid-cols-[1fr_180px_130px_130px] gap-4 px-5 py-3 border-b border-[#374151] text-[11px] font-medium text-[#9CA3AF] uppercase tracking-wider">
          <span>Playbook</span>
          <span>Owner</span>
          <span>Status</span>
          <span className="text-right">Updated</span>
        </div>

        {result.rows.length === 0 ? (
          <p className="text-sm text-[#9CA3AF] px-5 py-12 text-center">No playbooks match your filters.</p>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {result.rows.map((p) => (
              <Link
                key={p.id}
                href={`/admin/playbooks/${p.id}`}
                className="grid grid-cols-1 md:grid-cols-[1fr_180px_130px_130px] gap-2 md:gap-4 px-5 py-3.5 hover:bg-white/[0.02] transition-colors md:items-center"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-white truncate">{p.targetCompany}</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">
                    {p.productName}
                    {p.failedReason ? <span className="text-red-400/80"> · {p.failedReason}</span> : ''}
                  </p>
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-white truncate">{p.ownerName ?? '—'}</p>
                  <p className="text-[11px] text-[#9CA3AF] truncate">{p.ownerEmail ?? 'no owner'}</p>
                </div>
                <div><StatusBadge status={p.status as PlaybookStatus} /></div>
                <div className="text-[11px] text-[#9CA3AF] md:text-right">
                  {formatDistanceToNow(p.updatedAt, { addSuffix: true })}
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
