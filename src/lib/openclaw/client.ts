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
    `Execute PHASE 1 ONLY of the ABM playbook generation pipeline:`,
    `1. Research the target account (Researcher agent)`,
    `   - Discover key contacts, company intelligence, buying signals`,
    `   - Store contacts via POST /api/playbooks/${params.playbookId}/contacts/add (if available)`,
    `   - Update progress via PATCH /api/playbooks/${params.playbookId}`,
    ``,
    `MANDATORY STOP: After research is complete, you MUST:`,
    `   a) Set playbook status to "contact_review" via PATCH /api/playbooks/${params.playbookId}`,
    `      with body: {"status":"contact_review","progress_pct":25,"agent_status":[...]}`,
    `   b) STOP IMMEDIATELY. Do NOT proceed to writing or reviewing.`,
    ``,
    `The system will invoke a separate task for phases 2-4 after the human reviews contacts.`,
    `Do not attempt to do writing or reviewing in this invocation.`,
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
 * Continue a playbook flow after human contact review is approved.
 * Runs a new orchestrator task in the existing flow for writing + reviewing phases.
 */
export async function continuePlaybookFlow(params: {
  flowId: string
  playbookId: string
}): Promise<{ ok: boolean; taskId?: string; error?: string }> {
  const goal = [
    `CONTINUE ABM PLAYBOOK (PHASES 2-4) — ID: ${params.playbookId}`,
    ``,
    `Human contact review is complete and contacts are approved.`,
    `The playbook status is now "writing". Execute phases 2-4:`,
    ``,
    `2. Write all 18 playbook sections (Writer agent)`,
    `   - Fetch the approved contacts from GET /api/playbooks/${params.playbookId}/contacts`,
    `   - Generate hyper-personalized content for each section`,
    `   - Update progress via PATCH /api/playbooks/${params.playbookId}`,
    ``,
    `3. Review with 16-point quality checklist (Reviewer agent)`,
    `   - Verify accuracy, personalization, cultural fit, and completeness`,
    `   - Update quality_checks in the playbook`,
    ``,
    `4. Set status to "complete" with 100% progress`,
    ``,
    `Update playbook status throughout via PATCH /api/playbooks/${params.playbookId}.`,
  ].join('\n')

  try {
    const taskRes = await fetch(`${OPENCLAW_URL}/api/generate`, {
      method: 'POST',
      headers: buildHeaders(),
      body: JSON.stringify({
        action: 'run_task',
        flowId: params.flowId,
        runtime: 'subagent',
        agentId: 'orchestrator',
        task: goal,
        label: `playbook-${params.playbookId}-writing`,
      }),
    })

    const taskData = await taskRes.json() as { ok: boolean; result?: { task?: { taskId: string } }; error?: string }

    if (!taskData.ok) {
      return { ok: false, error: taskData.error ?? `run_task failed: HTTP ${taskRes.status}` }
    }

    return { ok: true, taskId: taskData.result?.task?.taskId }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : 'Unknown error' }
  }
}

/**
 * Find the latest flow for a given controller (orchestrator).
 */
export async function findLatestFlow(): Promise<{ ok: boolean; flow?: TaskFlow | null; error?: string }> {
  try {
    const res = await fetch(`${OPENCLAW_URL}/api/generate`, {
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
    const res = await fetch(`${OPENCLAW_URL}/api/generate`, {
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

// ========== Task runner (used by workers) ==========

const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS ?? '600000', 10)

// Path to the openclaw binary and its state directory.
// Override via OPENCLAW_BIN / OPENCLAW_STATE_DIR env vars if the install location differs.
const OPENCLAW_BIN =
  process.env.OPENCLAW_BIN ?? '/home/trinexis-dgx-spark/.openclaw/bin/openclaw'
const OPENCLAW_STATE_DIR =
  process.env.OPENCLAW_STATE_DIR ?? '/home/trinexis-dgx-spark/.openclaw-abmsignal'
const OPENCLAW_CONFIG_PATH =
  process.env.OPENCLAW_CONFIG_PATH ?? `${OPENCLAW_STATE_DIR}/openclaw.json`

/**
 * Run the orchestrator agent as an embedded local subprocess (--local flag),
 * bypassing the gateway session-routing layer which requires an active session.
 *
 * Returns the agent's text reply as rawOutput, or an error.
 * The flowId field is a synthetic ID so callers don't need branching.
 */
export async function runAgentTask(
  prompt: string,
  runId: string,
): Promise<{ ok: true; rawOutput: string; flowId: string } | { ok: false; error: string }> {
  const { execFile } = await import('child_process')
  const { promisify } = await import('util')
  const execFileAsync = promisify(execFile)

  const timeoutSeconds = Math.floor(AGENT_TIMEOUT_MS / 1000)
  const syntheticFlowId = `local-${runId}`

  // openclaw --local mode persists the orchestrator's conversation in a single
  // session file (agent:orchestrator:main) that grows across every invocation.
  // That means prior turns — e.g. a previous playbook's research output — bleed
  // into the next call's context, and the agent may echo stale phase/JSON
  // shapes back instead of responding to the new prompt. We reset the session
  // before each invocation so every prompt starts from a clean slate; the
  // prompt itself contains all the context the agent needs.
  await resetOrchestratorSession()

  let stdout = ''
  let stderr = ''
  try {
    const result = await execFileAsync(
      OPENCLAW_BIN,
      [
        'agent',
        '--agent', 'orchestrator',
        '--local',
        // Unique session per invocation so the agent's memory from a previous
        // run (e.g. another playbook's research phase) cannot bleed into this
        // one. Without this, every call shares the default "main" session.
        '--session-id', `abmsignal-${runId}`,
        '--message', prompt,
        '--json',
        '--timeout', String(timeoutSeconds),
      ],
      {
        env: {
          ...process.env,
          OPENCLAW_STATE_DIR,
          OPENCLAW_CONFIG_PATH,
        },
        maxBuffer: 50 * 1024 * 1024, // 50 MB — playbook output can be large
        timeout: AGENT_TIMEOUT_MS + 30_000, // process-level kill timeout with 30s buffer
      },
    )
    stdout = result.stdout
    stderr = result.stderr
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    // Preserve any partial output captured before the failure for diagnostics
    const e = err as { stdout?: string; stderr?: string }
    if (e.stdout) stdout = e.stdout
    if (e.stderr) stderr = e.stderr
    if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
      return { ok: false, error: `Agent task timed out after ${Math.round(AGENT_TIMEOUT_MS / 60000)}min` }
    }
    // Non-timeout subprocess failure with no recoverable output
    if (!stdout && !stderr) {
      return { ok: false, error: `Agent subprocess failed: ${msg.slice(0, 300)}` }
    }
    // Fall through — try to extract a payload from whatever was captured
  }

  // openclaw --local mode writes the JSON envelope to STDERR (after log lines),
  // while gateway mode writes it to STDOUT. Support both.
  // Envelope shapes:
  //   gateway:  { runId, status, result: { payloads: [{ text }], meta } }
  //   --local:  { payloads: [{ text, mediaUrl }], meta }
  const rawOutput = extractAgentText(stdout) ?? extractAgentText(stderr)

  if (!rawOutput || !rawOutput.trim()) {
    const tail = (stderr || stdout || '').slice(-300).replace(/\s+/g, ' ').trim()
    return {
      ok: false,
      error: `Agent completed but returned no text payload${tail ? ` — tail: ${tail}` : ''}`,
    }
  }

  return { ok: true, rawOutput, flowId: syntheticFlowId }
}

/**
 * Wipe the orchestrator's "main" session entry so the next agent invocation
 * starts a fresh conversation. The transcript jsonl is left on disk for
 * post-hoc debugging — only the index entry that ties it to the live session
 * is removed, which is enough for the agent to start over.
 *
 * Safe to call even when sessions.json doesn't exist yet or is malformed.
 */
async function resetOrchestratorSession(): Promise<void> {
  const fs = await import('fs/promises')
  const path = await import('path')
  const sessionsPath = path.join(
    OPENCLAW_STATE_DIR,
    'agents/orchestrator/sessions/sessions.json',
  )
  try {
    const raw = await fs.readFile(sessionsPath, 'utf8')
    const data = JSON.parse(raw) as Record<string, unknown>
    if (!('agent:orchestrator:main' in data)) return
    delete data['agent:orchestrator:main']
    await fs.writeFile(sessionsPath, JSON.stringify(data, null, 2))
  } catch (err) {
    const code = (err as NodeJS.ErrnoException).code
    if (code !== 'ENOENT') {
      console.warn('[runAgentTask] session reset skipped:', (err as Error).message)
    }
  }
}

/**
 * Extract the agent's text reply from a mixed stream that may contain log
 * lines followed by a pretty-printed JSON envelope at the end.
 *
 * Tries every candidate `{` position (from the latest backward) and forward-
 * parses until one yields a balanced JSON object containing a payload.
 */
function extractAgentText(stream: string): string | null {
  if (!stream) return null

  // Collect candidate start indices: every '{' that appears at the start of a
  // line (after a newline or at the very beginning). The pretty-printed top-
  // level envelope always satisfies this.
  const candidates: number[] = []
  for (let i = 0; i < stream.length; i++) {
    if (stream[i] === '{' && (i === 0 || stream[i - 1] === '\n')) {
      candidates.push(i)
    }
  }

  // Try the latest candidates first
  for (let k = candidates.length - 1; k >= 0; k--) {
    const start = candidates[k]
    const end = findMatchingBrace(stream, start)
    if (end === -1) continue
    try {
      const envelope = JSON.parse(stream.slice(start, end + 1)) as {
        result?: { payloads?: Array<{ text?: string }> }
        payloads?: Array<{ text?: string }>
      }
      const text = envelope.result?.payloads?.[0]?.text ?? envelope.payloads?.[0]?.text
      if (typeof text === 'string') return text
    } catch {
      // Try next candidate
    }
  }
  return null
}

/** Forward-scan from a `{` to its matching `}`, respecting string literals. */
function findMatchingBrace(s: string, start: number): number {
  if (s[start] !== '{') return -1
  let depth = 0
  let inString = false
  let escape = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') depth++
    else if (c === '}') {
      depth--
      if (depth === 0) return i
    }
  }
  return -1
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