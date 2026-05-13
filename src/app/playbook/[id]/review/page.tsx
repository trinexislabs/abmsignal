'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  ChevronRight,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Download,
  Users,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  MessageSquare,
  Send,
} from 'lucide-react'

interface QualityCheckItem {
  number: number
  name: string
  status: 'pass' | 'warn' | 'fail'
  detail: string
  category: string
}

const QUALITY_CHECKS: QualityCheckItem[] = [
  {
    number: 1,
    name: 'Contact accuracy verified',
    status: 'pass',
    detail: 'All confirmed contacts cross-referenced via 2+ sources. LinkedIn profiles verified as of March 2025. 5/5 contacts have active profiles.',
    category: 'Accuracy',
  },
  {
    number: 2,
    name: 'Executive alignment',
    status: 'pass',
    detail: 'Outreach maps to confirmed strategic initiatives. "Belfius 2030" transformation program, €500M technology commitment, and NBB compliance deadline all referenced in sequences.',
    category: 'Relevance',
  },
  {
    number: 3,
    name: 'Cultural adaptation',
    status: 'pass',
    detail: 'Belgian banking norms applied throughout. Formal tone enforced (no first names in initial contact). Dutch/French bilingual availability noted. State-bank procurement requirements addressed.',
    category: 'Cultural Fit',
  },
  {
    number: 4,
    name: 'Regulatory compliance',
    status: 'pass',
    detail: 'PSD2/PSD3 references accurate. NBB regulatory update dated correctly to May 2025. MiFID II compliance verified against current directive version. Basel III references use correct capital ratios.',
    category: 'Compliance',
  },
  {
    number: 5,
    name: 'Competitive intel',
    status: 'pass',
    detail: 'Kyriba identified as active evaluation via CRM intelligence. Murex confirmed as incumbent via LinkedIn + job posting analysis. 3 specific battle cards written. Featurespace competitor card complete and sourced.',
    category: 'Accuracy',
  },
  {
    number: 6,
    name: '"Why Now" signals',
    status: 'warn',
    detail: '4 signals identified but 1 needs date verification. The Belfius earnings call reference cites "Q1 2026" — researcher needs to confirm exact date. Signal itself is credible; date stamp requires human verification before outreach.',
    category: 'Relevance',
  },
  {
    number: 7,
    name: 'Org map completeness',
    status: 'pass',
    detail: 'Buying committee identified with decision-making flow. Economic buyer (CFO), Technical buyer (CIO), Champion (Head Treasury Tech), End User (VP Finance Ops) all mapped. Secondary influencers in regulatory affairs also included.',
    category: 'Completeness',
  },
  {
    number: 8,
    name: 'Personalization depth',
    status: 'pass',
    detail: 'Each outreach sequence references account-specific intel. Sophie sequence references Euroclear background. CFO sequence references Belgian Finance Forum speech. CIO sequence references Azure-first commitment. Zero generic templates.',
    category: 'Personalization',
  },
  {
    number: 9,
    name: 'Value prop alignment',
    status: 'pass',
    detail: 'FinFlow AI positioning mapped to Belfius stated priorities. NBB pre-certification addresses regulatory concern. Azure-native deployment addresses CIO stack preference. 90-day time-to-value addresses procurement pressure.',
    category: 'Effectiveness',
  },
  {
    number: 10,
    name: 'Reference validation',
    status: 'fail',
    detail: '2 web sources returned 404 and need replacement. The Belgian Finance Forum recording URL (cited in Why Now section) and one Belfius blog post URL are no longer accessible. Content is valid — sources need updating.',
    category: 'Integrity',
  },
  {
    number: 11,
    name: 'Tone consistency',
    status: 'pass',
    detail: 'Professional formal tone maintained throughout all sections and email sequences. Belgian enterprise standard applied. No informal language, contractions kept minimal. Consistent across 3 outreach tracks.',
    category: 'Quality',
  },
  {
    number: 12,
    name: 'Grammar & fluency',
    status: 'pass',
    detail: 'No errors detected in English sequences. All text reviewed by grammar model. Belgian-specific terms (NBB, Nationale Bank van België) spelled correctly. Financial terminology consistent.',
    category: 'Quality',
  },
  {
    number: 13,
    name: 'CTA clarity',
    status: 'pass',
    detail: 'Each email has one clear call-to-action. Champion sequence: 20-minute discovery call. CFO sequence: 30-minute executive briefing. CIO sequence: 15-minute technical overview. All CTAs are low-friction and stage-appropriate.',
    category: 'Effectiveness',
  },
  {
    number: 14,
    name: 'Follow-up logic',
    status: 'pass',
    detail: 'Cadence spacing is optimal. Day 1: Initial outreach. Day 4: Follow-up with case study. Day 7: Value-add content. Day 14: Break-up email. Timing validated against Belgian business calendar (no conflicts with Easter 2025 break).',
    category: 'Effectiveness',
  },
  {
    number: 15,
    name: 'Content asset links',
    status: 'warn',
    detail: '2 assets referenced in outreach sequences but not yet uploaded to asset library. "KBC Case Study PDF" and "Azure Architecture Diagram" are mentioned in email bodies but asset URLs are placeholders. Upload before sending.',
    category: 'Completeness',
  },
  {
    number: 16,
    name: 'Measurement framework',
    status: 'pass',
    detail: 'KPIs defined and trackable. Phase 1 metrics (FX reconciliation time, forecast accuracy) measurable via system logs. Phase 2 metrics tied to business outcomes. ROI model uses publicly sourced cost figures from Belfius 2024 annual report.',
    category: 'Practicality',
  },
]

const PASS_COUNT = QUALITY_CHECKS.filter(c => c.status === 'pass').length
const WARN_COUNT = QUALITY_CHECKS.filter(c => c.status === 'warn').length
const FAIL_COUNT = QUALITY_CHECKS.filter(c => c.status === 'fail').length
const SCORE = PASS_COUNT

const PLAYBOOK_SECTIONS = [
  'Executive Summary',
  'Account Intelligence Dossier',
  'Buying Committee & Org Map',
  '"Why Now" Signal Analysis',
  'Competitive Landscape',
  'Cultural & Regulatory Context',
  'Outreach Strategy',
  'Hyper-Personalized Sequences',
  'Battle Cards & Objection Handling',
  'Content Asset Strategy',
  'Measurement Framework',
  'Appendix',
]

export default function QualityReviewPage({ params }: { params: { id: string } }) {
  const [expandedCheck, setExpandedCheck] = useState<number | null>(null)
  const [feedback, setFeedback] = useState('')
  const [selectedSections, setSelectedSections] = useState<string[]>([])
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false)

  function toggleSection(section: string) {
    setSelectedSections(prev =>
      prev.includes(section) ? prev.filter(s => s !== section) : [...prev, section]
    )
  }

  function submitFeedback() {
    if (!feedback.trim()) return
    setFeedbackSubmitted(true)
    setFeedback('')
    setSelectedSections([])
  }

  const overallScore = SCORE === 16 ? 'Excellent' : SCORE >= 14 ? 'Good' : SCORE >= 10 ? 'Fair' : 'Needs Work'
  const scoreColor = SCORE >= 14
    ? 'text-amber-400 border-amber-500/30 bg-amber-500/10'
    : SCORE >= 10
    ? 'text-orange-400 border-orange-500/30 bg-orange-500/10'
    : 'text-red-400 border-red-500/30 bg-red-500/10'

  return (
    <div className="flex h-screen bg-[#0a0a0f] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between h-14 px-6 border-b border-white/[0.06] bg-[#0d0d15] flex-shrink-0">
          <div className="flex items-center gap-3">
            <Link href={`/playbook/${params.id}`} className="text-[#a1a1aa] hover:text-white transition-colors">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
            <h1 className="font-heading font-semibold text-white text-base">
              Quality Review — 16-Point Checklist
            </h1>
            <Badge
              variant="outline"
              className={`text-xs font-semibold px-2.5 py-0.5 ${scoreColor}`}
            >
              {SCORE}/16 — {overallScore}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="text-[#a1a1aa] hover:text-white gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download for Review
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="border-[#339af0]/30 text-[#339af0] hover:bg-[#339af0]/10 gap-1.5"
            >
              <Users className="w-3.5 h-3.5" />
              Request SME Review
            </Button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-5xl mx-auto px-6 py-6">

            {/* Score summary */}
            <div className="grid grid-cols-3 gap-4 mb-8">
              <div className="rounded-xl border border-green-500/20 bg-green-500/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-green-500/15 flex items-center justify-center flex-shrink-0">
                  <CheckCircle2 className="w-5 h-5 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-green-400">{PASS_COUNT}</p>
                  <p className="text-xs text-[#a1a1aa]">Checks passed</p>
                </div>
              </div>
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-amber-500/15 flex items-center justify-center flex-shrink-0">
                  <AlertTriangle className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-amber-400">{WARN_COUNT}</p>
                  <p className="text-xs text-[#a1a1aa]">Warnings</p>
                </div>
              </div>
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-red-500/15 flex items-center justify-center flex-shrink-0">
                  <XCircle className="w-5 h-5 text-red-400" />
                </div>
                <div>
                  <p className="text-2xl font-heading font-bold text-red-400">{FAIL_COUNT}</p>
                  <p className="text-xs text-[#a1a1aa]">Failed</p>
                </div>
              </div>
            </div>

            {/* Quality checks grid */}
            <h2 className="font-heading text-base font-semibold text-white mb-4">Quality Checks</h2>
            <div className="grid grid-cols-2 gap-3 mb-8">
              {QUALITY_CHECKS.map((check) => {
                const isExpanded = expandedCheck === check.number
                const Icon =
                  check.status === 'pass'
                    ? CheckCircle2
                    : check.status === 'warn'
                    ? AlertTriangle
                    : XCircle
                const iconColor =
                  check.status === 'pass'
                    ? 'text-green-400'
                    : check.status === 'warn'
                    ? 'text-amber-400'
                    : 'text-red-400'
                const borderColor =
                  check.status === 'pass'
                    ? 'border-white/[0.06]'
                    : check.status === 'warn'
                    ? 'border-amber-500/20'
                    : 'border-red-500/20'

                return (
                  <div
                    key={check.number}
                    className={`rounded-xl border ${borderColor} bg-[#141419] overflow-hidden`}
                  >
                    <button
                      onClick={() => setExpandedCheck(isExpanded ? null : check.number)}
                      className="w-full flex items-start gap-3 px-4 py-3.5 hover:bg-white/[0.02] transition-colors text-left"
                    >
                      <Icon className={`w-4 h-4 ${iconColor} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[10px] font-medium text-[#a1a1aa]">#{check.number}</span>
                          <Badge
                            variant="outline"
                            className="text-[9px] px-1.5 py-0 border-white/10 text-[#a1a1aa]"
                          >
                            {check.category}
                          </Badge>
                        </div>
                        <p className="text-sm font-medium text-white leading-snug">{check.name}</p>
                      </div>
                      {isExpanded
                        ? <ChevronUp className="w-3.5 h-3.5 text-[#a1a1aa] flex-shrink-0 mt-0.5" />
                        : <ChevronDown className="w-3.5 h-3.5 text-[#a1a1aa] flex-shrink-0 mt-0.5" />
                      }
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-white/[0.04]">
                        <p className="text-xs text-[#a1a1aa] leading-relaxed mt-3">{check.detail}</p>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* SME Feedback section */}
            <div className="rounded-xl border border-white/[0.06] bg-[#141419] p-5 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <MessageSquare className="w-4 h-4 text-[#339af0]" />
                <h3 className="font-heading font-semibold text-white">SME Feedback & Re-generation</h3>
              </div>

              {feedbackSubmitted && (
                <div className="mb-4 p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                    <p className="text-sm text-green-300">Feedback submitted. Writer Agent will incorporate your notes in the next revision.</p>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <label className="block text-xs font-medium text-[#a1a1aa] mb-2">
                  Add feedback or comments for the Writer Agent
                </label>
                <textarea
                  value={feedback}
                  onChange={e => setFeedback(e.target.value)}
                  rows={4}
                  className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40 resize-none leading-relaxed"
                  placeholder="e.g. The Why Now signals need to be more specific about timing. Please verify the earnings call date and update the signal accordingly. Also consider adding a signal about Belfius's recent SWIFT messaging partnership..."
                />
              </div>

              <div className="mb-4">
                <label className="block text-xs font-medium text-[#a1a1aa] mb-2">
                  Select sections to re-generate (optional)
                </label>
                <div className="flex flex-wrap gap-2">
                  {PLAYBOOK_SECTIONS.map(section => (
                    <button
                      key={section}
                      onClick={() => toggleSection(section)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                        selectedSections.includes(section)
                          ? 'bg-[#1e3a5f] border-[#339af0]/30 text-[#339af0]'
                          : 'bg-white/5 border-white/10 text-[#a1a1aa] hover:text-white hover:border-white/20'
                      }`}
                    >
                      {section}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Button
                  onClick={submitFeedback}
                  size="sm"
                  className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  Submit Feedback
                </Button>
                {selectedSections.length > 0 && (
                  <Button
                    onClick={submitFeedback}
                    variant="outline"
                    size="sm"
                    className="border-white/10 bg-white/5 text-white hover:bg-white/10 gap-1.5"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Request Targeted Re-generation ({selectedSections.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Feedback history */}
            <div className="rounded-xl border border-white/[0.06] bg-[#141419] p-5">
              <h3 className="font-heading font-semibold text-white text-sm mb-3">Feedback History</h3>
              <div className="flex flex-col items-center justify-center py-8 text-center">
                <MessageSquare className="w-8 h-8 text-white/20 mb-3" />
                <p className="text-sm text-[#a1a1aa]">No feedback submitted yet</p>
                <p className="text-xs text-white/30 mt-1">Feedback and revision history will appear here</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}
