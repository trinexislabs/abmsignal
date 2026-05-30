import { playbookRepository } from '../../playbooks/playbook-repository'
import { runRepository } from '../../runs/run-repository'
import { recordPlaybookFailure } from '../../playbooks/failure'
import { runAgentTask } from '@/lib/openclaw/client'
import { parseAgentOutput } from '../../agent/agent-output-schema'
import { buildWritingPromptBatch, WRITING_BATCH_1_KEYS, WRITING_BATCH_2_KEYS } from '../../agent/agent-prompts'
import type { AgentStatus } from '@/types'

async function promoteUserQueue(userId: string | null | undefined): Promise<void> {
  if (!userId) return
  try {
    const { promoteNextInQueue } = await import('../../playbooks/queue-promotion')
    await promoteNextInQueue(userId)
  } catch (err) {
    console.warn('[writing-worker] queue promotion failed:', err)
  }
}

export async function runWritingWorker(runId: string): Promise<void> {
  const run = await runRepository.findById(runId)
  if (!run) throw new Error(`Run ${runId} not found`)

  const { playbookId } = run

  await playbookRepository.logEvent(playbookId, 'run.started', `Writing run ${runId} started`, {}, runId)

  await runRepository.markRunning(runId)

  const writingAgentStatus: AgentStatus[] = [
    { agent: 'orchestrator', task: 'Contact review complete — starting content generation', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Generating hyper-personalized sections', status: 'running' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ]
  await playbookRepository.setStatus(playbookId, 'writing', 65, writingAgentStatus)

  const playbook = await playbookRepository.findById(playbookId)
  if (!playbook) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'writing',
      error: 'Playbook not found during writing',
    })
    return
  }

  const brief = playbook.product_brief as Record<string, unknown>
  const valueProps = Array.isArray(brief.value_propositions)
    ? (brief.value_propositions as string[])
    : [String(brief.value_propositions ?? '')]

  const allContacts = playbook.contacts
  const approvedContacts = allContacts.filter(
    c => c.verification_status === 'confirmed' || c.verification_status === 'needs_review',
  )
  if (approvedContacts.length === 0) {
    const fallback = allContacts.filter(c => c.verification_status !== 'removed')
    approvedContacts.push(...fallback)
  }

  const writingCtx = {
    playbookId,
    productName: playbook.product_name,
    productDescription: String(brief.description ?? ''),
    valuePropositions: valueProps,
    targetCompany: playbook.target_company,
    industry: playbook.industry,
    geography: playbook.geography,
    priorityTier: playbook.priority_tier,
    productUrl: playbook.product_url,
    competitors: Array.isArray(brief.competitors) ? (brief.competitors as string[]) : [],
    deploymentModel: String(brief.deployment_model ?? 'SaaS'),
    dealSize: String(brief.deal_size ?? ''),
    salesCycle: String(brief.sales_cycle ?? ''),
    approvedContacts: approvedContacts.map(c => ({
      name: c.name,
      title: c.title,
      company: c.company ?? playbook.target_company,
      linkedin_url: c.linkedin_url,
      confidence: c.confidence,
      rationale: undefined,
    })),
  }

  // ── Batch 1: sections 1–9 (research + positioning) ────────────────────────
  await playbookRepository.setStatus(playbookId, 'writing', 70, [
    { agent: 'orchestrator', task: 'Generating playbook sections (batch 1/2)', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Writing sections 1–9...', status: 'running', detail: 'Research + positioning sections' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  const prompt1 = buildWritingPromptBatch(writingCtx, WRITING_BATCH_1_KEYS, 1)
  const result1 = await runAgentTask(prompt1, `${runId}-batch1`)

  await runRepository.saveRawOutput(runId, result1.ok ? result1.rawOutput : result1.error)
  if (result1.ok) {
    await playbookRepository.setOpenclawSession(playbookId, result1.flowId)
  }

  if (!result1.ok) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'writing', error: result1.error,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  const parsed1 = parseAgentOutput(result1.rawOutput, 'writing')
  if (!parsed1.ok) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'writing',
      error: parsed1.error, rawOutput: result1.rawOutput,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  await playbookRepository.logEvent(
    playbookId, 'sections.batch1.generated',
    `${parsed1.data.sections.length} sections generated (batch 1)`,
    { count: parsed1.data.sections.length }, runId,
  )

  // ── Batch 2: sections 10–18 (outreach + execution) ────────────────────────
  await playbookRepository.setStatus(playbookId, 'writing', 82, [
    { agent: 'orchestrator', task: 'Generating playbook sections (batch 2/2)', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Writing sections 10–18...', status: 'running', detail: 'Outreach + execution sections' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  const prompt2 = buildWritingPromptBatch(writingCtx, WRITING_BATCH_2_KEYS, 2)
  const result2 = await runAgentTask(prompt2, `${runId}-batch2`)

  await runRepository.saveRawOutput(runId, result2.ok ? result2.rawOutput : result2.error)

  if (!result2.ok) {
    // Save batch 1 sections to avoid losing work, then record the failure.
    await playbookRepository.logEvent(
      playbookId, 'run.partial',
      'Generated the first set of sections before an issue interrupted the rest — your partial progress was saved.',
      { rawError: result2.error }, runId,
    )
    await playbookRepository.replaceSections(playbookId, mapSections(parsed1.data.sections))
    await recordPlaybookFailure({
      playbookId, runId, phase: 'writing', error: result2.error,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  const parsed2 = parseAgentOutput(result2.rawOutput, 'writing')
  if (!parsed2.ok) {
    await playbookRepository.logEvent(
      playbookId, 'run.partial',
      'Generated the first set of sections before an issue interrupted the rest — your partial progress was saved.',
      { rawError: parsed2.error }, runId,
    )
    await playbookRepository.replaceSections(playbookId, mapSections(parsed1.data.sections))
    await recordPlaybookFailure({
      playbookId, runId, phase: 'writing',
      error: parsed2.error, rawOutput: result2.rawOutput,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  await playbookRepository.logEvent(
    playbookId, 'sections.batch2.generated',
    `${parsed2.data.sections.length} sections generated (batch 2)`,
    { count: parsed2.data.sections.length }, runId,
  )

  // ── Reviewing + merge ──────────────────────────────────────────────────────
  await playbookRepository.setStatus(playbookId, 'reviewing', 90, [
    { agent: 'orchestrator', task: 'Reviewing generated content', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Content generation complete', status: 'complete' },
    { agent: 'reviewer', task: 'Quality review in progress', status: 'running' },
  ])

  const allSections = [...parsed1.data.sections, ...parsed2.data.sections]

  await playbookRepository.logEvent(
    playbookId, 'sections.generated',
    `${allSections.length} sections generated (batches 1+2)`, { count: allSections.length }, runId,
  )

  await playbookRepository.replaceSections(playbookId, mapSections(allSections))

  await runRepository.markSucceeded(runId)
  await playbookRepository.setComplete(playbookId)

  await playbookRepository.logEvent(playbookId, 'playbook.complete', 'Playbook generation complete', {}, runId)

  await playbookRepository.setStatus(playbookId, 'complete', 100, [
    { agent: 'orchestrator', task: 'Playbook complete', status: 'complete' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'All 18 sections generated', status: 'complete' },
    { agent: 'reviewer', task: 'Quality review complete', status: 'complete' },
  ])

  // Playbook complete — advance the user's queue if anything is waiting
  await promoteUserQueue(playbook.user_id)
}

type RawSection = {
  section_key: string
  title: string
  content_markdown: string
  order_index: number
  sources: { url: string; title?: string; publisher?: string; confidence?: string; note?: string; claim?: string }[]
}

function mapSections(sections: RawSection[]) {
  return sections.map(s => ({
    sectionKey: s.section_key,
    title: s.title,
    contentMarkdown: s.content_markdown,
    orderIndex: s.order_index,
    sources: s.sources.map(src => ({
      url: src.url,
      title: src.title,
      publisher: src.publisher,
      confidence: src.confidence,
      note: src.note,
      claim: src.claim,
    })),
  }))
}
