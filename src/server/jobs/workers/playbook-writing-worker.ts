import { playbookRepository } from '../../playbooks/playbook-repository'
import { runRepository } from '../../runs/run-repository'
import { openclawAdapter } from '../../agent/openclaw-adapter'
import { buildWritingPrompt } from '../../agent/agent-prompts'
import type { AgentStatus } from '@/types'

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
    await runRepository.markFailed(runId, 'Playbook not found during writing')
    await playbookRepository.setFailed(playbookId, 'Playbook not found during writing')
    return
  }

  const brief = playbook.product_brief as Record<string, unknown>
  const valueProps = Array.isArray(brief.value_propositions)
    ? (brief.value_propositions as string[])
    : [String(brief.value_propositions ?? '')]

  // Load approved contacts (confirmed or not removed)
  const allContacts = playbook.contacts
  const approvedContacts = allContacts.filter(
    c => c.verification_status === 'confirmed' || c.verification_status === 'needs_review',
  )
  if (approvedContacts.length === 0) {
    // Fall back to all non-removed contacts if none explicitly confirmed
    const fallback = allContacts.filter(c => c.verification_status !== 'removed')
    approvedContacts.push(...fallback)
  }

  const prompt = buildWritingPrompt({
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
  })

  await playbookRepository.setStatus(playbookId, 'writing', 70, [
    { agent: 'orchestrator', task: 'Generating playbook sections', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Writing 12 sections...', status: 'running', detail: 'Generation in progress' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  const result = await openclawAdapter.runWriting(prompt, runId)
  await runRepository.saveRawOutput(runId, result.rawOutput)

  if (!result.ok) {
    await runRepository.markFailed(runId, result.error, result.rawOutput)
    await playbookRepository.setFailed(playbookId, result.error)
    await playbookRepository.logEvent(
      playbookId, 'run.failed', `Writing run failed: ${result.error}`,
      { logPath: result.logPath }, runId,
    )
    return
  }

  // Reviewing phase — update status
  await playbookRepository.setStatus(playbookId, 'reviewing', 90, [
    { agent: 'orchestrator', task: 'Reviewing generated content', status: 'running' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Content generation complete', status: 'complete' },
    { agent: 'reviewer', task: 'Quality review in progress', status: 'running' },
  ])

  await playbookRepository.logEvent(
    playbookId, 'sections.generated',
    `${result.data.sections.length} sections generated`, { count: result.data.sections.length }, runId,
  )

  // Persist sections and their sources
  await playbookRepository.replaceSections(
    playbookId,
    result.data.sections.map(s => ({
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
    })),
  )

  await runRepository.markSucceeded(runId)
  await playbookRepository.setComplete(playbookId)

  await playbookRepository.logEvent(
    playbookId, 'playbook.complete', 'Playbook generation complete', {}, runId,
  )

  // Final status update
  await playbookRepository.setStatus(playbookId, 'complete', 100, [
    { agent: 'orchestrator', task: 'Playbook complete', status: 'complete' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'All 12 sections generated', status: 'complete' },
    { agent: 'reviewer', task: 'Quality review complete', status: 'complete' },
  ])
}
