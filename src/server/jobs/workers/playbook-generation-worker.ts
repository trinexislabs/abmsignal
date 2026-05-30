import { playbookRepository } from '../../playbooks/playbook-repository'
import { runRepository } from '../../runs/run-repository'
import { recordPlaybookFailure } from '../../playbooks/failure'
import { runAgentTask } from '@/lib/openclaw/client'
import { parseAgentOutput } from '../../agent/agent-output-schema'
import { buildResearchPrompt } from '../../agent/agent-prompts'
import type { AgentStatus } from '@/types'

async function promoteUserQueue(userId: string | null | undefined): Promise<void> {
  if (!userId) return
  try {
    const { promoteNextInQueue } = await import('../../playbooks/queue-promotion')
    await promoteNextInQueue(userId)
  } catch (err) {
    console.warn('[research-worker] queue promotion failed:', err)
  }
}

export async function runResearchWorker(runId: string): Promise<void> {
  const run = await runRepository.findById(runId)
  if (!run) throw new Error(`Run ${runId} not found`)

  const { playbookId } = run

  await playbookRepository.logEvent(playbookId, 'run.started', `Research run ${runId} started`, {}, runId)

  await runRepository.markRunning(runId)

  const runningAgentStatus: AgentStatus[] = [
    { agent: 'orchestrator', task: 'Coordinating research pipeline', status: 'running' },
    { agent: 'researcher', task: 'Starting account research', status: 'running' },
    { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ]
  await playbookRepository.setStatus(playbookId, 'researching', 10, runningAgentStatus)

  const playbook = await playbookRepository.findById(playbookId)
  if (!playbook) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'research',
      error: 'Playbook not found during research',
    })
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

  await playbookRepository.setStatus(playbookId, 'researching', 25, [
    { agent: 'orchestrator', task: 'Coordinating research pipeline', status: 'running' },
    { agent: 'researcher', task: 'Deep account research in progress...', status: 'running' },
    { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  // Invoke OpenClaw via HTTP TaskFlow — each run gets an isolated flow
  const agentResult = await runAgentTask(prompt, runId)

  // Persist raw output and flowId for debugging
  await runRepository.saveRawOutput(runId, agentResult.ok ? agentResult.rawOutput : agentResult.error)
  if (agentResult.ok) {
    await playbookRepository.setOpenclawSession(playbookId, agentResult.flowId)
  }

  if (!agentResult.ok) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'research', error: agentResult.error,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  const parsed = parseAgentOutput(agentResult.rawOutput, 'research')
  if (!parsed.ok) {
    await recordPlaybookFailure({
      playbookId, runId, phase: 'research',
      error: parsed.error, rawOutput: agentResult.rawOutput,
    })
    await promoteUserQueue(playbook.user_id)
    return
  }

  const { contacts, sources } = parsed.data
  void sources // sources are referenced during writing

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

  await runRepository.markSucceeded(runId)

  await playbookRepository.setStatus(playbookId, 'contact_review', 60, [
    { agent: 'orchestrator', task: 'Research complete — awaiting contact review', status: 'complete' },
    { agent: 'researcher', task: 'Account research complete', status: 'complete' },
    { agent: 'writer', task: 'Waiting for contact approval', status: 'pending' },
    { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
  ])

  await playbookRepository.logEvent(
    playbookId, 'contacts.ready', 'Contacts ready for human review', {}, runId,
  )

  // OpenClaw has released its slot — advance the user's queue if anything is waiting
  await promoteUserQueue(playbook.user_id)
}
