'use client'
import { use } from 'react'

import { useState } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { PlaybookStatusBadge } from '@/components/playbook-status-badge'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { mockPlaybook } from '@/lib/mock-data/playbooks'
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

// Sections that exist in mock data, ordered by SECTION_META
const orderedSectionTypes = Object.entries(SECTION_META)
  .sort((a, b) => a[1].order - b[1].order)
  .map(([type]) => type as SectionType)

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
      // Table — collect rows
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

  const playbook = mockPlaybook

  const activeSection = playbook.sections.find(s => s.section_type === activeSectionType)
    ?? { id: activeSectionType, section_type: activeSectionType, title: SECTION_META[activeSectionType].title, content: '', status: 'pending' as const, playbook_id: playbook.id, created_at: '' }

  const currentContent = savedContents[activeSection.id] ?? activeSection.content

  function startEdit() {
    setEditContent(currentContent)
    setEditingSection(activeSection.id)
  }

  function saveEdit() {
    setSavedContents(prev => ({ ...prev, [activeSection.id]: editContent }))
    setEditingSection(null)
  }

  function cancelEdit() {
    setEditingSection(null)
    setEditContent('')
  }

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      {/* App Sidebar */}
      <AppSidebar />

      {/* Main layout */}
      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">

        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0d0d15] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href="/dashboard" className="text-[#a1a1aa] hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="font-heading font-semibold text-white text-base">
                FinFlow AI → Belfius Bank
              </h1>
              <PlaybookStatusBadge status={playbook.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#a1a1aa] hover:text-white hover:bg-white/5 gap-1.5"
            >
              <Share2 className="w-3.5 h-3.5" />
              Share
            </Button>
            <Link href={`/playbook/${id}/review`}>
              <Button
                variant="outline"
                size="sm"
                className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1.5"
              >
                <Star className="w-3.5 h-3.5" />
                Quality Review
              </Button>
            </Link>
            <Button
              size="sm"
              className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Export PDF
            </Button>
          </div>
        </header>

        {/* Content area with sidebar */}
        <div className="flex flex-1 min-h-0 overflow-hidden">

          {/* Section navigation sidebar */}
          <aside className="w-60 flex-shrink-0 border-r border-white/[0.06] bg-[#0d0d15] overflow-y-auto">
            <div className="px-3 py-4">
              <p className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-widest px-3 mb-3">
                Sections
              </p>
              <nav className="space-y-0.5">
                {orderedSectionTypes.map((sectionType) => {
                  const meta = SECTION_META[sectionType]
                  const Icon = SECTION_ICONS[sectionType]
                  const section = playbook.sections.find(s => s.section_type === sectionType)
                  const isActive = activeSectionType === sectionType
                  const status = section?.status ?? 'pending'

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
                          status === 'reviewed' || status === 'complete'
                            ? 'bg-green-500'
                            : status === 'generating'
                            ? 'bg-amber-500 animate-pulse'
                            : 'bg-white/20'
                        }`}
                      />
                    </button>
                  )
                })}
              </nav>
            </div>
          </aside>

          {/* Main content */}
          <main className="flex-1 overflow-y-auto bg-[#0a0a0f]">
            <div className="max-w-4xl mx-auto px-8 py-8">

              {/* Section header */}
              <div className="flex items-start justify-between mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="text-[10px] font-medium text-[#a1a1aa] uppercase tracking-widest">
                      Section {SECTION_META[activeSectionType].order} of 12
                    </span>
                    <Badge
                      variant="outline"
                      className={`text-[10px] px-2 py-0 ${
                        activeSection.status === 'reviewed' || activeSection.status === 'complete'
                          ? 'border-green-500/30 text-green-400 bg-green-500/10'
                          : activeSection.status === 'generating'
                          ? 'border-amber-500/30 text-amber-400 bg-amber-500/10'
                          : 'border-white/20 text-[#a1a1aa]'
                      }`}
                    >
                      {activeSection.status === 'reviewed'
                        ? 'Reviewed'
                        : activeSection.status === 'complete'
                        ? 'Complete'
                        : activeSection.status === 'generating'
                        ? 'Generating...'
                        : 'Pending'}
                    </Badge>
                  </div>
                  <h2 className="font-heading text-2xl font-bold text-white">
                    {SECTION_META[activeSectionType].title}
                  </h2>
                </div>
                {editingSection !== activeSection.id && (
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

              {/* Section content */}
              <div className="rounded-xl border border-white/[0.06] bg-[#141419] p-6">
                {editingSection === activeSection.id ? (
                  <div className="space-y-4">
                    <textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="w-full h-96 bg-[#0a0a0f] border border-white/10 rounded-lg p-4 text-sm text-[#a1a1aa] font-mono resize-none focus:outline-none focus:border-[#339af0]/40 leading-relaxed"
                      placeholder="Section content (Markdown supported)..."
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        onClick={saveEdit}
                        className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Save Changes
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={cancelEdit}
                        className="text-[#a1a1aa] hover:text-white gap-1.5"
                      >
                        <X className="w-3.5 h-3.5" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : currentContent ? (
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

              {/* Section metadata */}
              {activeSection.created_at && (
                <div className="flex items-center gap-4 mt-4 px-1">
                  <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                    <Bot className="w-3.5 h-3.5" />
                    <span>Generated by Writer Agent</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-green-500/70" />
                    <span>Reviewed by Quality Agent</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa]">
                    <Clock className="w-3.5 h-3.5" />
                    <span>14 min ago</span>
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
