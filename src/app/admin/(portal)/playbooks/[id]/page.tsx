import Link from 'next/link'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { marked } from 'marked'
import { ChevronLeft, User, ExternalLink, Mail, AlertTriangle } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { StatusBadge } from '@/components/ui/status-badge'
import { getPlaybookDetail } from '@/server/admin/admin-repository'
import type { PlaybookStatus } from '@/types'

marked.setOptions({ gfm: true, breaks: false })

const RUN_STATUS_COLORS: Record<string, string> = {
  succeeded: 'text-green-400 bg-green-500/10 border-green-500/25',
  running: 'text-blue-400 bg-blue-500/10 border-blue-500/25',
  queued: 'text-[#9CA3AF] bg-white/5 border-white/15',
  failed: 'text-red-400 bg-red-500/10 border-red-500/25',
  cancelled: 'text-red-400 bg-red-500/10 border-red-500/25',
}

const CONTACT_STATUS_COLORS: Record<string, string> = {
  confirmed: 'text-green-400 bg-green-500/10 border-green-500/25',
  pending: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  needs_review: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  removed: 'text-red-400 bg-red-500/10 border-red-500/25',
}

export default async function AdminPlaybookDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const pb = await getPlaybookDetail(id)
  if (!pb) notFound()

  return (
    <div className="space-y-6">
      <Link href="/admin/playbooks" className="inline-flex items-center gap-1.5 text-xs text-[#9CA3AF] hover:text-white">
        <ChevronLeft className="w-3.5 h-3.5" /> Back to playbooks
      </Link>

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-heading text-2xl font-bold text-white">
            {pb.productName} → {pb.targetCompany}
          </h1>
          <div className="flex flex-wrap items-center gap-3 mt-1.5 text-xs text-[#9CA3AF]">
            {pb.user && (
              <Link href={`/admin/users/${pb.user.id}`} className="flex items-center gap-1.5 hover:text-white">
                <User className="w-3.5 h-3.5" />{pb.user.email}
              </Link>
            )}
            <span>{pb.industry} · {pb.geography}</span>
            <span>Created {format(pb.createdAt, 'MMM d, yyyy · h:mm a')}</span>
          </div>
        </div>
        <StatusBadge status={pb.status as PlaybookStatus} />
      </div>

      {/* Failure banner */}
      {pb.failedReason && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20">
          <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-red-400">Failure reason</p>
            <p className="text-sm text-[#9CA3AF] mt-0.5">{pb.failedReason}</p>
          </div>
        </div>
      )}

      {/* Metadata grid */}
      <Card className="bg-[#111827] border-[#374151] p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
          <Meta label="Progress" value={`${pb.progressPct}%`} />
          <Meta label="Priority" value={pb.priorityTier} />
          <Meta label="Completed" value={pb.completedAt ? format(pb.completedAt, 'MMM d, h:mm a') : '—'} />
          <Meta label="OpenClaw session" value={pb.openclawSessionId ?? '—'} mono />
          {pb.productUrl && <Meta label="Product URL" value={pb.productUrl} mono />}
          {pb.targetUrl && <Meta label="Target URL" value={pb.targetUrl} mono />}
        </div>
      </Card>

      {/* Runs */}
      <Section title={`Run History (${pb.runs.length})`}>
        {pb.runs.length === 0 ? (
          <Empty>No runs recorded.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pb.runs.map((r) => (
              <div key={r.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white capitalize">{r.phase}</span>
                    <span className="text-[10px] text-[#9CA3AF]">attempt {r.attempt}</span>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border capitalize ${RUN_STATUS_COLORS[r.status] ?? 'text-[#9CA3AF] bg-white/5 border-white/15'}`}>
                    {r.status}
                  </span>
                </div>
                <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-[11px] text-[#9CA3AF]">
                  {r.startedAt && <span>started {format(r.startedAt, 'MMM d, h:mm:ss a')}</span>}
                  {r.completedAt && <span>completed {format(r.completedAt, 'h:mm:ss a')}</span>}
                  {r.failedAt && <span className="text-red-400/80">failed {format(r.failedAt, 'h:mm:ss a')}</span>}
                </div>
                {r.errorMessage && (
                  <p className="mt-1.5 text-[11px] text-red-400/90 font-mono bg-red-500/5 border border-red-500/15 rounded p-2 whitespace-pre-wrap break-words">
                    {r.errorMessage}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Contacts */}
      <Section title={`Contacts (${pb.contacts.length})`}>
        {pb.contacts.length === 0 ? (
          <Empty>No contacts yet.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pb.contacts.map((c) => (
              <div key={c.id} className="px-5 py-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-white">{c.name} <span className="text-[#9CA3AF] font-normal">· {c.title}</span></p>
                    <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-[#9CA3AF]">
                      {c.email && <span className="flex items-center gap-1"><Mail className="w-3 h-3" />{c.email}</span>}
                      {c.linkedinUrl && (
                        <a href={c.linkedinUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[#10B981] hover:underline">
                          <ExternalLink className="w-3 h-3" />LinkedIn
                        </a>
                      )}
                      <span className="capitalize">confidence: {c.confidence}</span>
                    </div>
                  </div>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded border capitalize ${CONTACT_STATUS_COLORS[c.verificationStatus] ?? 'text-[#9CA3AF] bg-white/5 border-white/15'}`}>
                    {c.verificationStatus.replace(/_/g, ' ')}
                  </span>
                </div>
                {c.rationale && <p className="mt-1.5 text-[11px] text-[#9CA3AF]">{c.rationale}</p>}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sections (full content) */}
      <Section title={`Sections (${pb.sections.length})`}>
        {pb.sections.length === 0 ? (
          <Empty>No sections generated.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.04]">
            {pb.sections.map((s) => (
              <div key={s.id} className="px-5 py-4">
                <div className="flex items-center justify-between gap-3 mb-2">
                  <h3 className="text-sm font-semibold text-white">{s.title}</h3>
                  <span className="text-[10px] text-[#9CA3AF] capitalize">{s.status}</span>
                </div>
                {s.contentMarkdown?.trim() ? (
                  <div
                    className="prose prose-invert prose-sm max-w-none text-[#9CA3AF] prose-headings:text-white prose-strong:text-white prose-a:text-[#10B981]"
                    dangerouslySetInnerHTML={{ __html: marked.parse(s.contentMarkdown, { async: false }) as string }}
                  />
                ) : (
                  <p className="text-[11px] text-[#9CA3AF]/60 italic">Empty.</p>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Event log */}
      <Section title={`Event Log (${pb.events.length})`}>
        {pb.events.length === 0 ? (
          <Empty>No events.</Empty>
        ) : (
          <div className="divide-y divide-white/[0.04] max-h-96 overflow-y-auto">
            {pb.events.map((e) => (
              <div key={e.id} className="px-5 py-2 flex items-start gap-3">
                <span className="text-[10px] text-[#9CA3AF] font-mono flex-shrink-0 w-32">
                  {format(e.createdAt, 'MMM d HH:mm:ss')}
                </span>
                <div className="min-w-0">
                  <span className="text-[10px] font-semibold text-amber-400/80 uppercase tracking-wide">{e.type}</span>
                  <p className="text-xs text-[#9CA3AF] break-words">{e.message}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Sources */}
      {pb.sources.length > 0 && (
        <Section title={`Sources (${pb.sources.length})`}>
          <div className="divide-y divide-white/[0.04]">
            {pb.sources.map((src) => (
              <a key={src.id} href={src.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-5 py-2 text-xs text-[#10B981] hover:bg-white/[0.02] transition-colors">
                <ExternalLink className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{src.title ?? src.url}</span>
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  )
}

function Meta({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wider mb-0.5">{label}</p>
      <p className={`text-sm text-white truncate ${mono ? 'font-mono text-xs' : ''}`}>{value}</p>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="font-heading text-sm font-semibold text-white mb-3">{title}</h2>
      <Card className="bg-[#111827] border-[#374151] overflow-hidden">{children}</Card>
    </div>
  )
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#9CA3AF] px-5 py-8 text-center">{children}</p>
}
