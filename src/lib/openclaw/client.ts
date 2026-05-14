/**
 * OpenClaw Webhooks Client for ABMSignal
 * 
 * Architecture: Server A (Next.js) talks to Server B (OpenClaw) via the webhooks plugin.
 * The webhooks plugin creates TaskFlows that route to the orchestrator agent.
 * 
 * Flow:
 * 1. Next.js sends POST to /api/generate with action=create_flow
 * 2. OpenClaw creates a TaskFlow routed to the orchestrator agent
 * 3. Orchestrator processes the request, spawns sub-agents
 * 4. Next.js polls /api/status with action=find_latest_flow to check progress
 * 5. Results are stored in the flow's stateJson or written to a shared store
 */

const OPENCLAW_URL = process.env.OPENCLAW_ABMSIGNAL_URL ?? 'http://localhost:18790'
const OPENCLAW_WEBHOOK_SECRET = process.env.OPENCLAW_ABMSIGNAL_TOKEN ?? 'abmsignal-wh-secret-2026'

function buildHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-Openclaw-Webhook-Secret': OPENCLAW_WEBHOOK_SECRET,
  }
}

// ========== TaskFlow API ==========

export interface TaskFlow {
  flowId: string
  syncMode: string
  controllerId: string
  revision: number
  status: 'queued' | 'running' | 'waiting' | 'blocked' | 'done' | 'failed'
  notifyPolicy: string
  goal: string
  currentStep?: string | null
  stateJson?: unknown
  waitJson?: unknown
  createdAt: number
  updatedAt: number
}

/**
 * Create a new playbook generation TaskFlow.
 * This sends the request to the orchestrator agent via OpenClaw webhooks.
 * Two-step process: create_flow → run_task (spawns orchestrator session).
 */
export async function createPlaybookFlow(params: {
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
}): Promise<{ ok: boolean; flowId?: string; taskId?: string; error?: string }> {
  const goal = [
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
    `Return results as structured JSON.`,
  ].join('\n')

  try {
    // Step 1: Create the TaskFlow
    const flowRes = await fetch(`${OPENCLAW_URL}/api/generate`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        action: 'create_flow',
        controllerId: 'orchestrator',
        goal,
        stateJson: { playbookId: params.playbookId },
      }),
    })

    const flowData = await flowRes.json() as { ok: boolean; result?: { flow?: TaskFlow }; error?: string }
    
    if (!flowData.ok || !flowData.result?.flow?.flowId) {
      return { ok: false, error: flowData.error ?? `Flow creation failed: HTTP ${flowRes.status}` }
    }

    const flowId = flowData.result.flow.flowId

    // Step 2: Run the orchestrator agent as a task within the flow
    const taskRes = await fetch(`${OPENCLAW_URL}/api/generate`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        action: 'run_task',
        flowId,
        runtime: 'subagent',
        agentId: 'orchestrator',
        task: goal,
        label: `playbook-${params.playbookId}`,
      }),
    })

    const taskData = await taskRes.json() as { ok: boolean; result?: { task?: { taskId: string } }; error?: string }
    
    if (!taskData.ok) {
      // Flow was created but task failed — still return flowId for polling
      console.error('[createPlaybookFlow] run_task failed:', taskData.error)
      return { ok: true, flowId }
    }

    return { ok: true, flowId, taskId: taskData.result?.task?.taskId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Find the latest flow for a given controller (orchestrator).
 */
export async function findLatestFlow(): Promise<{ ok: boolean; flow?: TaskFlow | null; error?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/api/status`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ action: 'find_latest_flow' }),
    })

    const data = await res.json() as { ok: boolean; result?: { flow?: TaskFlow | null }; error?: string }
    
    if (!data.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    }

    return { ok: true, flow: data.result?.flow ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Get a specific flow by ID.
 */
export async function getFlow(flowId: string): Promise<{ ok: boolean; flow?: TaskFlow | null; error?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/api/status`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({ action: 'get_flow', flowId }),
    })

    const data = await res.json() as { ok: boolean; result?: { flow?: TaskFlow | null }; error?: string }
    
    if (!data.ok) {
      return { ok: false, error: data.error ?? `HTTP ${res.status}` }
    }

    return { ok: true, flow: data.result?.flow ?? null }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
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

// ========== Legacy hooks API (fallback) ==========

/**
 * Send a raw message to the orchestrator via the hooks API.
 * Used as a fallback if TaskFlow API is not available.
 */
export async function sendToOrchestrator(message: string): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/hooks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENCLAW_WEBHOOK_SECRET}`,
      },
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