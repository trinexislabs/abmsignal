import { playbookRepository } from '../../playbooks/playbook-repository'
import { runRepository } from '../../runs/run-repository'
import { openclawAdapter } from '../../agent/openclaw-adapter'
import { buildResearchPrompt } from '../../agent/agent-prompts'
import type { AgentStatus } from '@/types'

export async function runResearchWorker(runId: string): Promise<void> {
  const run = await runRepository.findById(runId)
  if (!run) throw new Error(`Run ${runId} not found`)

  const { playbookId } = run

  await playbookRepository.logEvent(playbookId, 'run.started', `Research run ${runId} started`, {}, runId)

  // Mark run as running
  await runRepository.markRunning(runId)

  // Set playbook status to researching
  const runningAgentStatus: AgentStatus[] = [
    { agent: 'orchestrator', task: 'Coordinating research pipeline', status: 'running' },
    { agent: 'researcher', task: 'Starting account research', status: 'running' },
    { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ]
  await playbookRepository.setStatus(playbookId, 'researching', 10, runningAgentStatus)

  // Load playbook data for prompt
  const playbook = await playbookRepository.findById(playbookId)
  if (!playbook) {
    await runRepository.markFailed(runId, 'Playbook not found during research')
    await playbookRepository.setFailed(playbookId, 'Playbook not found during research')
    return
  }

  const brief = playbook.product_brief as Record<string, unknown>
  const valueProps = Array.isArray(brief.value_propositions)
    ? (brief.value_propositions as string[])
    : [String(brief.value_propositions ?? '')]

  const prompt = buildResearchPrompt({
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
  })

  await playbookRepository.logEvent(
    playbookId, 'run.prompt_built', 'Research prompt constructed', { promptLength: prompt.length }, runId,
  )

  // Update progress while invoking agent
  await playbookRepository.setStatus(playbookId, 'researching', 25, [
    { agent: 'orchestrator', task: 'Coordinating research pipeline', status: 'running' },
    { agent: 'researcher', task: 'Deep account research in progress...', status: 'running' },
    { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  // Invoke OpenClaw
  const result = await openclawAdapter.runResearch(prompt, runId)

  // Always save raw output for debuggability
  await runRepository.saveRawOutput(runId, result.rawOutput)

  if (!result.ok) {
    const errMsg = result.error
    await runRepository.markFailed(runId, errMsg, result.rawOutput)
    await playbookRepository.setFailed(playbookId, errMsg)
    await playbookRepository.logEvent(
      playbookId, 'run.failed', `Research run failed: ${errMsg}`,
      { logPath: result.logPath }, runId,
    )
    return
  }

  // Validated output — write to DB
  const { contacts, sources } = result.data

  await playbookRepository.replaceContacts(
    playbookId,
    contacts.map(c => ({
      name: c.name,
      title: c.title,
      company: c.company,
      linkedinUrl: c.linkedin_url ?? undefined,
      email: c.email ?? undefined,
      rationale: c.rationale,
      sourceUrls: c.source_urls,
      confidence: c.confidence,
      source: 'AI Research',
      verificationStatus: 'pending',
    })),
  )

  await playbookRepository.logEvent(
    playbookId, 'contacts.discovered',
    `${contacts.length} contacts discovered`, { count: contacts.length }, runId,
  )

  // Store research-level sources (not tied to sections yet)
  // We don't store these directly — they'll be referenced during writing

  await runRepository.markSucceeded(runId)

  // Transition to contact_review
  await playbookRepository.setStatus(playbookId, 'contact_review', 60, [
    { agent: 'orchestrator', task: 'Research complete — awaiting contact review', status: 'complete' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Waiting for contact approval', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  await playbookRepository.logEvent(
    playbookId, 'contacts.ready', 'Contacts ready for human review', {}, runId,
  )
}
