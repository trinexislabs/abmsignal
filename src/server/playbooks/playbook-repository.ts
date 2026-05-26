import { prisma } from '../db'
import type {
  ApiActivePlaybook,
  ApiActiveRun,
  ApiContact,
  ApiCounters,
  ApiEvent,
  ApiPlaybook,
  ApiSection,
  ApiSource,
  ApiStatus,
  ContactInput,
  CreatePlaybookInput,
  SectionInput,
  SourceInput,
} from './playbook-types'
import type { AgentStatus, PlaybookStatus } from '@/types'

const TOTAL_SECTIONS = 18
const ACTIVE_STATUSES = ['queued', 'researching', 'writing', 'reviewing', 'contact_review'] as const

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseJson<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T } catch { return fallback }
}

// Map DB statuses that differ from frontend to their frontend-compatible values
function mapStatus(status: string): PlaybookStatus {
  if (status === 'failed') return 'error'
  if (status === 'cancelled') return 'rejected'
  return status as PlaybookStatus
}

function toApiSection(s: {
  id: string; playbookId: string; sectionKey: string; title: string
  contentMarkdown: string; status: string; orderIndex: number; createdAt: Date
  sources?: { id: string; claim: string | null; url: string; confidence: string | null; verificationStatus: string }[]
}): ApiSection {
  return {
    id: s.id,
    playbook_id: s.playbookId,
    type: s.sectionKey,
    section_type: s.sectionKey,
    title: s.title,
    content: s.contentMarkdown,
    order: s.orderIndex,
    status: s.status,
    sources: (s.sources ?? []).map(src => ({
      id: src.id,
      claim: src.claim ?? '',
      source_url: src.url,
      confidence: src.confidence ?? 'medium',
      verification_status: src.verificationStatus,
    })),
    created_at: s.createdAt.toISOString(),
  }
}

function toApiContact(c: {
  id: string; playbookId: string; name: string; title: string; company: string
  linkedinUrl: string | null; email: string | null; confidence: string; source: string
  verificationStatus: string; notes: string | null; personalizationSignals: string
  directQuotes: string; createdAt: Date
}): ApiContact {
  return {
    id: c.id,
    playbook_id: c.playbookId,
    name: c.name,
    title: c.title,
    company: c.company,
    linkedin_url: c.linkedinUrl ?? undefined,
    email: c.email ?? undefined,
    confidence: c.confidence,
    source: c.source,
    verification_status: c.verificationStatus,
    notes: c.notes ?? undefined,
    personalization_signals: parseJson<unknown[]>(c.personalizationSignals, []),
    direct_quotes: parseJson<unknown[]>(c.directQuotes, []),
    created_at: c.createdAt.toISOString(),
  }
}

// ─── Repository ───────────────────────────────────────────────────────────────

export const playbookRepository = {
  async create(input: CreatePlaybookInput): Promise<ApiPlaybook> {
    const id = `pb_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`
    const now = new Date()

    const initialAgentStatus: AgentStatus[] = [
      { agent: 'orchestrator', task: 'Initializing research pipeline', status: 'pending' },
      { agent: 'researcher', task: 'Preparing account research', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ]

    const pb = await prisma.playbook.create({
      data: {
        id,
        userId: input.userId ?? null,
        productName: input.productName,
        productUrl: input.productUrl ?? null,
        productBrief: JSON.stringify(input.productBrief),
        targetCompany: input.targetCompany,
        targetUrl: input.targetUrl ?? null,
        industry: input.industry,
        geography: input.geography,
        priorityTier: input.priorityTier,
        status: 'draft',
        progressPct: 0,
        agentStatus: JSON.stringify(initialAgentStatus),
      },
    })

    return playbookRepository.findById(id) as Promise<ApiPlaybook>
  },

  async findById(id: string): Promise<ApiPlaybook | null> {
    const pb = await prisma.playbook.findUnique({
      where: { id },
      include: {
        sections: { include: { sources: true }, orderBy: { orderIndex: 'asc' } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
    })
    if (!pb) return null
    return {
      id: pb.id,
      user_id: pb.userId ?? '',
      product_name: pb.productName,
      product_url: pb.productUrl ?? undefined,
      product_brief: parseJson(pb.productBrief, {}),
      target_company: pb.targetCompany,
      target_url: pb.targetUrl ?? undefined,
      industry: pb.industry,
      geography: pb.geography,
      priority_tier: pb.priorityTier,
      status: mapStatus(pb.status),
      progress_pct: pb.progressPct,
      agent_status: parseJson<AgentStatus[]>(pb.agentStatus, []),
      failed_reason: pb.failedReason ?? undefined,
      openclaw_session_id: pb.openclawSessionId ?? undefined,
      sections: pb.sections.map(toApiSection),
      contacts: pb.contacts.map(toApiContact),
      created_at: pb.createdAt.toISOString(),
      updated_at: pb.updatedAt.toISOString(),
    }
  },

  async listAll(): Promise<ApiPlaybook[]> {
    const playbooks = await prisma.playbook.findMany({
      include: {
        sections: { include: { sources: true }, orderBy: { orderIndex: 'asc' } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return playbooks.map(pb => ({
      id: pb.id,
      user_id: pb.userId ?? '',
      product_name: pb.productName,
      product_url: pb.productUrl ?? undefined,
      product_brief: parseJson(pb.productBrief, {}),
      target_company: pb.targetCompany,
      target_url: pb.targetUrl ?? undefined,
      industry: pb.industry,
      geography: pb.geography,
      priority_tier: pb.priorityTier,
      status: mapStatus(pb.status),
      progress_pct: pb.progressPct,
      agent_status: parseJson<AgentStatus[]>(pb.agentStatus, []),
      failed_reason: pb.failedReason ?? undefined,
      openclaw_session_id: pb.openclawSessionId ?? undefined,
      sections: pb.sections.map(toApiSection),
      contacts: pb.contacts.map(toApiContact),
      created_at: pb.createdAt.toISOString(),
      updated_at: pb.updatedAt.toISOString(),
    }))
  },

  async listByUser(userId: string): Promise<ApiPlaybook[]> {
    const playbooks = await prisma.playbook.findMany({
      where: { userId },
      include: {
        sections: { include: { sources: true }, orderBy: { orderIndex: 'asc' } },
        contacts: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { createdAt: 'desc' },
    })
    return playbooks.map(pb => ({
      id: pb.id,
      user_id: pb.userId ?? '',
      product_name: pb.productName,
      product_url: pb.productUrl ?? undefined,
      product_brief: parseJson(pb.productBrief, {}),
      target_company: pb.targetCompany,
      target_url: pb.targetUrl ?? undefined,
      industry: pb.industry,
      geography: pb.geography,
      priority_tier: pb.priorityTier,
      status: mapStatus(pb.status),
      progress_pct: pb.progressPct,
      agent_status: parseJson<AgentStatus[]>(pb.agentStatus, []),
      failed_reason: pb.failedReason ?? undefined,
      openclaw_session_id: pb.openclawSessionId ?? undefined,
      sections: pb.sections.map(toApiSection),
      contacts: pb.contacts.map(toApiContact),
      created_at: pb.createdAt.toISOString(),
      updated_at: pb.updatedAt.toISOString(),
    }))
  },

  async getStatus(id: string): Promise<ApiStatus | null> {
    const pb = await prisma.playbook.findUnique({ where: { id } })
    if (!pb) return null

    // Fetch the most relevant run (currently running > most recently completed).
    // We surface this so the frontend timer is grounded in DB time, not the moment
    // the browser tab happened to mount.
    const latestRun = await prisma.playbookRun.findFirst({
      where: { playbookId: id },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }],
    })
    const activeRun = await prisma.playbookRun.findFirst({
      where: { playbookId: id, status: { in: ['queued', 'running'] } },
      orderBy: { createdAt: 'desc' },
    })

    const surfaceRun = activeRun ?? latestRun
    const agentRuntime = await computeAgentRuntime(id)
    const counters = await computeCounters(id)
    const recentEvents = await fetchRecentEvents(id, 10)

    return {
      playbook_id: pb.id,
      status: mapStatus(pb.status),
      progress_pct: pb.progressPct,
      agent_status: parseJson<AgentStatus[]>(pb.agentStatus, []),
      failed_reason: pb.failedReason ?? undefined,
      product_name: pb.productName,
      target_company: pb.targetCompany,
      active_run: surfaceRun ? toApiActiveRun(surfaceRun) : null,
      agent_runtime_seconds: agentRuntime,
      created_at: pb.createdAt.toISOString(),
      recent_events: recentEvents,
      counters,
    }
  },

  async listActiveForUser(userId: string): Promise<ApiActivePlaybook[]> {
    const playbooks = await prisma.playbook.findMany({
      where: { userId, status: { in: [...ACTIVE_STATUSES] } },
      orderBy: { createdAt: 'desc' },
    })
    if (playbooks.length === 0) return []

    const runs = await prisma.playbookRun.findMany({
      where: { playbookId: { in: playbooks.map(p => p.id) } },
      orderBy: { createdAt: 'desc' },
    })

    const activeRunByPb = new Map<string, typeof runs[number]>()
    for (const r of runs) {
      if (r.status === 'queued' || r.status === 'running') {
        if (!activeRunByPb.has(r.playbookId)) activeRunByPb.set(r.playbookId, r)
      }
    }

    const result: ApiActivePlaybook[] = []
    for (const pb of playbooks) {
      const agentStatuses = parseJson<AgentStatus[]>(pb.agentStatus, [])
      const running = agentStatuses.find(a => a.status === 'running')
      const counters = await computeCounters(pb.id)
      const agentRuntime = await computeAgentRuntime(pb.id)
      const activeRun = activeRunByPb.get(pb.id) ?? null

      result.push({
        id: pb.id,
        product_name: pb.productName,
        target_company: pb.targetCompany,
        status: mapStatus(pb.status),
        progress_pct: pb.progressPct,
        current_agent: running?.agent ?? null,
        current_task: running?.task ?? null,
        active_run: activeRun ? toApiActiveRun(activeRun) : null,
        agent_runtime_seconds: agentRuntime,
        counters,
        created_at: pb.createdAt.toISOString(),
        updated_at: pb.updatedAt.toISOString(),
      })
    }
    return result
  },

  async setStatus(
    id: string,
    status: string,
    progressPct: number,
    agentStatus: AgentStatus[],
  ): Promise<void> {
    // Clear failedReason whenever we transition out of a terminal-error state
    // (e.g. user retried). Otherwise the UI keeps showing the prior error.
    await prisma.playbook.update({
      where: { id },
      data: {
        status,
        progressPct,
        agentStatus: JSON.stringify(agentStatus),
        failedReason: null,
      },
    })
  },

  async setFailed(id: string, reason: string): Promise<void> {
    await prisma.playbook.update({
      where: { id },
      data: {
        status: 'error',
        failedReason: reason,
        agentStatus: JSON.stringify([
          { agent: 'orchestrator', task: 'Pipeline failed', status: 'error', detail: reason.slice(0, 120) },
        ]),
      },
    })
  },

  async setComplete(id: string): Promise<void> {
    await prisma.playbook.update({
      where: { id },
      data: { status: 'complete', progressPct: 100, completedAt: new Date() },
    })
  },

  async setOpenclawSession(id: string, sessionId: string): Promise<void> {
    await prisma.playbook.update({ where: { id }, data: { openclawSessionId: sessionId } })
  },

  // ─── Contacts ────────────────────────────────────────────────────────────

  async getContacts(id: string): Promise<ApiContact[]> {
    const contacts = await prisma.playbookContact.findMany({
      where: { playbookId: id },
      orderBy: { createdAt: 'asc' },
    })
    return contacts.map(toApiContact)
  },

  async replaceContacts(id: string, contacts: ContactInput[]): Promise<void> {
    await prisma.$transaction([
      prisma.playbookContact.deleteMany({ where: { playbookId: id } }),
      prisma.playbookContact.createMany({
        data: contacts.map(c => ({
          playbookId: id,
          name: c.name,
          title: c.title,
          company: c.company ?? '',
          linkedinUrl: c.linkedinUrl ?? null,
          email: c.email ?? null,
          rationale: c.rationale ?? null,
          sourceUrls: JSON.stringify(c.sourceUrls ?? []),
          confidence: c.confidence ?? 'medium',
          source: c.source ?? 'AI Research',
          verificationStatus: c.verificationStatus ?? 'pending',
          notes: c.notes ?? null,
          personalizationSignals: JSON.stringify(c.personalizationSignals ?? []),
          directQuotes: JSON.stringify(c.directQuotes ?? []),
        })),
      }),
    ])
  },

  async updateContactStatuses(
    id: string,
    updates: { id: string; verificationStatus: string }[],
  ): Promise<void> {
    await prisma.$transaction(
      updates.map(u =>
        prisma.playbookContact.update({
          where: { id: u.id },
          data: { verificationStatus: u.verificationStatus },
        }),
      ),
    )
  },

  // ─── Sections ────────────────────────────────────────────────────────────

  async replaceSections(id: string, sections: SectionInput[]): Promise<void> {
    // Delete existing sections and their sources for this playbook
    const existing = await prisma.playbookSection.findMany({ where: { playbookId: id } })
    const existingIds = existing.map(s => s.id)

    await prisma.$transaction([
      prisma.playbookSource.deleteMany({ where: { sectionId: { in: existingIds } } }),
      prisma.playbookSection.deleteMany({ where: { playbookId: id } }),
    ])

    for (const section of sections) {
      const created = await prisma.playbookSection.create({
        data: {
          playbookId: id,
          sectionKey: section.sectionKey,
          title: section.title,
          contentMarkdown: section.contentMarkdown,
          orderIndex: section.orderIndex,
          status: 'complete',
        },
      })

      if (section.sources && section.sources.length > 0) {
        await prisma.playbookSource.createMany({
          data: section.sources.map(src => ({
            playbookId: id,
            sectionId: created.id,
            url: src.url,
            title: src.title ?? null,
            publisher: src.publisher ?? null,
            confidence: src.confidence ?? null,
            note: src.note ?? null,
            claim: src.claim ?? null,
            verificationStatus: 'unverified',
          })),
        })
      }
    }
  },

  // ─── Source verification ─────────────────────────────────────────────────

  async updateSourceVerification(
    sectionId: string,
    sourceId: string,
    verificationStatus: string,
  ): Promise<boolean> {
    const src = await prisma.playbookSource.findFirst({
      where: { id: sourceId, sectionId },
    })
    if (!src) return false
    await prisma.playbookSource.update({
      where: { id: sourceId },
      data: { verificationStatus },
    })
    return true
  },

  // ─── Deletion ────────────────────────────────────────────────────────────

  // Hard-delete a playbook and ALL related rows. Schema has no ON DELETE CASCADE,
  // so we explicitly remove children in dependency order before the playbook itself.
  // Returns the run IDs that existed so the caller can clean up queue entries.
  async deleteCascade(id: string): Promise<{ runIds: string[] }> {
    const runs = await prisma.playbookRun.findMany({
      where: { playbookId: id },
      select: { id: true },
    })
    const runIds = runs.map(r => r.id)

    await prisma.$transaction([
      prisma.playbookEvent.deleteMany({ where: { playbookId: id } }),
      prisma.playbookSource.deleteMany({ where: { playbookId: id } }),
      prisma.playbookSection.deleteMany({ where: { playbookId: id } }),
      prisma.playbookContact.deleteMany({ where: { playbookId: id } }),
      prisma.playbookRun.deleteMany({ where: { playbookId: id } }),
      prisma.playbook.delete({ where: { id } }),
    ])

    return { runIds }
  },

  // ─── Events ──────────────────────────────────────────────────────────────

  async logEvent(
    playbookId: string,
    type: string,
    message: string,
    metadata: Record<string, unknown> = {},
    runId?: string,
  ): Promise<void> {
    await prisma.playbookEvent.create({
      data: {
        playbookId,
        runId: runId ?? null,
        type,
        message,
        metadata: JSON.stringify(metadata),
      },
    })
  },
}

// ─── Helpers for status enrichment ────────────────────────────────────────────

function toApiActiveRun(r: {
  id: string; phase: string; status: string
  startedAt: Date | null; createdAt: Date
}): ApiActiveRun {
  return {
    id: r.id,
    phase: r.phase as ApiActiveRun['phase'],
    status: r.status as ApiActiveRun['status'],
    started_at: r.startedAt?.toISOString() ?? null,
    created_at: r.createdAt.toISOString(),
  }
}

// Total seconds the agents have actively been running on this playbook —
// sum of completed-run durations plus the elapsed time of any currently
// running phase. Excludes the human contact-review gap, so the number
// reflects real agent work, not wall-clock time since creation.
async function computeAgentRuntime(playbookId: string): Promise<number> {
  const runs = await prisma.playbookRun.findMany({
    where: { playbookId, startedAt: { not: null } },
  })
  let totalMs = 0
  const now = Date.now()
  for (const r of runs) {
    if (!r.startedAt) continue
    const start = r.startedAt.getTime()
    const end = r.completedAt?.getTime() ?? r.failedAt?.getTime() ?? (r.status === 'running' ? now : start)
    totalMs += Math.max(0, end - start)
  }
  return Math.floor(totalMs / 1000)
}

async function computeCounters(playbookId: string): Promise<ApiCounters> {
  const [sectionsComplete, contactsFound, sourcesCount] = await Promise.all([
    prisma.playbookSection.count({ where: { playbookId, status: 'complete' } }),
    prisma.playbookContact.count({ where: { playbookId } }),
    prisma.playbookSource.count({ where: { playbookId } }),
  ])
  return {
    sections_total: TOTAL_SECTIONS,
    sections_complete: sectionsComplete,
    contacts_found: contactsFound,
    sources_count: sourcesCount,
  }
}

async function fetchRecentEvents(playbookId: string, limit: number): Promise<ApiEvent[]> {
  const events = await prisma.playbookEvent.findMany({
    where: { playbookId },
    orderBy: { createdAt: 'desc' },
    take: limit,
  })
  return events.map(e => ({
    id: e.id,
    type: e.type,
    message: e.message,
    created_at: e.createdAt.toISOString(),
  }))
}
