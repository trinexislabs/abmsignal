import type { AgentStatus, PlaybookStatus } from '@/types'

// ─── DB-level model mirrors (what Prisma returns) ───────────────────────────

export interface DbPlaybook {
  id: string
  userId: string | null
  productName: string
  productUrl: string | null
  productBrief: string      // JSON string
  targetCompany: string
  targetUrl: string | null
  industry: string
  geography: string
  priorityTier: string
  status: string
  progressPct: number
  agentStatus: string       // JSON string
  failedReason: string | null
  completedAt: Date | null
  openclawSessionId: string | null
  createdAt: Date
  updatedAt: Date
}

export interface DbContact {
  id: string
  playbookId: string
  name: string
  title: string
  company: string
  linkedinUrl: string | null
  email: string | null
  rationale: string | null
  sourceUrls: string        // JSON
  confidence: string
  source: string
  verificationStatus: string
  notes: string | null
  personalizationSignals: string // JSON
  directQuotes: string           // JSON
  createdAt: Date
  updatedAt: Date
}

export interface DbSection {
  id: string
  playbookId: string
  sectionKey: string
  title: string
  contentMarkdown: string
  status: string
  orderIndex: number
  createdAt: Date
  updatedAt: Date
}

export interface DbSource {
  id: string
  playbookId: string
  sectionId: string | null
  url: string
  title: string | null
  publisher: string | null
  retrievedAt: Date | null
  confidence: string | null
  note: string | null
  claim: string | null
  verificationStatus: string
  createdAt: Date
}

// ─── API-level shapes (what routes return) ──────────────────────────────────

export interface ApiPlaybook {
  id: string
  user_id: string
  product_name: string
  product_url?: string
  product_brief: Record<string, unknown>
  target_company: string
  target_url?: string
  industry: string
  geography: string
  priority_tier: string
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
  failed_reason?: string
  openclaw_session_id?: string
  sections: ApiSection[]
  contacts: ApiContact[]
  created_at: string
  updated_at: string
}

export interface ApiSection {
  id: string
  playbook_id: string
  type: string          // section_key aliased as "type" for frontend compat
  section_type: string  // duplicate for alternate consumers
  title: string
  content: string       // alias for contentMarkdown
  order: number
  status: string
  sources: ApiSource[]
  created_at: string
}

export interface ApiContact {
  id: string
  playbook_id: string
  name: string
  title: string
  company?: string
  linkedin_url?: string
  email?: string
  confidence: string
  source: string
  verification_status: string
  notes?: string
  personalization_signals?: unknown[]
  direct_quotes?: unknown[]
  created_at: string
}

export interface ApiSource {
  id: string
  claim: string
  source_url: string
  confidence: string
  verification_status: string
}

export interface ApiStatus {
  playbook_id: string
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
  failed_reason?: string
  // Identifiers so the processing page can show "what" without a second fetch.
  product_name?: string
  target_company?: string
  // Live runtime info — populated when a run is active (or has run previously).
  // Older clients ignore unknown fields, so these additions are backward compatible.
  active_run?: ApiActiveRun | null
  agent_runtime_seconds?: number
  created_at?: string
  recent_events?: ApiEvent[]
  counters?: ApiCounters
}

export interface ApiActiveRun {
  id: string
  phase: 'research' | 'writing' | 'review'
  status: 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'
  started_at: string | null
  created_at: string
}

export interface ApiEvent {
  id: string
  type: string
  message: string
  created_at: string
}

export interface ApiCounters {
  sections_total: number
  sections_complete: number
  contacts_found: number
  sources_count: number
}

export interface ApiActivePlaybook {
  id: string
  product_name: string
  target_company: string
  status: PlaybookStatus
  progress_pct: number
  current_agent: AgentStatus['agent'] | null
  current_task: string | null
  active_run: ApiActiveRun | null
  agent_runtime_seconds: number
  counters: ApiCounters
  created_at: string
  updated_at: string
}

// ─── Input types ─────────────────────────────────────────────────────────────

export interface CreatePlaybookInput {
  userId?: string
  productName: string
  productUrl?: string
  productBrief: Record<string, unknown>
  targetCompany: string
  targetUrl?: string
  industry: string
  geography: string
  priorityTier: string
}

export interface ContactInput {
  id?: string
  name: string
  title: string
  company?: string
  linkedinUrl?: string
  email?: string
  rationale?: string
  sourceUrls?: string[]
  confidence?: string
  source?: string
  verificationStatus?: string
  notes?: string
  personalizationSignals?: unknown[]
  directQuotes?: unknown[]
}

export interface SectionInput {
  sectionKey: string
  title: string
  contentMarkdown: string
  orderIndex: number
  sources?: SourceInput[]
}

export interface SourceInput {
  url: string
  title?: string
  publisher?: string
  confidence?: string
  note?: string
  claim?: string
}
