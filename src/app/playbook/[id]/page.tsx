'use client'

import { use, useEffect, useState, useCallback } from 'react'
import Link from 'next/link'
import { marked } from 'marked'
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
  TrendingUp,
  AlertCircle,
  Sparkles,
  Search,
  Monitor,
  FlaskConical,
  DollarSign,
  ClipboardList,
  Navigation,
} from 'lucide-react'

const SECTION_ICONS: Record<SectionType, React.ElementType> = {
  executive_summary:    FileText,
  account_snapshot:     Building2,
  account_fit_score:    TrendingUp,
  buying_committee:     Users,
  pain_hypotheses:      AlertCircle,
  why_now:              Zap,
  value_proposition:    Sparkles,
  competitive_landscape: Target,
  cultural_context:     Globe,
  deal_motion:          Navigation,
  personalized_sequences: Mail,
  discovery_guide:      Search,
  demo_strategy:        Monitor,
  battle_cards:         Shield,
  pilot_design:         FlaskConical,
  roi_model:            DollarSign,
  deal_execution_plan:  ClipboardList,
  appendix:             Paperclip,
}

const orderedSectionTypes = Object.entries(SECTION_META)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([type]) => type as SectionType)

function mapSectionType(type: string): SectionType {
  const map: Record<string, SectionType> = {
    // Current 18 section types
    executive_summary:    'executive_summary',
    account_snapshot:     'account_snapshot',
    account_fit_score:    'account_fit_score',
    buying_committee:     'buying_committee',
    pain_hypotheses:      'pain_hypotheses',
    why_now:              'why_now',
    value_proposition:    'value_proposition',
    competitive_landscape: 'competitive_landscape',
    cultural_context:     'cultural_context',
    deal_motion:          'deal_motion',
    personalized_sequences: 'personalized_sequences',
    discovery_guide:      'discovery_guide',
    demo_strategy:        'demo_strategy',
    battle_cards:         'battle_cards',
    pilot_design:         'pilot_design',
    roi_model:            'roi_model',
    deal_execution_plan:  'deal_execution_plan',
    appendix:             'appendix',
    // Legacy aliases (old section keys → nearest new equivalent)
    account_intelligence:   'account_snapshot',
    outreach_strategy:      'deal_motion',
    content_strategy:       'value_proposition',
    measurement_framework:  'roi_model',
    sequences:              'personalized_sequences',
    hyper_personalized_sequences: 'personalized_sequences',
    objection_handling:     'battle_cards',
    content_assets:         'value_proposition',
    measurement:            'roi_model',
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

marked.setOptions({ gfm: true, breaks: false })

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

// Escape a string for use inside a CSS string literal (e.g. `content: "..."`).
// CSS strings can't contain raw quotes, backslashes, or newlines.
function escapeCssString(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, ' ')
    .replace(/\r/g, '')
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

    type Built = { order: number; title: string; html: string; refs: string[] }
    const built: Built[] = []

    for (const sectionType of orderedSectionTypes) {
      const meta = SECTION_META[sectionType]
      const section = sectionsByType.get(sectionType)
      const raw = section ? (savedContents[section.id] ?? section.content) : ''
      if (!raw?.trim()) continue

      const { processed, urls } = processSourceMarkers(raw)
      const withCites = processed.replace(/\[(\d+)\]/g, '<sup class="cite">$1</sup>')
      const html = marked.parse(withCites, { async: false }) as string
      built.push({ order: meta.order, title: meta.title, html, refs: urls })
    }

    const productName = escapeHtml(playbook.product_name)
    const targetCompany = escapeHtml(playbook.target_company)
    const productNameCss = escapeCssString(playbook.product_name)
    const targetCompanyCss = escapeCssString(playbook.target_company)
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric', month: 'long', day: 'numeric',
    })

    const tocHtml = built
      .map(b => `
        <li class="toc-item">
          <span class="toc-num">${String(b.order).padStart(2, '0')}</span>
          <span class="toc-title">${escapeHtml(b.title)}</span>
          <span class="toc-dots"></span>
        </li>`)
      .join('')

    const sectionsHtml = built.map(b => `
      <section class="pb-section">
        <header class="section-header">
          <span class="section-num">${String(b.order).padStart(2, '0')}</span>
          <h1 class="section-title">${escapeHtml(b.title)}</h1>
        </header>
        <div class="section-body">${b.html}</div>
        ${b.refs.length ? `
        <aside class="refs">
          <h4 class="refs-title">References</h4>
          <ol class="refs-list">
            ${b.refs.map(u => `<li><a href="${escapeHtml(u)}">${escapeHtml(u)}</a></li>`).join('')}
          </ol>
        </aside>` : ''}
      </section>`).join('\n')

    const doc = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>${productName} &rarr; ${targetCompany} &mdash; ABM Playbook</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Space+Grotesk:wght@600;700&display=swap" rel="stylesheet">
<style>
  :root {
    --navy: #1e3a5f;
    --navy-deep: #14283f;
    --accent: #339af0;
    --ink: #1a1a1a;
    --body: #2b2b32;
    --muted: #6b7280;
    --rule: #e5e7eb;
    --rule-soft: #f1f3f5;
    --surface: #f8fafc;
  }

  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body {
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif;
    font-size: 10.5pt;
    line-height: 1.55;
    color: var(--body);
    -webkit-font-smoothing: antialiased;
  }

  h1, h2, h3, h4, h5, h6 {
    font-family: 'Space Grotesk', 'Inter', -apple-system, sans-serif;
    color: var(--ink);
    font-weight: 600;
    line-height: 1.25;
  }

  @page {
    size: A4;
    margin: 24mm 22mm 24mm 22mm;
    @top-left {
      content: "ABMSignal Playbook";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #9aa3b2;
      letter-spacing: 1.5px;
      text-transform: uppercase;
      padding-bottom: 6mm;
    }
    @top-right {
      content: "${productNameCss} \\2192  ${targetCompanyCss}";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #9aa3b2;
      padding-bottom: 6mm;
    }
    @bottom-right {
      content: counter(page) " / " counter(pages);
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #9aa3b2;
      padding-top: 6mm;
    }
    @bottom-left {
      content: "Confidential";
      font-family: 'Inter', sans-serif;
      font-size: 8pt;
      color: #9aa3b2;
      letter-spacing: 1px;
      text-transform: uppercase;
      padding-top: 6mm;
    }
  }
  @page :first {
    margin: 0;
    @top-left { content: none; }
    @top-right { content: none; }
    @bottom-left { content: none; }
    @bottom-right { content: none; }
  }
  @page toc {
    @top-right { content: "Table of Contents"; }
  }

  /* ===== Cover ===== */
  .cover {
    page: cover;
    page-break-after: always;
    break-after: page;
    height: 297mm;
    padding: 28mm 22mm;
    background: linear-gradient(160deg, #0a1628 0%, #14283f 50%, #1e3a5f 100%);
    color: #fff;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    position: relative;
    overflow: hidden;
  }
  .cover::after {
    content: "";
    position: absolute;
    right: -100mm;
    top: -60mm;
    width: 260mm;
    height: 260mm;
    border-radius: 50%;
    background: radial-gradient(circle, rgba(51,154,240,0.18) 0%, rgba(51,154,240,0) 60%);
    pointer-events: none;
  }
  .cover-brand {
    display: flex;
    align-items: center;
    gap: 10px;
    color: #fff;
    font-family: 'Space Grotesk', sans-serif;
    font-weight: 700;
    font-size: 12pt;
    letter-spacing: 0.5px;
    position: relative;
    z-index: 1;
  }
  .cover-brand-mark {
    width: 28px; height: 28px;
    border-radius: 6px;
    background: var(--accent);
    display: inline-flex;
    align-items: center;
    justify-content: center;
    color: #0a1628;
    font-weight: 800;
    font-size: 14pt;
  }
  .cover-body { position: relative; z-index: 1; }
  .cover-eyebrow {
    color: var(--accent);
    font-size: 9pt;
    letter-spacing: 3px;
    text-transform: uppercase;
    font-weight: 600;
    margin-bottom: 18px;
  }
  .cover-title {
    font-size: 32pt;
    font-weight: 700;
    color: #fff;
    margin: 0 0 14px;
    line-height: 1.1;
    letter-spacing: -0.5px;
  }
  .cover-arrow {
    color: var(--accent);
    font-weight: 400;
    padding: 0 8px;
  }
  .cover-sub {
    font-size: 12pt;
    color: rgba(255,255,255,0.75);
    margin: 0;
    max-width: 130mm;
    line-height: 1.45;
  }
  .cover-meta {
    position: relative;
    z-index: 1;
    display: flex;
    gap: 32px;
    padding-top: 18px;
    border-top: 1px solid rgba(255,255,255,0.15);
  }
  .cover-meta-item { display: flex; flex-direction: column; gap: 4px; }
  .cover-meta-label {
    font-size: 8pt;
    letter-spacing: 2px;
    text-transform: uppercase;
    color: rgba(255,255,255,0.5);
    font-weight: 500;
  }
  .cover-meta-value {
    font-size: 11pt;
    color: #fff;
    font-weight: 500;
  }
  .cover-badge {
    display: inline-block;
    background: rgba(51,154,240,0.18);
    border: 1px solid rgba(51,154,240,0.4);
    color: var(--accent);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 8pt;
    font-weight: 600;
    letter-spacing: 1.5px;
    text-transform: uppercase;
  }

  /* ===== TOC ===== */
  .toc {
    page: toc;
    page-break-after: always;
    break-after: page;
    padding-top: 4mm;
  }
  .toc-heading {
    font-size: 22pt;
    color: var(--ink);
    margin: 0 0 4px;
    letter-spacing: -0.3px;
  }
  .toc-rule {
    width: 48px;
    height: 3px;
    background: var(--accent);
    margin: 12px 0 24px;
  }
  .toc-list {
    list-style: none;
    padding: 0;
    margin: 0;
  }
  .toc-item {
    display: flex;
    align-items: baseline;
    gap: 14px;
    padding: 10px 0;
    border-bottom: 1px dotted #d1d5db;
    font-size: 11pt;
    color: var(--ink);
  }
  .toc-num {
    font-family: 'Space Grotesk', sans-serif;
    color: var(--accent);
    font-weight: 600;
    font-size: 10pt;
    min-width: 24px;
  }
  .toc-title { flex: 1; font-weight: 500; }
  .toc-dots { color: #cbd5e1; }

  /* ===== Sections ===== */
  .pb-section {
    page-break-before: always;
    break-before: page;
    padding-top: 4mm;
  }
  .pb-section:first-of-type {
    page-break-before: auto;
    break-before: auto;
  }
  .section-header {
    margin: 0 0 18px;
    padding-bottom: 12px;
    border-bottom: 2px solid var(--navy);
    display: flex;
    align-items: baseline;
    gap: 14px;
    page-break-after: avoid;
    break-after: avoid;
  }
  .section-num {
    font-family: 'Space Grotesk', sans-serif;
    font-size: 10pt;
    font-weight: 600;
    color: var(--accent);
    letter-spacing: 1px;
  }
  .section-title {
    font-size: 20pt;
    margin: 0;
    color: var(--navy);
    font-weight: 700;
    letter-spacing: -0.2px;
  }
  .section-body {
    orphans: 3;
    widows: 3;
    overflow-wrap: break-word;
    word-break: break-word;
  }

  /* ===== Body content ===== */
  .section-body h1 { font-size: 14pt; margin: 22px 0 10px; color: var(--ink); page-break-after: avoid; break-after: avoid; }
  .section-body h2 { font-size: 12.5pt; margin: 20px 0 8px; color: var(--navy-deep); page-break-after: avoid; break-after: avoid; }
  .section-body h3 { font-size: 11pt; margin: 16px 0 6px; color: var(--navy-deep); font-weight: 600; page-break-after: avoid; break-after: avoid; }
  .section-body h4 { font-size: 10pt; margin: 14px 0 4px; color: var(--ink); text-transform: uppercase; letter-spacing: 0.5px; page-break-after: avoid; break-after: avoid; }
  .section-body p { margin: 8px 0; line-height: 1.65; }
  .section-body strong { color: var(--ink); font-weight: 600; }
  .section-body em { color: var(--ink); }

  .section-body ul, .section-body ol {
    margin: 10px 0;
    padding-left: 22px;
  }
  .section-body li {
    margin: 5px 0;
    line-height: 1.6;
  }
  .section-body ul li::marker { color: var(--accent); }
  .section-body ol li::marker { color: var(--accent); font-weight: 600; }
  .section-body li > ul, .section-body li > ol { margin: 4px 0; }

  .section-body hr {
    border: none;
    border-top: 1px solid var(--rule);
    margin: 22px 0;
  }

  /* Blockquotes -> callouts */
  .section-body blockquote {
    margin: 14px 0;
    padding: 12px 16px 12px 18px;
    border-left: 3px solid var(--accent);
    background: var(--surface);
    color: var(--body);
    font-style: normal;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .section-body blockquote p { margin: 4px 0; }

  /* Code */
  .section-body code {
    font-family: 'SF Mono', Menlo, Consolas, monospace;
    background: var(--rule-soft);
    color: var(--navy-deep);
    padding: 1px 5px;
    border-radius: 3px;
    font-size: 9.5pt;
  }
  .section-body pre {
    background: #0f172a;
    color: #e2e8f0;
    padding: 14px 16px;
    border-radius: 6px;
    overflow-x: hidden;
    white-space: pre-wrap;
    font-size: 9pt;
    line-height: 1.5;
    page-break-inside: avoid;
    break-inside: avoid;
    margin: 12px 0;
  }
  .section-body pre code {
    background: transparent;
    color: inherit;
    padding: 0;
    font-size: inherit;
  }

  /* Tables */
  .section-body table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0 18px;
    font-size: 9.5pt;
    page-break-inside: auto;
    break-inside: auto;
    table-layout: fixed;
  }
  .section-body thead { display: table-header-group; }
  .section-body tr { page-break-inside: avoid; break-inside: avoid; }
  .section-body th {
    background: var(--navy);
    color: #fff;
    text-align: left;
    padding: 9px 12px;
    font-weight: 600;
    font-size: 8.5pt;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    border: 1px solid var(--navy);
    word-break: break-word;
  }
  .section-body td {
    padding: 8px 12px;
    border: 1px solid var(--rule);
    vertical-align: top;
    line-height: 1.5;
    word-break: break-word;
  }
  .section-body tbody tr:nth-child(even) td {
    background: #fafbfc;
  }

  /* Links */
  .section-body a {
    color: var(--accent);
    text-decoration: none;
    border-bottom: 1px solid rgba(51,154,240,0.3);
    word-break: break-all;
    overflow-wrap: break-word;
  }

  /* Citation chips */
  .cite {
    display: inline-block;
    font-family: 'Space Grotesk', sans-serif;
    background: rgba(51,154,240,0.12);
    color: var(--accent);
    border: 1px solid rgba(51,154,240,0.35);
    border-radius: 3px;
    padding: 0 4px;
    font-size: 7pt;
    font-weight: 700;
    line-height: 1.4;
    vertical-align: super;
    margin-left: 1px;
  }
  .cite::before { content: "["; }
  .cite::after { content: "]"; }

  /* References block */
  .refs {
    margin-top: 22px;
    padding: 14px 18px;
    background: var(--surface);
    border-left: 3px solid var(--navy);
    border-radius: 0 4px 4px 0;
    page-break-inside: avoid;
    break-inside: avoid;
  }
  .refs-title {
    font-size: 8.5pt;
    margin: 0 0 8px;
    color: var(--navy-deep);
    text-transform: uppercase;
    letter-spacing: 1.5px;
    font-weight: 700;
  }
  .refs-list {
    margin: 0;
    padding-left: 20px;
    font-size: 8.5pt;
    color: var(--muted);
  }
  .refs-list li {
    margin: 3px 0;
    line-height: 1.4;
    word-break: break-all;
  }
  .refs-list a {
    color: var(--muted);
    border: none;
  }

  /* Print fidelity & overflow safety */
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .cover, .section-body th, .section-body pre, .cover-badge, .refs, .section-body blockquote, .cite { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    img, svg { max-width: 100%; height: auto; }
    .section-body { max-width: 100%; overflow: hidden; }
  }
</style>
</head>
<body>
  <section class="cover">
    <div class="cover-brand">
      <span class="cover-brand-mark">A</span>
      <span>ABMSignal</span>
    </div>
    <div class="cover-body">
      <p class="cover-eyebrow">Account-Based Marketing Playbook</p>
      <h1 class="cover-title">${productName} <span class="cover-arrow">&rarr;</span> ${targetCompany}</h1>
      <p class="cover-sub">A launch-ready, hyper-personalized engagement plan built from deep account research, verified contacts, and culturally-adapted outreach.</p>
    </div>
    <div class="cover-meta">
      <div class="cover-meta-item">
        <span class="cover-meta-label">Product</span>
        <span class="cover-meta-value">${productName}</span>
      </div>
      <div class="cover-meta-item">
        <span class="cover-meta-label">Target Account</span>
        <span class="cover-meta-value">${targetCompany}</span>
      </div>
      <div class="cover-meta-item">
        <span class="cover-meta-label">Generated</span>
        <span class="cover-meta-value">${generatedDate}</span>
      </div>
      <div class="cover-meta-item">
        <span class="cover-meta-label">Status</span>
        <span class="cover-badge">Confidential</span>
      </div>
    </div>
  </section>

  <section class="toc">
    <h1 class="toc-heading">Table of Contents</h1>
    <div class="toc-rule"></div>
    <ol class="toc-list">${tocHtml}</ol>
  </section>

  ${sectionsHtml}
</body>
</html>`

    win.document.open()
    win.document.write(doc)
    win.document.close()

    const triggerPrint = () => {
      win.focus()
      win.print()
    }
    const fontsApi = (win.document as Document & { fonts?: { ready: Promise<unknown> } }).fonts
    if (fontsApi?.ready) {
      fontsApi.ready.then(triggerPrint).catch(triggerPrint)
    } else {
      setTimeout(triggerPrint, 600)
    }
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
                        Section {SECTION_META[activeSectionType].order} of 18
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
