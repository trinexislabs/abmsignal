'use client'

import { use, useEffect, useState } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { PlaybookStatusBadge } from '@/components/playbook-status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { SECTION_META, type SectionType } from '@/types'
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

// Map API section type to SectionType — handles orchestrator variant names
function mapSectionType(type: string): SectionType {
  const map: Record<string, SectionType> = {
    executive_summary: 'executive_summary',
    account_intelligence: 'account_intelligence',
    buying_committee: 'buying_committee',
    why_now: 'why_now',
    competitive_landscape: 'competitive_landscape',
    cultural_context: 'cultural_context',
    outreach_strategy: 'outreach_strategy',
    // canonical
    personalized_sequences: 'personalized_sequences',
    battle_cards: 'battle_cards',
    content_strategy: 'content_strategy',
    measurement_framework: 'measurement_framework',
    appendix: 'appendix',
    // orchestrator variant names
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

function renderMarkdown(content: string): React.ReactNode {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h2 key={i} className="font-heading text-lg font-semibold text-white mt-6 mb-3 first:mt-0">
          {line.slice(3)}
        </h2>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h3 key={i} className="font-heading text-base font-semibold text-white/90 mt-4 mb-2">
          {line.slice(4)}
        </h3>
      )
    } else if (line.startsWith('**') && line.endsWith('**')) {
      elements.push(
        <p key={i} className="font-semibold text-white/90 mb-1">
          {line.slice(2, -2)}
        </p>
      )
    } else if (line.startsWith('- ') || line.startsWith('• ')) {
      elements.push(
        <li key={i} className="text-[#a1a1aa] text-sm ml-4 mb-1 list-none flex gap-2">
          <span className="text-[#339af0] mt-1.5 flex-shrink-0">•</span>
          <span dangerouslySetInnerHTML={{ __html: line.slice(2).replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
        </li>
      )
    } else if (line.startsWith('> ')) {
      elements.push(
        <blockquote key={i} className="border-l-2 border-[#339af0]/40 pl-4 my-2 text-[#a1a1aa] text-sm italic">
          {line.slice(2)}
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
                      <td key={ci} className="px-3 py-2 text-[#a1a1aa] border border-white/10" dangerouslySetInnerHTML={{ __html: cell.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }} />
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
        <p key={i} className="text-[#a1a1aa] text-sm leading-relaxed mb-2"
          dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-white/90">$1</strong>') }}
        />
      )
    }
    i++
  }

  return <>{elements}</>
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

  // Map API sections to a lookup by section_type
  const sectionsByType = new Map<SectionType, ApiSection>()
  for (const s of playbook.sections) {
    sectionsByType.set(mapSectionType(s.type), s)
  }

  const activeSection = sectionsByType.get(activeSectionType)
  const currentContent = activeSection ? (savedContents[activeSection.id] ?? activeSection.content) : ''
  const hasContent = currentContent && currentContent.trim().length > 0

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
        // Minimal markdown → HTML for print
        const htmlContent = content
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
                      }}
                      className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-left transition-all duration-150 group ${
                        isActive
                          ? 'bg-[#1e3a5f] border border-[#339af0]/20 text-white'
                          : 'text-[#a1a1aa] hover:text-white hover:bg-white/5'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${isActive ? 'text-[#339af0]' : 'text-[#a1a1aa] group-hover:text-white/70'}`} />
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
              </nav>
            </div>
          </aside>

          <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
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
                    {renderMarkdown(currentContent)}
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
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}