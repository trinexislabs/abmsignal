'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { PlaybookStatusBadge } from '@/components/playbook-status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SECTION_META, type SectionType, type SourceReference, type SourceConfidence, type SourceVerificationStatus } from '@/types'
import {
  FileText,
  Building2,
  Users,
  Zap,
  Target,
  Globe,
  Radio,
  Mail,
  Shield,
  BookOpen,
  BarChart3,
  Paperclip,
  CheckCircle2,
  Clock,
  Pencil,
  X,
  Save,
  Download,
  Star,
  Share2,
  ChevronRight,
  Bot,
  Loader2,
  ExternalLink,
  AlertTriangle,
  ShieldCheck,
  ChevronDown,
  ChevronUp,
} from 'lucide-react'

const SECTION_ICONS: Record<SectionType, React.ElementType> = {
  executive_summary: FileText,
  account_intelligence: Building2,
  buying_committee: Users,
  why_now: Zap,
  competitive_landscape: Target,
  cultural_context: Globe,
  outreach_strategy: Radio,
  personalized_sequences: Mail,
  battle_cards: Shield,
  content_strategy: BookOpen,
  measurement_framework: BarChart3,
  appendix: Paperclip,
}

const orderedSectionTypes = Object.entries(SECTION_META)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([type]) => type as SectionType)

function mapSectionType(type: string): SectionType {
  const map: Record<string, SectionType> = {
    executive_summary: 'executive_summary',
    account_intelligence: 'account_intelligence',
    buying_committee: 'buying_committee',
    why_now: 'why_now',
    competitive_landscape: 'competitive_landscape',
    cultural_context: 'cultural_context',
    outreach_strategy: 'outreach_strategy',
    personalized_sequences: 'personalized_sequences',
    battle_cards: 'battle_cards',
    content_strategy: 'content_strategy',
    measurement_framework: 'measurement_framework',
    appendix: 'appendix',
    sequences: 'personalized_sequences',
    hyper_personalized_sequences: 'personalized_sequences',
    objection_handling: 'battle_cards',
    content_assets: 'content_strategy',
    measurement: 'measurement_framework',
  }
  return map[type] ?? 'executive_summary'
}

interface ApiSection {
  id: string
  playbook_id: string
  title: string
  type: string
  content: string
  order: number
  sources?: SourceReference[]
  created_at: string
}

interface PlaybookData {
  id: string
  product_name: string
  target_company: string
  status: string
  sections: ApiSection[]
  contacts: unknown[]
}

// Parse (source: URL) patterns from content and return index positions
function parseInlineSources(content: string): { url: string; index: number }[] {
  const results: { url: string; index: number }[] = []
  const regex = /\(source:\s*(https?:\/\/[^\s)]+)\)/gi
  let match
  while ((match = regex.exec(content)) !== null) {
    results.push({ url: match[1], index: match.index })
  }
  return results
}

// Replace (source: URL) with numbered superscript markers and return modified content + url list
function processSourceMarkers(content: string): { processed: string; urls: string[] } {
  const urls: string[] = []
  const processed = content.replace(/\(source:\s*(https?:\/\/[^\s)]+)\)/gi, (_match, url) => {
    const existing = urls.indexOf(url)
    if (existing !== -1) return `[${existing + 1}]`
    urls.push(url)
    return `[${urls.length}]`
  })
  return { processed, urls }
}

interface UrlMapEntry {
  url: string
  confidence?: SourceConfidence
  verificationStatus?: SourceVerificationStatus
}

interface SourceBadgeProps {
  refNumber: number
  entry: UrlMapEntry
}

function SourceBadge({ refNumber, entry }: SourceBadgeProps) {
  const [open, setOpen] = useState(false)
  const cfg = entry.verificationStatus ? VERIFICATION_CONFIG[entry.verificationStatus] : null
  const VerifyIcon = cfg?.icon ?? null

  return (
    <span className="relative inline-block align-super">
      {/* tap-outside backdrop — closes popup on mobile tap or desktop click */}
      {open && (
        <span
          className="fixed inset-0 z-40"
          style={{ cursor: 'default' }}
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="relative z-50 text-[10px] font-bold text-[#339af0] bg-[#339af0]/15 border border-[#339af0]/30 rounded px-1 py-0 leading-tight hover:bg-[#339af0]/25 transition-colors ml-0.5"
        aria-label={`Source ${refNumber}`}
      >
        {refNumber}
      </button>
      {open && (
        <span
          className="absolute z-50 left-0 top-5 w-72 bg-[#141419] border border-white/10 rounded-lg shadow-xl p-3 text-left"
          style={{ minWidth: '240px' }}
          onClick={e => e.stopPropagation()}
        >
          <button
            onClick={() => setOpen(false)}
            className="absolute top-2 right-2 text-[#a1a1aa] hover:text-white"
            aria-label="Close"
          >
            <X className="w-3 h-3" />
          </button>
          <p className="text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-wider mb-2">Source {refNumber}</p>
          <a
            href={entry.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#339af0] hover:underline break-all flex items-start gap-1 mb-2"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0 mt-0.5" />
            {entry.url}
          </a>
          {(entry.confidence || entry.verificationStatus) && (
            <div className="flex items-center gap-1.5 pt-2 border-t border-white/[0.06]">
              {entry.confidence && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border font-medium capitalize ${CONFIDENCE_COLORS[entry.confidence]}`}>
                  {entry.confidence}
                </span>
              )}
              {cfg && VerifyIcon && (
                <span className={`text-[10px] px-1.5 py-0.5 rounded border flex items-center gap-1 ${cfg.className}`}>
                  <VerifyIcon className="w-2.5 h-2.5" />
                  {cfg.label}
                </span>
              )}
            </div>
          )}
        </span>
      )}
    </span>
  )
}

// Render a single line with [N] markers replaced by SourceBadge components
function renderLineWithSources(line: string, urlMap: UrlMapEntry[]): React.ReactNode {
  if (urlMap.length === 0 || !line.includes('[')) return line
  const parts = line.split(/(\[\d+\])/g)
  return (
    <>
      {parts.map((part, i) => {
        const m = part.match(/^\[(\d+)\]$/)
        if (m) {
          const num = parseInt(m[1], 10)
          const entry = urlMap[num - 1]
          if (entry) return <SourceBadge key={i} refNumber={num} entry={entry} />
        }
        return <span key={i} dangerouslySetInnerHTML={{ __html: part.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
      })}
    </>
  )
}

function renderMarkdown(content: string, urlMap: UrlMapEntry[]): React.ReactNode {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-heading text-lg font-semibold text-white mt-6 mb-3 first:mt-0">
          {renderLineWithSources(line.slice(3), urlMap)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-heading text-base font-semibold text-white/90 mt-4 mb-2">
          {renderLineWithSources(line.slice(4), urlMap)}
        </h3>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="font-semibold text-white/90 mb-1">
          {renderLineWithSources(line.slice(2, -2), urlMap)}
        </p>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <li key={i} className="text-[#a1a1aa] text-sm ml-4 mb-1 list-none flex gap-2">
          <span className="text-[#339af0] mt-1.5 flex-shrink-0">•</span>
          <span>{renderLineWithSources(line.slice(2), urlMap)}</span>
        </li>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-[#339af0]/40 pl-4 my-2 text-[#a1a1aa] text-sm italic">
          {renderLineWithSources(line.slice(2), urlMap)}
        </blockquote>
      )
    } else if (line.startsWith('---')) {
      elements.push(<hr key={i} className="border-white/10 my-4" />)
    } else if (line.startsWith('|') && line.includes('|')) {
      const tableLines: string[] = []
      while (i < lines.length && lines[i].startsWith('|')) {
        tableLines.push(lines[i])
        i++
      }
      const [headerRow, , ...dataRows] = tableLines
      const headers = headerRow.split('|').filter(Boolean).map(h => h.trim())
      elements.push(
        <div key={i} className="overflow-x-auto my-4">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr>
                {headers.map((h, hi) => (
                  <th key={hi} className="text-left px-3 py-2 bg-white/5 text-white/70 font-medium border border-white/10 text-xs uppercase tracking-wide">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {dataRows.map((row, ri) => {
                const cells = row.split('|').filter(Boolean).map(c => c.trim())
                return (
                  <tr key={ri} className="hover:bg-white/[0.02]">
                    {cells.map((cell, ci) => (
                      <td key={ci} className="px-3 py-2 text-[#a1a1aa] border border-white/10">
                        {renderLineWithSources(cell, urlMap)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
      continue
    } else if (line.trim() === '') {
      // skip empty lines
    } else {
      elements.push(
        <p key={i} className="text-[#a1a1aa] text-sm leading-relaxed mb-2">
          {renderLineWithSources(line, urlMap)}
        </p>
      )
    }
    i++
  }

  return <>{elements}</>
}

const VERIFICATION_CONFIG: Record<SourceVerificationStatus, { label: string; icon: React.ElementType; className: string }> = {
  verified: { label: 'Verified', icon: CheckCircle2, className: 'text-green-400 bg-green-500/10 border-green-500/30' },
  needs_review: { label: 'Needs Review', icon: AlertTriangle, className: 'text-amber-400 bg-amber-500/10 border-amber-500/30' },
  unverified: { label: 'Unverified', icon: X, className: 'text-red-400 bg-red-500/10 border-red-500/30' },
}

const CONFIDENCE_COLORS: Record<string, string> = {
  high: 'text-green-400 bg-green-500/10 border-green-500/30',
  medium: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
  low: 'text-red-400 bg-red-500/10 border-red-500/30',
}

interface SourceRowProps {
  source: SourceReference
  sectionId: string
  sectionTitle: string
  playbookId: string
  onUpdate: (sectionId: string, sourceId: string, status: SourceVerificationStatus) => void
}

function SourceRow({ source, sectionId, sectionTitle, playbookId, onUpdate }: SourceRowProps) {
  const [saving, setSaving] = useState(false)
  const cfg = VERIFICATION_CONFIG[source.verification_status]
  const Icon = cfg.icon

  async function setStatus(status: SourceVerificationStatus) {
    if (saving) return
    setSaving(true)
    try {
      await fetch(`/api/playbooks/${playbookId}/verify`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ section_id: sectionId, source_id: source.id, verification_status: status }),
      })
      onUpdate(sectionId, source.id, status)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-start gap-3 p-4 border-b border-white/[0.04] last:border-b-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm text-white/80 mb-1">{source.claim}</p>
        <div className="flex flex-wrap items-center gap-2 mt-1">
          <span className="text-[10px] text-[#a1a1aa]">{sectionTitle}</span>
          <a
            href={source.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs text-[#339af0] hover:underline truncate max-w-xs"
          >
            <ExternalLink className="w-3 h-3 flex-shrink-0" />
            <span className="truncate">{source.source_url}</span>
          </a>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2 flex-shrink-0">
        <Badge variant="outline" className={`text-[10px] px-2 py-0 capitalize ${CONFIDENCE_COLORS[source.confidence]}`}>
          {source.confidence}
        </Badge>
        <Badge variant="outline" className={`text-[10px] px-2 py-0 flex items-center gap-1 ${cfg.className}`}>
          <Icon className="w-2.5 h-2.5" />
          {cfg.label}
        </Badge>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setStatus('verified')}
            disabled={saving || source.verification_status === 'verified'}
            title="Mark verified"
            className={`p-1 rounded transition-colors text-xs ${source.verification_status === 'verified' ? 'text-green-400 bg-green-500/10 cursor-default' : 'text-[#a1a1aa] hover:text-green-400 hover:bg-green-500/10'}`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setStatus('needs_review')}
            disabled={saving || source.verification_status === 'needs_review'}
            title="Needs review"
            className={`p-1 rounded transition-colors ${source.verification_status === 'needs_review' ? 'text-amber-400 bg-amber-500/10 cursor-default' : 'text-[#a1a1aa] hover:text-amber-400 hover:bg-amber-500/10'}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setStatus('unverified')}
            disabled={saving || source.verification_status === 'unverified'}
            title="Mark unverified"
            className={`p-1 rounded transition-colors ${source.verification_status === 'unverified' ? 'text-red-400 bg-red-500/10 cursor-default' : 'text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10'}`}
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function PlaybookDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [activeSectionType, setActiveSectionType] = useState<SectionType>('executive_summary')
  const [editingSection, setEditingSection] = useState<string | null>(null)
  const [editContent, setEditContent] = useState<string>('')
  const [savedContents, setSavedContents] = useState<Record<string, string>>({})
  const [playbook, setPlaybook] = useState<PlaybookData | null>(null)
  const [loading, setLoading] = useState(true)
  const [mounted, setMounted] = useState(false)
  const [showSources, setShowSources] = useState(false)
  // local source verification state keyed by sectionId -> sourceId -> status
  const [sourceStatuses, setSourceStatuses] = useState<Record<string, Record<string, SourceVerificationStatus>>>({})

  useEffect(() => { setMounted(true) }, [])

  useEffect(() => {
    if (!id || !mounted) return
    async function fetchPlaybook() {
      try {
        const res = await fetch(`/api/playbooks/${id}`)
        if (res.ok) {
          const json = await res.json()
          setPlaybook(json.data)
        }
      } catch (err) {
        console.error('[playbook] Failed to fetch:', err)
      } finally {
        setLoading(false)
      }
    }
    fetchPlaybook()
  }, [id, mounted])

  const handleSourceUpdate = useCallback((sectionId: string, sourceId: string, status: SourceVerificationStatus) => {
    setSourceStatuses(prev => ({
      ...prev,
      [sectionId]: { ...(prev[sectionId] ?? {}), [sourceId]: status },
    }))
  }, [])

  if (!mounted || loading) {
    return (
      <div className="flex h-screen bg-[#0a0a0f] items-center justify-center">
        <Loader2 className="w-6 h-6 text-[#339af0] animate-spin" />
      </div>
    )
  }

  if (!playbook) {
    return (
      <div className="flex h-screen bg-[#0a0a0f] items-center justify-center">
        <div className="text-center">
          <p className="text-white/60 text-sm">Playbook not found</p>
          <Link href="/dashboard" className="text-[#339af0] text-sm mt-2 inline-block hover:underline">Back to Dashboard</Link>
        </div>
      </div>
    )
  }

  const sectionsByType = new Map<SectionType, ApiSection>()
  for (const s of playbook.sections) {
    sectionsByType.set(mapSectionType(s.type), s)
  }

  const activeSection = sectionsByType.get(activeSectionType)
  const currentContent = activeSection ? (savedContents[activeSection.id] ?? activeSection.content) : ''
  const hasContent = currentContent && currentContent.trim().length > 0

  // Process inline (source: URL) markers
  const { processed: processedContent, urls: inlineUrls } = processSourceMarkers(currentContent ?? '')

  // Enrich inline URL entries with metadata from structured section sources (matched by URL)
  const sectionSourcesByUrl = new Map((activeSection?.sources ?? []).map(s => [s.source_url, s]))
  const inlineUrlMap: UrlMapEntry[] = inlineUrls.map(url => {
    const match = sectionSourcesByUrl.get(url)
    return {
      url,
      confidence: match?.confidence,
      verificationStatus: match?.verification_status,
    }
  })

  // Aggregate all sources across all sections
  const allSources: { source: SourceReference; sectionId: string; sectionTitle: string }[] = []
  for (const section of playbook.sections) {
    if (section.sources?.length) {
      for (const src of section.sources) {
        const effectiveStatus = sourceStatuses[section.id]?.[src.id] ?? src.verification_status
        allSources.push({
          source: { ...src, verification_status: effectiveStatus },
          sectionId: section.id,
          sectionTitle: SECTION_META[mapSectionType(section.type)]?.title ?? section.title,
        })
      }
    }
  }

  const verifiedCount = allSources.filter(s => s.source.verification_status === 'verified').length
  const needsReviewCount = allSources.filter(s => s.source.verification_status === 'needs_review').length
  const unverifiedCount = allSources.filter(s => s.source.verification_status === 'unverified').length

  function startEdit() {
    setEditContent(currentContent)
    setEditingSection(activeSection?.id ?? null)
  }

  function saveEdit() {
    if (activeSection) {
      setSavedContents(prev => ({ ...prev, [activeSection.id]: editContent }))
    }
    setEditingSection(null)
  }

  function cancelEdit() {
    setEditingSection(null)
    setEditContent('')
  }

  function handleExportPdf() {
    if (!playbook) return
    const win = window.open('', '_blank')
    if (!win) return

    const sectionsHtml = orderedSectionTypes
      .map((sectionType) => {
        const meta = SECTION_META[sectionType]
        const section = sectionsByType.get(sectionType)
        const content = section ? (savedContents[section.id] ?? section.content) : ''
        if (!content?.trim()) return ''
        const htmlContent = content
          .replace(/\(source:\s*(https?:\/\/[^\s)]+)\)/gi, '')
          .replace(/\[\d+\]/g, '')
          .replace(/^## (.+)$/gm, '<h2>$1</h2>')
          .replace(/^### (.+)$/gm, '<h3>$1</h3>')
          .replace(/^\*\*(.+)\*\*$/gm, '<p><strong>$1</strong></p>')
          .replace(/^- (.+)$/gm, '<li>$1</li>')
          .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
          .replace(/(<li>.*<\/li>\n?)+/g, (m) => `<ul>${m}</ul>`)
          .replace(/^(?!<[hup]|<li|<ul|<blockquote)(.+)$/gm, '<p>$1</p>')
        return `<section><h2 class="section-title">${meta.order}. ${meta.title}</h2><div class="section-content">${htmlContent}</div></section>`
      })
      .filter(Boolean)
      .join('\n')

    win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${playbook.product_name} → ${playbook.target_company} — ABM Playbook</title>
<style>
  body { font-family: Georgia, serif; font-size: 12pt; color: #111; margin: 0; padding: 0; }
  .cover { page-break-after: always; display: flex; flex-direction: column; justify-content: center; padding: 80px 60px; }
  .cover h1 { font-size: 28pt; margin: 0 0 12px; }
  .cover p { font-size: 13pt; color: #555; margin: 4px 0; }
  .cover .badge { display: inline-block; background: #1e3a5f; color: #fff; padding: 4px 14px; border-radius: 20px; font-size: 10pt; margin-top: 24px; }
  section { page-break-inside: avoid; padding: 40px 60px 20px; border-bottom: 1px solid #eee; }
  section:last-child { border-bottom: none; }
  .section-title { font-size: 16pt; color: #1e3a5f; margin: 0 0 16px; border-bottom: 2px solid #339af0; padding-bottom: 8px; }
  .section-content h2 { font-size: 13pt; color: #222; margin: 16px 0 8px; }
  .section-content h3 { font-size: 11pt; color: #444; margin: 12px 0 6px; }
  .section-content p { margin: 6px 0; line-height: 1.6; }
  .section-content ul { margin: 8px 0; padding-left: 20px; }
  .section-content li { margin: 4px 0; line-height: 1.5; }
  @page { margin: 0; }
  @media print { body { -webkit-print-color-adjust: exact; } }
</style>
</head>
<body>
<div class="cover">
  <p style="color:#339af0;font-family:sans-serif;font-size:10pt;letter-spacing:2px;text-transform:uppercase;margin-bottom:8px;">ABMSignal Playbook</p>
  <h1>${playbook.product_name} → ${playbook.target_company}</h1>
  <p>Generated ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
  <span class="badge">Confidential</span>
</div>
${sectionsHtml}
</body>
</html>`)
    win.document.close()
    win.focus()
    setTimeout(() => win.print(), 500)
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0d0d15] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#a1a1aa] hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-heading font-semibold text-white text-base">
                {playbook.product_name} → {playbook.target_company}
              </h1>
              <PlaybookStatusBadge status={playbook.status as 'draft' | 'researching' | 'contact_review' | 'writing' | 'reviewing' | 'complete' | 'error' | 'rejected'} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="sm" className="text-[#a1a1aa] hover:text-white hover:bg-white/5 gap-1.5">
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Link href={`/playbook/${id}/review`}>
              <Button variant="outline" size="sm" className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1.5">
                <Star className="w-3.5 h-3.5" />
                Quality Review
              </Button>
            </Link>
            <Button size="sm" onClick={handleExportPdf} className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5">
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </header>

        <div className="flex flex-1 min-h-0 overflow-hidden">
          <aside className="w-60 flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d15] overflow-y-auto">
            <div className="px-3 py-4">
              <p className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-widest px-3 mb-3">
                Sections
              </p>
              <nav className="space-y-0.5">
                {orderedSectionTypes.map((sectionType) => {
                  const meta = SECTION_META[sectionType]
                  const Icon = SECTION_ICONS[sectionType]
                  const section = sectionsByType.get(sectionType)
                  const isActive = activeSectionType === sectionType
                  const hasSection = !!section?.content?.trim()

                  return (
                    <button
                      key={sectionType}
                      onClick={() => {
                        setActiveSectionType(sectionType)
                        setEditingSection(null)
                        setShowSources(false)
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                        isActive && !showSources
                          ? 'bg-[#1e3a5f] border border-[#339af0]/20 text-white'
                          : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive && !showSources ? 'text-[#339af0]' : 'text-[#a1a1aa] group-hover:text-white/70'}`} />
                      <span className="text-xs font-medium flex-1 truncate leading-tight">
                        {meta.title}
                      </span>
                      <span
                        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                          hasSection ? 'bg-green-500' : 'bg-white/20'
                        }`}
                      />
                    </button>
                  )
                })}

                {/* Sources nav item */}
                {allSources.length > 0 && (
                  <button
                    onClick={() => {
                      setShowSources(true)
                      setEditingSection(null)
                    }}
                    className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group mt-2 ${
                      showSources
                        ? 'bg-[#1e3a5f] border border-[#339af0]/20 text-white'
                        : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <ShieldCheck className={`w-3.5 h-3.5 flex-shrink-0 ${showSources ? 'text-[#339af0]' : 'text-[#a1a1aa] group-hover:text-white/70'}`} />
                    <span className="text-xs font-medium flex-1 truncate leading-tight">
                      Sources & Verification
                    </span>
                    <span className="text-[10px] bg-[#339af0]/20 text-[#339af0] rounded px-1 font-semibold">
                      {allSources.length}
                    </span>
                  </button>
                )}
              </nav>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
            {showSources ? (
              <div className="max-w-4xl mx-auto px-8 py-8">
                <div className="flex items-start justify-between mb-6">
                  <div>
                    <h2 className="font-heading text-2xl font-bold text-white mb-1">Sources & Verification</h2>
                    <p className="text-sm text-[#a1a1aa]">
                      Review and verify every claim the AI agents made in this playbook.
                    </p>
                  </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-3 gap-3 mb-6">
                  <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <CheckCircle2 className="w-4 h-4 text-green-400" />
                      <span className="text-xs font-medium text-green-400">Verified</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{verifiedCount}</p>
                  </div>
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle className="w-4 h-4 text-amber-400" />
                      <span className="text-xs font-medium text-amber-400">Needs Review</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{needsReviewCount}</p>
                  </div>
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4">
                    <div className="flex items-center gap-2 mb-1">
                      <X className="w-4 h-4 text-red-400" />
                      <span className="text-xs font-medium text-red-400">Unverified</span>
                    </div>
                    <p className="text-2xl font-bold text-white">{unverifiedCount}</p>
                  </div>
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#141419] overflow-hidden">
                  {allSources.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <ShieldCheck className="w-10 h-10 text-[#a1a1aa] mb-3" />
                      <p className="text-white/60 text-sm">No sources attached to this playbook yet.</p>
                      <p className="text-[#a1a1aa] text-xs mt-1">Sources will appear here when the AI agents add them to sections.</p>
                    </div>
                  ) : (
                    allSources.map(({ source, sectionId, sectionTitle }) => (
                      <SourceRow
                        key={`${sectionId}-${source.id}`}
                        source={source}
                        sectionId={sectionId}
                        sectionTitle={sectionTitle}
                        playbookId={id}
                        onUpdate={handleSourceUpdate}
                      />
                    ))
                  )}
                </div>

                {/* Inline URL sources note */}
                {inlineUrlMap.length > 0 && (
                  <div className="mt-4 p-3 rounded-lg border border-white/[0.06] bg-[#141419]">
                    <p className="text-xs text-[#a1a1aa] mb-2">Inline source references found in content:</p>
                    <ol className="space-y-1">
                      {inlineUrlMap.map((entry, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs">
                          <span className="text-[#339af0] font-bold">[{i + 1}]</span>
                          <a href={entry.url} target="_blank" rel="noopener noreferrer" className="text-[#339af0] hover:underline break-all">
                            {entry.url}
                          </a>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            ) : (
              <div className="max-w-4xl mx-auto px-8 py-8">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-widest">
                        Section {SECTION_META[activeSectionType].order} of 12
                      </span>
                      <Badge
                        variant="outline"
                        className={`text-[10px] px-2 py-0 ${
                          hasContent
                            ? 'border-green-500/30 text-green-400 bg-green-500/10'
                            : 'border-white/20 text-[#a1a1aa]'
                        }`}
                      >
                        {hasContent ? 'Complete' : 'Pending'}
                      </Badge>
                      {activeSection?.sources && activeSection.sources.length > 0 && (
                        <button
                          onClick={() => setShowSources(true)}
                          className="inline-flex items-center gap-1 text-[10px] text-[#339af0] bg-[#339af0]/10 border border-[#339af0]/20 rounded px-2 py-0.5 hover:bg-[#339af0]/20 transition-colors"
                        >
                          <ShieldCheck className="w-2.5 h-2.5" />
                          {activeSection.sources.length} source{activeSection.sources.length !== 1 ? 's' : ''}
                        </button>
                      )}
                    </div>
                    <h2 className="font-heading text-2xl font-bold text-white">
                      {SECTION_META[activeSectionType].title}
                    </h2>
                  </div>
                  {hasContent && editingSection !== activeSection?.id && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={startEdit}
                      className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1.5 flex-shrink-0 ml-4"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                      Edit
                    </Button>
                  )}
                </div>

                <div className="rounded-xl border border-white/[0.06] bg-[#141419] p-6">
                  {editingSection === activeSection?.id ? (
                    <div className="space-y-4">
                      <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-96 bg-[#0a0a0f] border border-white/10 rounded-lg p-4 text-sm text-[#a1a1aa] font-mono resize-none focus:outline-none focus:border-[#339af0]/40 leading-relaxed"
                        placeholder="Section content (Markdown supported)..."
                      />
                      <div className="flex items-center gap-2">
                        <Button size="sm" onClick={saveEdit} className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5">
                          <Save className="w-3.5 h-3.5" />
                          Save Changes
                        </Button>
                        <Button variant="ghost" size="sm" onClick={cancelEdit} className="text-[#a1a1aa] hover:text-white gap-1.5">
                          <X className="w-3.5 h-3.5" />
                          Cancel
                        </Button>
                      </div>
                    </div>
                  ) : hasContent ? (
                    <div className="prose prose-invert max-w-none">
                      {renderMarkdown(processedContent, inlineUrlMap)}
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <Clock className="w-5 h-5 text-[#a1a1aa]" />
                      </div>
                      <p className="text-white/60 text-sm font-medium">Section not yet generated</p>
                      <p className="text-[#a1a1aa] text-xs mt-1">This section will appear once the AI agents complete it</p>
                    </div>
                  )}
                </div>

                {activeSection?.created_at && (
                  <div className="flex items-center gap-4 mt-4 px-1">
                    <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                      <Bot className="w-3.5 h-3.5" />
                      <span>Generated by Writer Agent</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                      <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
                      <span>Reviewed by Quality Agent</span>
                    </div>
                    {inlineUrls.length > 0 && (
                      <button
                        onClick={() => setShowSources(true)}
                        className="flex items-center gap-1.5 text-xs text-[#339af0] hover:underline"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        {inlineUrls.length} inline reference{inlineUrls.length !== 1 ? 's' : ''}
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}
          </main>
        </div>
      </div>
    </div>
  )
}
