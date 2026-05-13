export type PlaybookStatus = 'draft' | 'researching' | 'contact_review' | 'writing' | 'reviewing' | 'complete' | 'error'
export type SectionStatus = 'pending' | 'generating' | 'complete' | 'reviewed'
export type ContactVerificationStatus = 'pending' | 'confirmed' | 'needs_review' | 'removed'
export type ContactConfidence = 'high' | 'medium' | 'low'
export type QualityCheckStatus = 'pass' | 'warn' | 'fail' | 'pending'
export type PriorityTier = 'tier1' | 'tier2'
export type Plan = 'starter' | 'growth' | 'professional' | 'agency' | 'free'

export interface Profile {
  id: string
  user_id: string
  email: string
  name: string
  plan: Plan
  playbooks_used: number
  created_at: string
}

export interface Playbook {
  id: string
  user_id: string
  product_name: string
  product_url?: string
  product_brief: ProductBrief
  target_company: string
  target_url?: string
  industry: string
  geography: string
  priority_tier: PriorityTier
  status: PlaybookStatus
  progress_pct: number
  agent_status: AgentStatus[]
  created_at: string
  updated_at: string
}

export interface ProductBrief {
  product_name: string
  description: string
  value_propositions: string[]
  target_personas: string[]
  differentiators: string[]
  competitors: string[]
  deployment_model: 'saas' | 'on-prem' | 'hybrid'
  deal_size: string
  sales_cycle: string
}

export interface AgentStatus {
  agent: 'orchestrator' | 'researcher' | 'writer' | 'reviewer'
  task: string
  status: 'pending' | 'running' | 'complete' | 'error'
  detail?: string
  completed_at?: string
}

export interface PlaybookSection {
  id: string
  playbook_id: string
  section_type: SectionType
  title: string
  content: string
  status: SectionStatus
  created_at: string
}

export type SectionType =
  | 'executive_summary'
  | 'account_intelligence'
  | 'buying_committee'
  | 'why_now'
  | 'competitive_landscape'
  | 'cultural_context'
  | 'outreach_strategy'
  | 'personalized_sequences'
  | 'battle_cards'
  | 'content_strategy'
  | 'measurement_framework'
  | 'appendix'

export const SECTION_META: Record<SectionType, { title: string; icon: string; order: number }> = {
  executive_summary: { title: 'Executive Summary', icon: '📋', order: 1 },
  account_intelligence: { title: 'Account Intelligence Dossier', icon: '🏦', order: 2 },
  buying_committee: { title: 'Buying Committee & Org Map', icon: '👥', order: 3 },
  why_now: { title: '"Why Now" Signal Analysis', icon: '⚡', order: 4 },
  competitive_landscape: { title: 'Competitive Landscape', icon: '🎯', order: 5 },
  cultural_context: { title: 'Cultural & Regulatory Context', icon: '🌍', order: 6 },
  outreach_strategy: { title: 'Outreach Strategy', icon: '📡', order: 7 },
  personalized_sequences: { title: 'Hyper-Personalized Sequences', icon: '✉️', order: 8 },
  battle_cards: { title: 'Battle Cards & Objection Handling', icon: '🛡️', order: 9 },
  content_strategy: { title: 'Content Asset Strategy', icon: '📄', order: 10 },
  measurement_framework: { title: 'Measurement Framework', icon: '📊', order: 11 },
  appendix: { title: 'Appendix', icon: '📎', order: 12 },
}

export interface Contact {
  id: string
  playbook_id: string
  name: string
  title: string
  linkedin_url?: string
  confidence: ContactConfidence
  source: string
  verification_status: ContactVerificationStatus
  email?: string
  notes?: string
  created_at: string
}

export interface QualityCheck {
  id: string
  playbook_id: string
  check_number: number
  check_name: string
  category: string
  status: QualityCheckStatus
  details: string
  created_at: string
}

export const QUALITY_CHECKS: { number: number; name: string; category: string }[] = [
  { number: 1, name: 'All contacts have verified names, titles, and LinkedIn URLs', category: 'Accuracy' },
  { number: 2, name: 'No generic outreach — every sequence references specific account signals', category: 'Personalization' },
  { number: 3, name: '"Why Now" signals are recent (within 90 days) and specific', category: 'Relevance' },
  { number: 4, name: 'Cultural adaptation matches target geography + industry', category: 'Cultural Fit' },
  { number: 5, name: 'Competitive landscape identifies actual incumbents, not generic competitors', category: 'Accuracy' },
  { number: 6, name: 'Battle cards address real objections, not straw-man arguments', category: 'Quality' },
  { number: 7, name: 'Every email has a clear CTA appropriate to the persona and stage', category: 'Effectiveness' },
  { number: 8, name: 'Tone matches the target\'s industry norms (formal vs. casual)', category: 'Cultural Fit' },
  { number: 9, name: 'No fabricated data — all claims are sourced or marked [UNVERIFIED]', category: 'Integrity' },
  { number: 10, name: 'Buying committee covers all key roles (economic, technical, champion, end user)', category: 'Completeness' },
  { number: 11, name: 'Measurement framework has realistic KPIs for the sales cycle length', category: 'Practicality' },
  { number: 12, name: 'Content assets are actionable with specific topics, not vague briefs', category: 'Specificity' },
  { number: 13, name: 'Org chart reflects current reporting structure (not outdated)', category: 'Accuracy' },
  { number: 14, name: "Outreach strategy accounts for the target's preferred communication channels", category: 'Cultural Fit' },
  { number: 15, name: 'No internal inconsistencies between sections', category: 'Consistency' },
  { number: 16, name: 'All sources cited with confidence scores', category: 'Transparency' },
]

// ===== Form Input Types =====

export interface ProductBriefFormData {
  product_name: string
  product_url: string
  description: string
  value_propositions: string
  target_personas: string
  differentiators: string
  competitors: string
  deployment_model: 'saas' | 'on-prem' | 'hybrid'
  deal_size: string
  sales_cycle: string
}

export interface TargetAccountFormData {
  target_company: string
  target_url: string
  industry: string
  geography: string
  priority_tier: PriorityTier
  notes?: string
}

// ===== Playbook Progress / WebSocket =====

export interface PlaybookProgressEvent {
  playbook_id: string
  stage: string
  percentage: number
  current_task: string
  elapsed_seconds: number
  estimated_remaining_seconds: number | null
  agent_statuses: AgentStatus[]
}

export type WebSocketEventType =
  | 'progress_update'
  | 'contact_review_ready'
  | 'section_complete'
  | 'playbook_complete'
  | 'error'

export interface WebSocketEvent {
  type: WebSocketEventType
  playbook_id: string
  timestamp: string
  data: PlaybookProgressEvent | { section_type: SectionType } | { error: string }
}

// ===== Stripe / Billing Types =====

export interface PricingPlan {
  id: Plan
  name: string
  price_monthly: number
  price_annual: number
  playbooks_per_month: number | 'unlimited'
  contacts_per_playbook: number
  features: string[]
  stripe_price_id_monthly?: string
  stripe_price_id_annual?: string
  highlighted?: boolean
}

// ===== API Response Types =====

export interface ApiResponse<T = unknown> {
  data?: T
  error?: string
  message?: string
}

export interface PlaybookCreateRequest {
  product_brief: ProductBriefFormData
  target_account: TargetAccountFormData
}

export interface PlaybookCreateResponse {
  playbook_id: string
  job_id: string
  estimated_completion_minutes: number
}

// ===== Mock Data type alias =====
export type MockPlaybook = Playbook & {
  sections: PlaybookSection[]
  contacts: Contact[]
  quality_checks: QualityCheck[]
  progress_pct: number
  agent_status: AgentStatus[]
}
