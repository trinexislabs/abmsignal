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

// How often the worker polls for a cancel signal while a child runs. Bounds the
// worst-case delay between an admin delete/force-stop and the subprocess dying.
const CANCEL_POLL_MS = 10_000

// Path to the openclaw binary and its state directory.
// Override via OPENCLAW_BIN / OPENCLAW_STATE_DIR env vars if the install location differs.
const OPENCLAW_BIN =
  process.env.OPENCLAW_BIN ?? '/home/trinexis-dgx-spark/.openclaw/bin/openclaw'
const OPENCLAW_STATE_DIR =
  process.env.OPENCLAW_STATE_DIR ?? '/home/trinexis-dgx-spark/.openclaw-abmsignal'
const OPENCLAW_CONFIG_PATH =
  process.env.OPENCLAW_CONFIG_PATH ?? `${OPENCLAW_STATE_DIR}/openclaw.json`
const OPENCLAW_GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? '18790'

// A gateway-mode call that fails faster than this never reached the agent
// (gateway down / unreachable), so it is safe to retry embedded with --local.
const GATEWAY_FAST_FAIL_MS = 20_000

/**
 * Run the orchestrator agent via the running OpenClaw gateway, falling back to an
 * embedded local subprocess (--local) when the gateway is unreachable. The
 * openclaw-abmsignal gateway service holds exclusive ownership of the state dir,
 * so `--local` fails within seconds whenever it is up.
 *
 * Returns the agent's text reply as rawOutput, or an error.
 * The flowId field is a synthetic ID so callers don't need branching.
 */
export async function runAgentTask(
  prompt: string,
  runId: string,
  opts: {
    // Polled (~every CANCEL_POLL_MS) while the child runs; when it resolves true
    // the child is killed (SIGTERM → SIGKILL). Used so an admin delete/force-stop
    // can terminate a running OpenClaw subprocess (the worker owns the handle;
    // the web tier only flips the run's DB status).
    shouldCancel?: () => Promise<boolean>
    // Called once with the spawned child's pid, for observability / host-side kill.
    onProcess?: (pid: number) => void
  } = {},
): Promise<
  | { ok: true; rawOutput: string; flowId: string }
  | { ok: false; error: string; cancelled?: true }
> {
  const { spawn } = await import('child_process')

  const timeoutSeconds = Math.floor(AGENT_TIMEOUT_MS / 1000)
  const syntheticFlowId = `local-${runId}`
  const sessionId = `abmsignal-${runId}`

  // openclaw --local mode persists the orchestrator's conversation in a single
  // session file (agent:orchestrator:main) that grows across every invocation.
  // That means prior turns — e.g. a previous playbook's research output — bleed
  // into the next call's context, and the agent may echo stale phase/JSON
  // shapes back instead of responding to the new prompt. We reset the session
  // before the FIRST invocation so every prompt starts from a clean slate; the
  // prompt itself contains all the context the agent needs.
  await resetOrchestratorSession()

  // A single agent invocation against the per-run session. `resume` reuses the
  // same session WITHOUT resetting, so a follow-up message sees everything the
  // agent already did this run (its research, tool results, etc.).
  const invokeOnce = async (
    message: string,
    local = false,
  ): Promise<{ rawOutput: string | null; hardError?: string; cancelled?: true }> => {
    let stdout = ''
    let stderr = ''
    let cancelledByPoll = false

    // Spawn DETACHED so the child leads its own process group — that lets us kill
    // the WHOLE tree (openclaw + any tool subprocesses it forks) via
    // process.kill(-pid). Killing only the direct child leaves grandchildren
    // holding the stdout pipe open, so the process would hang until they exit —
    // exactly the "hung process" case this feature must defeat. We buffer
    // stdout/stderr and enforce the maxBuffer/timeout that execFile gave us.
    const MAX_BUFFER = 50 * 1024 * 1024 // 50 MB — playbook output can be large
    const run = () =>
      new Promise<{ stdout: string; stderr: string }>((resolve, reject) => {
        const child = spawn(
          OPENCLAW_BIN,
          [
            'agent',
            '--agent', 'orchestrator',
            ...(local ? ['--local'] : []),
            // Unique session per run so the agent's memory from a previous run
            // (e.g. another playbook's research phase) cannot bleed into this one.
            // Without this, every call shares the default "main" session.
            '--session-id', sessionId,
            '--message', message,
            '--json',
            '--timeout', String(timeoutSeconds),
          ],
          {
            env: { ...process.env, OPENCLAW_STATE_DIR, OPENCLAW_CONFIG_PATH, OPENCLAW_GATEWAY_PORT },
            detached: true,
            stdio: ['ignore', 'pipe', 'pipe'],
          },
        )

        let stdout = ''
        let stderr = ''
        let overflow = false
        let timedOut = false
        let settled = false

        // Kill the child's entire process group (negative pid). Best-effort.
        const killTree = (sig: NodeJS.Signals) => {
          try { if (child.pid) process.kill(-child.pid, sig) } catch { /* already gone */ }
        }

        const hardTimeout = setTimeout(() => {
          timedOut = true
          killTree('SIGKILL')
        }, AGENT_TIMEOUT_MS + 30_000)

        // Cooperative cancellation: if the run is cancelled/deleted while the
        // child runs, terminate the whole tree instead of blocking to the timeout.
        const poll = opts.shouldCancel
          ? setInterval(async () => {
              try {
                if (await opts.shouldCancel!()) {
                  cancelledByPoll = true
                  killTree('SIGTERM')
                  setTimeout(() => killTree('SIGKILL'), 5_000)
                }
              } catch { /* transient DB error — retry next tick */ }
            }, CANCEL_POLL_MS)
          : null

        const cleanup = () => {
          clearTimeout(hardTimeout)
          if (poll) clearInterval(poll)
        }

        child.stdout.on('data', (d: Buffer) => {
          stdout += d.toString()
          if (stdout.length > MAX_BUFFER && !overflow) { overflow = true; killTree('SIGKILL') }
        })
        child.stderr.on('data', (d: Buffer) => {
          stderr += d.toString()
          if (stderr.length > MAX_BUFFER && !overflow) { overflow = true; killTree('SIGKILL') }
        })

        if (child.pid) opts.onProcess?.(child.pid)

        child.on('error', (err) => {
          if (settled) return
          settled = true
          cleanup()
          reject(err) // spawn failure (e.g. ENOENT on the binary)
        })

        child.on('close', (code, signal) => {
          if (settled) return
          settled = true
          cleanup()
          if (cancelledByPoll) {
            const e = new Error('Run cancelled') as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
            e.stdout = stdout; e.stderr = stderr
            return reject(e)
          }
          if (timedOut) {
            const e = new Error('Agent task timed out') as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
            e.stdout = stdout; e.stderr = stderr
            return reject(e)
          }
          if (code === 0) return resolve({ stdout, stderr })
          const e = new Error(
            `Agent subprocess exited with code ${code}${signal ? ` (${signal})` : ''}`,
          ) as NodeJS.ErrnoException & { stdout?: string; stderr?: string }
          e.stdout = stdout; e.stderr = stderr
          reject(e)
        })
      })

    try {
      const result = await run()
      stdout = result.stdout
      stderr = result.stderr
    } catch (err) {
      if (cancelledByPoll) return { rawOutput: null, cancelled: true }
      const msg = err instanceof Error ? err.message : String(err)
      // Preserve any partial output captured before the failure for diagnostics
      const e = err as { stdout?: string; stderr?: string }
      if (e.stdout) stdout = e.stdout
      if (e.stderr) stderr = e.stderr
      if (msg.includes('ETIMEDOUT') || msg.includes('timed out')) {
        return { rawOutput: null, hardError: `Agent task timed out after ${Math.round(AGENT_TIMEOUT_MS / 60000)}min` }
      }
      // Non-timeout subprocess failure with no recoverable output
      if (!stdout && !stderr) {
        return { rawOutput: null, hardError: `Agent subprocess failed: ${msg.slice(0, 300)}` }
      }
      // Fall through — try to extract a payload from whatever was captured
    }

    // openclaw --local mode writes the JSON envelope to STDERR (after log lines),
    // while gateway mode writes it to STDOUT. Support both.
    // Envelope shapes:
    //   gateway:  { runId, status, result: { payloads: [{ text }], meta } }
    //   --local:  { payloads: [{ text, mediaUrl }], meta }
    return { rawOutput: extractAgentText(stdout) ?? extractAgentText(stderr) }
  }

  // Gateway first; if it fails fast with nothing to show (gateway down), retry
  // embedded. A slow failure means the gateway ran the agent — don't double-run.
  const invoke = async (message: string) => {
    const started = Date.now()
    const viaGateway = await invokeOnce(message, false)
    if (viaGateway.cancelled || viaGateway.rawOutput) return viaGateway
    if (Date.now() - started > GATEWAY_FAST_FAIL_MS) return viaGateway
    console.warn(`[runAgentTask] gateway call failed fast for ${sessionId}, retrying with --local`)
    return invokeOnce(message, true)
  }

  // First attempt: send the real task prompt.
  const first = await invoke(prompt)
  if (first.cancelled) {
    // Killed by an admin delete/force-stop — the caller owns cleanup, bail fast.
    return { ok: false, error: 'Run cancelled', cancelled: true }
  }
  if (first.hardError && !first.rawOutput) {
    // Timeout / subprocess crash — nudging a dead process won't help.
    return { ok: false, error: first.hardError }
  }

  let rawOutput = first.rawOutput

  // The orchestrator model (glm-5.1) intermittently ends its turn after only a
  // preamble — e.g. "Let me research Unilever thoroughly before writing." — and
  // never emits the required JSON. The work was effectively skipped, not just
  // mis-extracted. When the reply contains no JSON object, re-prompt in the SAME
  // session (the agent retains its context) and force it to output the JSON now.
  // Observed to recover reliably; research already self-heals via run retries,
  // but the writing batches do not, so this is what was failing every playbook.
  for (let nudge = 0; nudge < MAX_JSON_NUDGES && !looksLikeJsonOutput(rawOutput); nudge++) {
    const retry = await invoke(JSON_NUDGE_MESSAGE)
    if (retry.cancelled) return { ok: false, error: 'Run cancelled', cancelled: true }
    if (retry.rawOutput && retry.rawOutput.trim()) rawOutput = retry.rawOutput
  }

  if (!rawOutput || !rawOutput.trim()) {
    return {
      ok: false,
      error: 'Agent completed but returned no text payload',
    }
  }

  return { ok: true, rawOutput, flowId: syntheticFlowId }
}

// How many times to re-prompt the agent for JSON when it stalls with a preamble.
const MAX_JSON_NUDGES = 2

const JSON_NUDGE_MESSAGE =
  'Output the complete JSON object for the task above now. Respond with ONLY the ' +
  'JSON object — no preamble, no explanation, no commentary. Begin your reply with "{".'

/**
 * Heuristic: does the agent's reply actually contain a JSON object, or is it a
 * conversational stall ("Let me research X before writing.")? Mirrors the
 * extraction in parseAgentOutput — a ```json fence or a bare {...} block.
 */
function looksLikeJsonOutput(text: string | null): boolean {
  if (!text) return false
  return /```json/i.test(text) || /\{[\s\S]*\}/.test(text)
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