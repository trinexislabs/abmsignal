/**
 * OpenClaw Client for ABMSignal
 * 
 * Communication pattern:
 * - Send playbook generation requests via the OpenClaw hooks API (webhook POST)
 * - The orchestrator agent receives the message and uses sessions_spawn internally
 * - The orchestrator manages state and dispatches to researcher/writer/reviewer
 * - Results are written to a shared file that this client can poll
 * 
 * The hooks API is the primary external interface to OpenClaw.
 * The orchestrator agent handles sub-agent orchestration internally.
 */

const OPENCLAW_URL = process.env.OPENCLAW_ABMSIGNAL_URL ?? 'http://localhost:18790'
const OPENCLAW_HOOKS_TOKEN = process.env.OPENCLAW_ABMSIGNAL_TOKEN ?? ''

function buildHeaders(): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json' }
  if (OPENCLAW_HOOKS_TOKEN) h['Authorization'] = `Bearer ${OPENCLAW_HOOKS_TOKEN}`
  return h
}

/**
 * Send a message to the ABMSignal orchestrator via the hooks API.
 * The orchestrator will parse the message and dispatch to sub-agents.
 */
export async function sendToOrchestrator(message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/hooks`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ message }),
    })
    
    if (!res.ok) {
      const text = await res.text().catch(() => 'unknown error')
      return { ok: false, error: `OpenClaw hooks: ${res.status} ${text}` }
    }
    
    return { ok: true }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Send a structured playbook generation request to the orchestrator.
 * Formats the product brief + target account into a clear prompt.
 */
export async function requestPlaybookGeneration(params: {
  playbookId: string
  productName: string
  productDescription: string
  valuePropositions: string[]
  targetCompany: string
  industry: string
  geography: string
  priorityTier: string
  productUrl?: string
  competitors?: string[]
  deploymentModel?: string
  dealSize?: string
  salesCycle?: string
}): Promise<{ ok: boolean; error?: string }> {
  const prompt = [
    `GENERATE ABM PLAYBOOK — ID: ${params.playbookId}`,
    ``,
    `## Product`,
    `Name: ${params.productName}`,
    `URL: ${params.productUrl || 'N/A'}`,
    `Description: ${params.productDescription}`,
    `Value Propositions: ${params.valuePropositions.join('; ')}`,
    `Competitors: ${params.competitors?.join(', ') || 'N/A'}`,
    `Deployment: ${params.deploymentModel || 'SaaS'}`,
    `Deal Size: ${params.dealSize || 'N/A'}`,
    `Sales Cycle: ${params.salesCycle || 'N/A'}`,
    ``,
    `## Target Account`,
    `Company: ${params.targetCompany}`,
    `Industry: ${params.industry}`,
    `Geography: ${params.geography}`,
    `Priority: ${params.priorityTier}`,
    ``,
    `Execute the full ABM playbook generation pipeline:`,
    `1. Research the target account (Researcher agent)`,
    `2. Present contacts for human review (Contact Gate)`,
    `3. Write all 12 playbook sections (Writer agent)`,
    `4. Review with 16-point quality checklist (Reviewer agent)`,
    ``,
    `Return results as structured JSON matching the ABMSignal schemas.`,
    `Write output to /tmp/abmsignal/${params.playbookId}/result.json`,
  ].join('\n')

  return sendToOrchestrator(prompt)
}

/**
 * Check if the OpenClaw gateway is reachable.
 */
export async function healthCheck(): Promise<boolean> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/health`)
    return res.ok
  } catch {
    return false
  }
}