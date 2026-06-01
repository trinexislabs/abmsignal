'use client'

import { useState, useEffect } from 'react'
import { use } from 'react'
import Link from 'next/link'
import { AppSidebar, MobileSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { Contact, ContactVerificationStatus, ContactConfidence, PersonalizationSignal, DirectQuote } from '@/types'
import {
  AlertTriangle,
  CheckCircle2,
  Flag,
  X,
  ChevronRight,
  ExternalLink,
  Download,
  UserPlus,
  ChevronDown,
  ChevronUp,
  Check,
  Quote,
  Zap,
} from 'lucide-react'

interface ResearchedContact {
  id: string
  name: string
  title: string
  department: string
  confidence: ContactConfidence
  source: string
  linkedinUrl: string
  status: ContactVerificationStatus
  notes?: string
  personalization_signals?: PersonalizationSignal[]
  direct_quotes?: DirectQuote[]
}

const CONFIDENCE_CONFIG: Record<ContactConfidence, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  low: { label: 'Low', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const STATUS_CONFIG: Record<ContactVerificationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-white/10 text-[#9CA3AF] border-[#374151]/60' },
  confirmed: { label: 'Confirmed', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  needs_review: { label: 'Needs Review', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  removed: { label: 'Removed', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

type FilterType = 'all' | ContactVerificationStatus

export default function ContactsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const [contacts, setContacts] = useState<ResearchedContact[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchContacts() {
      try {
        const res = await fetch(`/api/playbooks/${id}/contacts`)
        if (res.ok) {
          const data = await res.json()
          const fetched: ResearchedContact[] = (data.data || []).map((c: Contact) => ({
            id: c.id,
            name: c.name,
            title: c.title,
            department: c.title?.split(',').pop()?.trim() || 'Executive',
            confidence: c.confidence || 'medium',
            source: c.source || 'AI Research',
            linkedinUrl: c.linkedin_url || '',
            status: c.verification_status || 'pending',
            notes: c.notes,
            personalization_signals: c.personalization_signals,
            direct_quotes: c.direct_quotes,
          }))
          setContacts(fetched)
        }
      } catch {
        // Contacts will remain empty
      } finally {
        setLoading(false)
      }
    }
    fetchContacts()
  }, [id])
  const [filter, setFilter] = useState<FilterType>('all')
  const [showAddForm, setShowAddForm] = useState(false)
  const [newContact, setNewContact] = useState({
    name: '',
    title: '',
    linkedinUrl: '',
    email: '',
    confidence: 'medium' as ContactConfidence,
    source: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [expandedContact, setExpandedContact] = useState<string | null>(null)

  const handleContinue = async () => {
    if (!allActioned || submitting) return
    setSubmitting(true)
    try {
      const reviewedContacts = contacts.map(c => ({
        id: c.id,
        name: c.name,
        title: c.title,
        confidence: c.confidence,
        source: c.source,
        linkedin_url: c.linkedinUrl,
        verification_status: c.status,
        playbook_id: id,
      }))
      await fetch(`/api/playbooks/${id}/contacts/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contacts: reviewedContacts }),
      })
    } catch {
      // Continue anyway
    }
    // Redirect to processing page so user sees writing + reviewing progress
    window.location.href = `/playbook/${id}/processing`
  }

  const confirmed = contacts.filter(c => c.status === 'confirmed').length
  const pending = contacts.filter(c => c.status === 'pending').length
  const flagged = contacts.filter(c => c.status === 'needs_review').length
  const removed = contacts.filter(c => c.status === 'removed').length
  const total = contacts.length

  const allActioned = pending === 0
  const reviewed = total - pending

  const filteredContacts = filter === 'all'
    ? contacts
    : contacts.filter(c => c.status === filter)

  // Show loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center">
        <div className="text-[#9CA3AF] text-sm">Loading contacts...</div>
      </div>
    )
  }

  // Show empty state if no contacts
  if (contacts.length === 0) {
    return (
      <div className="min-h-screen bg-[#0B0F13] flex items-center justify-center">
        <div className="text-center">
          <div className="text-[#9CA3AF] text-sm mb-2">No contacts found yet</div>
          <div className="text-[#71717a] text-xs">The AI agents are still researching. Please wait...</div>
        </div>
      </div>
    )
  }

  function setStatus(id: string, status: ContactVerificationStatus) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, status } : c))
  }

  function approveAllHighConfidence() {
    setContacts(prev =>
      prev.map(c =>
        c.confidence === 'high' && c.status === 'pending'
          ? { ...c, status: 'confirmed' }
          : c
      )
    )
  }

  function addContact() {
    if (!newContact.name || !newContact.title) return
    const contact: ResearchedContact = {
      id: `c_new_${Date.now()}`,
      name: newContact.name,
      title: newContact.title,
      department: 'Unknown',
      confidence: newContact.confidence,
      source: newContact.source || 'Manual',
      linkedinUrl: newContact.linkedinUrl || '#',
      status: 'pending',
    }
    setContacts(prev => [...prev, contact])
    setNewContact({ name: '', title: '', linkedinUrl: '', email: '', confidence: 'medium', source: '' })
    setShowAddForm(false)
  }

  return (
    <div className="flex h-screen bg-[#0B0F13] overflow-hidden">
      <AppSidebar />

      <div className="flex flex-col flex-1 min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="flex items-center justify-between gap-3 h-14 px-4 sm:px-6 border-b border-[#374151] bg-[#0B0F13] flex-shrink-0">
          <div className="flex items-center gap-2 sm:gap-3 min-w-0">
            <MobileSidebar />
            <Link href={`/playbook/${id}`} className="text-[#9CA3AF] hover:text-white transition-colors flex-shrink-0">
              <ChevronRight className="w-4 h-4 rotate-180" />
            </Link>
            <h1 className="font-heading font-semibold text-white text-sm sm:text-base truncate">
              Contact Review
            </h1>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] flex-shrink-0 hidden sm:inline-flex">
              Checkpoint Required
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#9CA3AF] hover:text-white gap-1.5 flex-shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Export for Verification</span>
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-40 sm:pb-32">

            {/* Warning banner */}
            <div className="flex items-start gap-3 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 mb-6">
              <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-300">Mandatory Checkpoint</p>
                <p className="text-sm text-amber-400/80 mt-0.5">
                  Review all contacts before proceeding to playbook generation. The AI agent will pause until this step is complete.
                </p>
              </div>
            </div>

            {/* Progress + quick actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Contact Review</h2>
                <p className="text-sm text-[#9CA3AF] mt-0.5">
                  {reviewed} of {total} contacts reviewed
                </p>
              </div>
              <Button
                onClick={approveAllHighConfidence}
                size="sm"
                className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-1.5 w-full sm:w-auto"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve All High Confidence
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 mb-5 p-1 bg-[#111827] rounded-lg border border-[#374151] w-full sm:w-fit overflow-x-auto scrollbar-thin">
              {(['all', 'pending', 'confirmed', 'needs_review', 'removed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors whitespace-nowrap flex-shrink-0 ${
                    filter === f
                      ? 'bg-[#0B3D2E] text-white border border-[#10B981]/20'
                      : 'text-[#9CA3AF] hover:text-white'
                  }`}
                >
                  {f === 'all' ? 'All' : f === 'needs_review' ? 'Needs Review' : f.charAt(0).toUpperCase() + f.slice(1)}
                  <span className="ml-1.5 text-[10px] opacity-70">
                    {f === 'all' ? total : contacts.filter(c => c.status === f).length}
                  </span>
                </button>
              ))}
            </div>

            {/* Contact table */}
            <div className="rounded-xl border border-[#374151] bg-[#111827] overflow-x-auto mb-5">
              <table className="w-full min-w-[720px]">
                <thead>
                  <tr className="border-b border-[#374151]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Title</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Department</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Confidence</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Source</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, idx) => {
                    const hasDetails = (contact.personalization_signals?.length ?? 0) > 0 || (contact.direct_quotes?.length ?? 0) > 0
                    const isExpanded = expandedContact === contact.id
                    return (
                      <>
                        <tr
                          key={contact.id}
                          className={`border-b border-[#1F2937] transition-colors hover:bg-white/[0.02] ${
                            contact.status === 'removed' ? 'opacity-50' : ''
                          } ${idx === filteredContacts.length - 1 && !isExpanded ? 'border-b-0' : ''}`}
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium text-white">{contact.name}</span>
                              <a
                                href={contact.linkedinUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-[#10B981] hover:text-[#10B981]/80 transition-colors"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                              {hasDetails && (
                                <button
                                  onClick={() => setExpandedContact(isExpanded ? null : contact.id)}
                                  className="text-[#9CA3AF] hover:text-white transition-colors"
                                  title={isExpanded ? 'Hide details' : 'Show signals & quotes'}
                                >
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-[#9CA3AF]">{contact.title}</td>
                          <td className="px-4 py-3 text-sm text-[#9CA3AF]">{contact.department}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0 ${CONFIDENCE_CONFIG[contact.confidence].className}`}
                            >
                              {CONFIDENCE_CONFIG[contact.confidence].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-[#9CA3AF]">{contact.source}</td>
                          <td className="px-4 py-3">
                            <Badge
                              variant="outline"
                              className={`text-[10px] px-2 py-0 ${STATUS_CONFIG[contact.status].className}`}
                            >
                              {STATUS_CONFIG[contact.status].label}
                            </Badge>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => setStatus(contact.id, 'confirmed')}
                                disabled={contact.status === 'confirmed'}
                                title="Confirm"
                                className={`p-1.5 rounded-md transition-colors ${
                                  contact.status === 'confirmed'
                                    ? 'text-green-400 bg-green-500/10 cursor-default'
                                    : 'text-[#9CA3AF] hover:text-green-400 hover:bg-green-500/10'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setStatus(contact.id, 'needs_review')}
                                disabled={contact.status === 'needs_review'}
                                title="Flag for review"
                                className={`p-1.5 rounded-md transition-colors ${
                                  contact.status === 'needs_review'
                                    ? 'text-amber-400 bg-amber-500/10 cursor-default'
                                    : 'text-[#9CA3AF] hover:text-amber-400 hover:bg-amber-500/10'
                                }`}
                              >
                                <Flag className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setStatus(contact.id, 'removed')}
                                disabled={contact.status === 'removed'}
                                title="Remove"
                                className={`p-1.5 rounded-md transition-colors ${
                                  contact.status === 'removed'
                                    ? 'text-red-400 bg-red-500/10 cursor-default'
                                    : 'text-[#9CA3AF] hover:text-red-400 hover:bg-red-500/10'
                                }`}
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                        {isExpanded && hasDetails && (
                          <tr key={`${contact.id}-detail`} className="border-b border-[#1F2937] bg-white/[0.01]">
                            <td colSpan={7} className="px-4 py-4">
                              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                                {contact.personalization_signals && contact.personalization_signals.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Zap className="w-3.5 h-3.5 text-[#10B981]" />
                                      <span className="text-xs font-semibold text-white">Personalization Signals</span>
                                    </div>
                                    <ul className="space-y-1.5">
                                      {contact.personalization_signals.map((sig, si) => (
                                        <li key={si} className="flex items-start gap-2">
                                          <span className="text-[#10B981] mt-1 text-xs">•</span>
                                          <div>
                                            <span className="text-xs text-[#9CA3AF]">{sig.signal}</span>
                                            {sig.source_url && (
                                              <a
                                                href={sig.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="ml-1.5 inline-flex items-center gap-0.5 text-[10px] text-[#10B981] hover:underline"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                source
                                              </a>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                                {contact.direct_quotes && contact.direct_quotes.length > 0 && (
                                  <div>
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <Quote className="w-3.5 h-3.5 text-[#10B981]" />
                                      <span className="text-xs font-semibold text-white">Direct Quotes</span>
                                    </div>
                                    <ul className="space-y-2">
                                      {contact.direct_quotes.map((dq, di) => (
                                        <li key={di} className="border-l-2 border-[#10B981]/30 pl-3">
                                          <p className="text-xs text-white/80 italic">&ldquo;{dq.quote}&rdquo;</p>
                                          <div className="flex items-center gap-1.5 mt-0.5">
                                            <span className="text-[10px] text-[#9CA3AF]">{dq.context}</span>
                                            {dq.source_url && (
                                              <a
                                                href={dq.source_url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-0.5 text-[10px] text-[#10B981] hover:underline"
                                              >
                                                <ExternalLink className="w-2.5 h-2.5" />
                                                verify
                                              </a>
                                            )}
                                          </div>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </td>
                          </tr>
                        )}
                      </>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Add Contact form */}
            <div className="rounded-xl border border-[#374151] bg-[#111827] overflow-hidden">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#10B981]" />
                  <span className="text-sm font-medium text-white">Add Contact Manually</span>
                </div>
                {showAddForm
                  ? <ChevronUp className="w-4 h-4 text-[#9CA3AF]" />
                  : <ChevronDown className="w-4 h-4 text-[#9CA3AF]" />
                }
              </button>

              {showAddForm && (
                <div className="px-5 pb-5 border-t border-[#374151]">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40"
                        placeholder="Sophie Vanderberg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Title *</label>
                      <input
                        type="text"
                        value={newContact.title}
                        onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40"
                        placeholder="Head of Payments Technology"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">LinkedIn URL</label>
                      <input
                        type="url"
                        value={newContact.linkedinUrl}
                        onChange={e => setNewContact(p => ({ ...p, linkedinUrl: e.target.value }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Email</label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40"
                        placeholder="s.vanderberg@belfius.be"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Confidence Level</label>
                      <select
                        value={newContact.confidence}
                        onChange={e => setNewContact(p => ({ ...p, confidence: e.target.value as ContactConfidence }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#10B981]/40"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#9CA3AF] mb-1.5">Source Note</label>
                      <input
                        type="text"
                        value={newContact.source}
                        onChange={e => setNewContact(p => ({ ...p, source: e.target.value }))}
                        className="w-full bg-[#0B0F13] border border-[#374151] rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#10B981]/40"
                        placeholder="LinkedIn, Web, Manual research..."
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={addContact}
                      size="sm"
                      className="bg-[#10B981] hover:bg-[#10B981]/90 text-white gap-1.5"
                    >
                      <UserPlus className="w-3.5 h-3.5" />
                      Add Contact
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Sticky bottom bar */}
        <div className="flex-shrink-0 border-t border-[#374151] bg-[#0B0F13] px-4 sm:px-6 py-4">
          <div className="max-w-6xl mx-auto">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#10B981] rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center flex-wrap gap-x-4 gap-y-1.5 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[#9CA3AF]">{confirmed} confirmed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="text-[#9CA3AF]">{pending} pending</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[#9CA3AF]">{flagged} flagged</span>
                </span>
                {removed > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[#9CA3AF]">{removed} removed</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!allActioned && (
                  <p className="text-xs text-[#9CA3AF]">
                    {pending} contact{pending !== 1 ? 's' : ''} still pending review
                  </p>
                )}
                {allActioned && (
                  <div className="flex items-center gap-1.5 text-green-400 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All contacts reviewed</span>
                  </div>
                )}
                <button
                  onClick={handleContinue}
                  disabled={!allActioned || submitting}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                    allActioned && !submitting
                      ? 'bg-[#10B981] hover:bg-[#10B981]/90 text-white cursor-pointer'
                      : 'bg-white/10 text-white/40 cursor-not-allowed'
                  }`}
                >
                  {submitting ? 'Starting generation...' : 'Continue to Playbook'}
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
