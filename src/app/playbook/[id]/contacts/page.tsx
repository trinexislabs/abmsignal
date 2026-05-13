'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AppSidebar } from '@/components/app-sidebar'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import type { ContactVerificationStatus, ContactConfidence } from '@/types'
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
} from 'lucide-react'

interface MockContact {
  id: string
  name: string
  title: string
  department: string
  confidence: ContactConfidence
  source: string
  linkedinUrl: string
  status: ContactVerificationStatus
}

const INITIAL_CONTACTS: MockContact[] = [
  {
    id: 'c1',
    name: 'Sophie Vanderberg',
    title: 'Chief Digital Officer',
    department: 'C-Suite',
    confidence: 'high',
    source: 'LinkedIn',
    linkedinUrl: 'https://linkedin.com/in/sophie-vanderberg',
    status: 'pending',
  },
  {
    id: 'c2',
    name: 'Jan De Smet',
    title: 'Head of Payments Technology',
    department: 'Technology',
    confidence: 'high',
    source: 'LinkedIn + Web',
    linkedinUrl: 'https://linkedin.com/in/jan-de-smet',
    status: 'pending',
  },
  {
    id: 'c3',
    name: 'Marie Claes',
    title: 'VP Digital Innovation',
    department: 'Innovation',
    confidence: 'medium',
    source: 'LinkedIn',
    linkedinUrl: 'https://linkedin.com/in/marie-claes',
    status: 'pending',
  },
  {
    id: 'c4',
    name: 'Thomas Leemans',
    title: 'Senior Director, Core Banking',
    department: 'Technology',
    confidence: 'high',
    source: 'LinkedIn',
    linkedinUrl: 'https://linkedin.com/in/thomas-leemans',
    status: 'pending',
  },
  {
    id: 'c5',
    name: 'Adrien Fontaine',
    title: 'Head of Enterprise Architecture',
    department: 'IT',
    confidence: 'medium',
    source: 'LinkedIn',
    linkedinUrl: 'https://linkedin.com/in/adrien-fontaine',
    status: 'pending',
  },
  {
    id: 'c6',
    name: 'Isabelle Moreau',
    title: 'Chief Risk Officer',
    department: 'Risk & Compliance',
    confidence: 'low',
    source: 'Web only',
    linkedinUrl: 'https://linkedin.com/search/results/people/?keywords=isabelle+moreau+belfius',
    status: 'pending',
  },
  {
    id: 'c7',
    name: 'Kevin Storms',
    title: 'Head of Data & Analytics',
    department: 'Data',
    confidence: 'high',
    source: 'LinkedIn',
    linkedinUrl: 'https://linkedin.com/in/kevin-storms',
    status: 'pending',
  },
  {
    id: 'c8',
    name: 'Nathalie Dupont',
    title: 'VP Strategic Partnerships',
    department: 'Strategy',
    confidence: 'low',
    source: 'Web only',
    linkedinUrl: 'https://linkedin.com/search/results/people/?keywords=nathalie+dupont+belfius',
    status: 'pending',
  },
]

const CONFIDENCE_CONFIG: Record<ContactConfidence, { label: string; className: string }> = {
  high: { label: 'High', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  medium: { label: 'Medium', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  low: { label: 'Low', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

const STATUS_CONFIG: Record<ContactVerificationStatus, { label: string; className: string }> = {
  pending: { label: 'Pending', className: 'bg-white/10 text-[#a1a1aa] border-white/20' },
  confirmed: { label: 'Confirmed', className: 'bg-green-500/15 text-green-400 border-green-500/30' },
  needs_review: { label: 'Needs Review', className: 'bg-amber-500/15 text-amber-400 border-amber-500/30' },
  removed: { label: 'Removed', className: 'bg-red-500/15 text-red-400 border-red-500/30' },
}

type FilterType = 'all' | ContactVerificationStatus

export default function ContactsPage({ params }: { params: { id: string } }) {
  const [contacts, setContacts] = useState<MockContact[]>(INITIAL_CONTACTS)
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
    const contact: MockContact = {
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
              Contact Review
            </h1>
            <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px]">
              Checkpoint Required
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="text-[#a1a1aa] hover:text-white gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Export for Verification
          </Button>
        </header>

        <div className="flex-1 overflow-y-auto">
          <div className="max-w-6xl mx-auto px-6 py-6 pb-32">

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
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="font-heading text-xl font-bold text-white">Contact Review</h2>
                <p className="text-sm text-[#a1a1aa] mt-0.5">
                  {reviewed} of {total} contacts reviewed
                </p>
              </div>
              <Button
                onClick={approveAllHighConfidence}
                size="sm"
                className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve All High Confidence
              </Button>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-1 mb-5 p-1 bg-[#141419] rounded-lg border border-white/[0.06] w-fit">
              {(['all', 'pending', 'confirmed', 'needs_review', 'removed'] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${
                    filter === f
                      ? 'bg-[#1e3a5f] text-white border border-[#339af0]/20'
                      : 'text-[#a1a1aa] hover:text-white'
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
            <div className="rounded-xl border border-white/[0.06] bg-[#141419] overflow-hidden mb-5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/[0.06]">
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Name</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Title</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Department</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Confidence</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Source</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Status</th>
                    <th className="text-left px-4 py-3 text-[10px] font-semibold text-[#a1a1aa] uppercase tracking-widest">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((contact, idx) => (
                    <tr
                      key={contact.id}
                      className={`border-b border-white/[0.04] transition-colors hover:bg-white/[0.02] ${
                        contact.status === 'removed' ? 'opacity-50' : ''
                      } ${idx === filteredContacts.length - 1 ? 'border-b-0' : ''}`}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{contact.name}</span>
                          <a
                            href={contact.linkedinUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-[#339af0] hover:text-[#339af0]/80 transition-colors"
                          >
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm text-[#a1a1aa]">{contact.title}</td>
                      <td className="px-4 py-3 text-sm text-[#a1a1aa]">{contact.department}</td>
                      <td className="px-4 py-3">
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-2 py-0 ${CONFIDENCE_CONFIG[contact.confidence].className}`}
                        >
                          {CONFIDENCE_CONFIG[contact.confidence].label}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-xs text-[#a1a1aa]">{contact.source}</td>
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
                                : 'text-[#a1a1aa] hover:text-green-400 hover:bg-green-500/10'
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
                                : 'text-[#a1a1aa] hover:text-amber-400 hover:bg-amber-500/10'
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
                                : 'text-[#a1a1aa] hover:text-red-400 hover:bg-red-500/10'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Add Contact form */}
            <div className="rounded-xl border border-white/[0.06] bg-[#141419] overflow-hidden">
              <button
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full flex items-center justify-between px-5 py-4 hover:bg-white/[0.02] transition-colors"
              >
                <div className="flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-[#339af0]" />
                  <span className="text-sm font-medium text-white">Add Contact Manually</span>
                </div>
                {showAddForm
                  ? <ChevronUp className="w-4 h-4 text-[#a1a1aa]" />
                  : <ChevronDown className="w-4 h-4 text-[#a1a1aa]" />
                }
              </button>

              {showAddForm && (
                <div className="px-5 pb-5 border-t border-white/[0.06]">
                  <div className="grid grid-cols-2 gap-4 mt-4">
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Full Name *</label>
                      <input
                        type="text"
                        value={newContact.name}
                        onChange={e => setNewContact(p => ({ ...p, name: e.target.value }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40"
                        placeholder="Sophie Vanderberg"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Title *</label>
                      <input
                        type="text"
                        value={newContact.title}
                        onChange={e => setNewContact(p => ({ ...p, title: e.target.value }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40"
                        placeholder="Head of Payments Technology"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">LinkedIn URL</label>
                      <input
                        type="url"
                        value={newContact.linkedinUrl}
                        onChange={e => setNewContact(p => ({ ...p, linkedinUrl: e.target.value }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40"
                        placeholder="https://linkedin.com/in/..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Email</label>
                      <input
                        type="email"
                        value={newContact.email}
                        onChange={e => setNewContact(p => ({ ...p, email: e.target.value }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40"
                        placeholder="s.vanderberg@belfius.be"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Confidence Level</label>
                      <select
                        value={newContact.confidence}
                        onChange={e => setNewContact(p => ({ ...p, confidence: e.target.value as ContactConfidence }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-[#339af0]/40"
                      >
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-[#a1a1aa] mb-1.5">Source Note</label>
                      <input
                        type="text"
                        value={newContact.source}
                        onChange={e => setNewContact(p => ({ ...p, source: e.target.value }))}
                        className="w-full bg-[#0a0a0f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:outline-none focus:border-[#339af0]/40"
                        placeholder="LinkedIn, Web, Manual research..."
                      />
                    </div>
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={addContact}
                      size="sm"
                      className="bg-[#339af0] hover:bg-[#339af0]/90 text-white gap-1.5"
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
        <div className="flex-shrink-0 border-t border-white/[0.06] bg-[#0d0d15] px-6 py-4">
          <div className="max-w-6xl mx-auto">
            {/* Progress bar */}
            <div className="mb-3">
              <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#339af0] rounded-full transition-all duration-500"
                  style={{ width: `${total > 0 ? (reviewed / total) * 100 : 0}%` }}
                />
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4 text-sm">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-green-500" />
                  <span className="text-[#a1a1aa]">{confirmed} confirmed</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-white/30" />
                  <span className="text-[#a1a1aa]">{pending} pending</span>
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-500" />
                  <span className="text-[#a1a1aa]">{flagged} flagged</span>
                </span>
                {removed > 0 && (
                  <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span className="text-[#a1a1aa]">{removed} removed</span>
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3">
                {!allActioned && (
                  <p className="text-xs text-[#a1a1aa]">
                    {pending} contact{pending !== 1 ? 's' : ''} still pending review
                  </p>
                )}
                {allActioned && (
                  <div className="flex items-center gap-1.5 text-green-400 text-xs">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>All contacts reviewed</span>
                  </div>
                )}
                <Link href={allActioned ? `/playbook/${params.id}` : '#'}>
                  <Button
                    size="sm"
                    disabled={!allActioned}
                    className={`gap-1.5 ${
                      allActioned
                        ? 'bg-[#339af0] hover:bg-[#339af0]/90 text-white'
                        : 'bg-white/10 text-white/40 cursor-not-allowed'
                    }`}
                  >
                    Continue to Playbook
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
