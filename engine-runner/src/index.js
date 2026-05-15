/**
 * ABMSignal Engine Runner v2
 * 
 * Real-time bridge between the Next.js app and OpenClaw agent cluster.
 * 
 * Architecture:
 * - Lightweight Express server on Server B (alongside OpenClaw)
 * - When Next.js creates a TaskFlow, it calls POST /invoke on the Engine Runner
 * - Engine Runner spawns `openclaw agent --agent orchestrator --message <goal>`
 *   as a detached background process via the CLI
 * - The orchestrator processes the playbook, spawns sub-agents via sessions_spawn
 * - Next.js polls GET /api/playbooks/[id]/flow for progress
 * 
 * Why CLI instead of WebSocket?
 * - OpenClaw's gateway WebSocket uses a proprietary protocol
 * - The `openclaw agent` CLI handles all the connection/auth/session logic
 * - It's fire-and-forget: we spawn it, it runs, agent updates flow status
 * - No persistent connection to maintain, no reconnection logic needed
 */

const express = require('express')
const { spawn } = require('child_process')
const fs = require('fs')
const path = require('path')
const os = require('os')

// ========== Load .env ==========

function loadEnv() {
  const envPath = path.join(__dirname, '..', '.env')
  if (fs.existsSync(envPath)) {
    const content = fs.readFileSync(envPath, 'utf-8')
    for (const line of content.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const eq = trimmed.indexOf('=')
      if (eq === -1) continue
      const key = trimmed.slice(0, eq).trim()
      const val = trimmed.slice(eq + 1).trim()
      if (!(key in process.env)) {
        process.env[key] = val
      }
    }
  }
}
loadEnv()

// ========== Configuration ==========

const CONFIG = {
  port: parseInt(process.env.ENGINE_RUNNER_PORT || '18791', 10),
  apiKey: process.env.ENGINE_RUNNER_API_KEY || 'abmsignal-engine-runner-2026',
  
  // OpenClaw
  openclawHttpUrl: process.env.OPENCLAW_HTTP_URL || 'http://localhost:18790',
  openclawWebhookSecret: process.env.OPENCLAW_WEBHOOK_SECRET || 'abmsignal-wh-secret-2026',
  nextjsUrl: process.env.NEXTJS_URL || 'http://localhost:3738',
  openclawStateDir: process.env.OPENCLAW_STATE_DIR || '/home/trinexis-dgx-spark/.openclaw-abmsignal',
  openclawConfigPath: process.env.OPENCLAW_CONFIG_PATH || '/home/trinexis-dgx-spark/.openclaw-abmsignal/openclaw.json',
  openclawBin: process.env.OPENCLAW_BIN || '/home/trinexis-dgx-spark/.openclaw/bin/openclaw',
  
  // Agent
  orchestratorAgentId: process.env.ORCHESTRATOR_AGENT_ID || 'orchestrator',
  agentTimeoutMs: parseInt(process.env.AGENT_TIMEOUT_MS || '600000', 10), // 10 min
  
  // Logging
  logDir: process.env.LOG_DIR || '/tmp/abmsignal-engine-runner',
}

// ========== TaskFlow API (HTTP) ==========

async function taskflowRequest(action, extraParams = {}) {
  const body = { action, ...extraParams }
  
  const res = await fetch(`${CONFIG.openclawHttpUrl}/api/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-Openclaw-Webhook-Secret': CONFIG.openclawWebhookSecret,
    },
    body: JSON.stringify(body),
  })
  
  const data = await res.json()
  
  if (!data.ok) {
    throw new Error(data.error || `TaskFlow API error: HTTP ${res.status}`)
  }
  
  return data.result
}

// ========== Active Invocations ==========

// Track active orchestrator processes
const activeInvocations = new Map()

// ========== Orchestrator Invocation ==========

/**
 * Invoke the orchestrator agent via the OpenClaw CLI.
 * 
 * This spawns `openclaw agent --agent orchestrator --message <message> --json`
 * as a detached background process. The orchestrator will:
 * 1. Receive the message
 * 2. Process the playbook generation request
 * 3. Spawn sub-agents (researcher, writer, reviewer)
 * 4. Update the TaskFlow status as it progresses
 * 5. Write results to the flow's stateJson
 * 
 * We don't wait for the process to finish — Next.js polls the flow status.
 */
function invokeOrchestrator(flowId, playbookId, goal) {
  const defaultMessage = `GENERATE ABM PLAYBOOK

Playbook ID: ${playbookId}
Flow ID: ${flowId}

NEXTJS_API_URL: ${CONFIG.nextjsUrl}

You are running in embedded mode. Process this playbook request end-to-end.
Use curl to call the Next.js API to update status, push contacts, and submit sections.

CRITICAL API ENDPOINTS (use curl with JSON payloads):
- GET  ${CONFIG.nextjsUrl}/api/playbooks/${playbookId}/status  — check current status
- POST ${CONFIG.nextjsUrl}/api/playbooks/${playbookId}/contacts/review  — submit contacts (body: {contacts: [...]})
- PATCH ${CONFIG.nextjsUrl}/api/playbooks/${playbookId}  — update playbook fields

Read your SOUL.md for full instructions on the playbook generation pipeline.`
  const message = goal || defaultMessage
  
  const env = {
    ...process.env,
    OPENCLAW_STATE_DIR: CONFIG.openclawStateDir,
    OPENCLAW_CONFIG_PATH: CONFIG.openclawConfigPath,
  }
  
  // Log file for this invocation
  if (!fs.existsSync(CONFIG.logDir)) {
    fs.mkdirSync(CONFIG.logDir, { recursive: true })
  }
  const logFile = path.join(CONFIG.logDir, `flow-${flowId}-${Date.now()}.log`)
  
  console.log(`[engine-runner] Spawning orchestrator for flow ${flowId}, log: ${logFile}`)
  
  const args = [
    'agent',
    '--agent', CONFIG.orchestratorAgentId,
    '--message', message,
    '--local',
    '--json',
  ]
  
  const logStream = fs.openSync(logFile, 'a')
  const errStream = fs.openSync(logFile, 'a')
  
  const child = spawn(CONFIG.openclawBin, args, {
    env,
    stdio: ['ignore', logStream, errStream],
    detached: true,
  })
  
  // Close the file descriptors in the parent process
  fs.closeSync(logStream)
  fs.closeSync(errStream)
  
  child.unref()
  
  // Track the invocation
  const invocation = {
    pid: child.pid,
    flowId,
    playbookId,
    logFile,
    startedAt: new Date().toISOString(),
  }
  activeInvocations.set(flowId, invocation)
  
  // Clean up when process exits
  child.on('exit', (code) => {
    console.log(`[engine-runner] Orchestrator process for flow ${flowId} exited with code ${code}`)
    activeInvocations.delete(flowId)
  })
  
  child.on('error', (err) => {
    console.error(`[engine-runner] Orchestrator process error for flow ${flowId}:`, err.message)
    activeInvocations.delete(flowId)
  })
  
  return invocation
}

// ========== Express Server ==========

const app = express()
app.use(express.json())

// Auth middleware
function authCheck(req, res, next) {
  const authHeader = req.headers['authorization']
  const apiKey = req.headers['x-api-key']
  
  if (authHeader !== `Bearer ${CONFIG.apiKey}` && apiKey !== CONFIG.apiKey) {
    return res.status(401).json({ error: 'Unauthorized' })
  }
  next()
}

// Health check
app.get('/health', (_req, res) => {
  res.json({
    ok: true,
    service: 'abmsignal-engine-runner',
    version: '2.0.0',
    openclaw: CONFIG.openclawHttpUrl,
    agent: CONFIG.orchestratorAgentId,
    activeInvocations: activeInvocations.size,
    uptime: Math.floor(process.uptime()),
  })
})

// Invoke orchestrator (fire-and-forget)
app.post('/invoke', authCheck, async (req, res) => {
  const { flowId, playbookId, goal } = req.body
  
  if (!flowId) {
    return res.status(400).json({ error: 'flowId is required' })
  }
  
  try {
    // First, verify the flow exists
    const flow = await taskflowRequest('get_flow', { flowId })
    if (!flow) {
      return res.status(404).json({ error: 'Flow not found', flowId })
    }
    
    // Check if there's already an active invocation for this flow
    if (activeInvocations.has(flowId)) {
      return res.status(409).json({ 
        error: 'Flow already being processed', 
        flowId,
        invocation: activeInvocations.get(flowId),
      })
    }
    
    // Fire-and-forget: spawn the orchestrator
    const invocation = invokeOrchestrator(flowId, playbookId, goal)
    
    res.json({
      ok: true,
      flowId,
      method: 'cli-async',
      pid: invocation.pid,
      logFile: invocation.logFile,
      note: 'Orchestrator invoked. Poll flow status for progress.',
    })
  } catch (err) {
    console.error(`[engine-runner] Invoke failed for flow ${flowId}:`, err.message)
    res.status(500).json({ ok: false, error: err.message, flowId })
  }
})

// Get flow status (proxy to OpenClaw TaskFlow API)
app.post('/flow-status', authCheck, async (req, res) => {
  const { flowId, action = 'get_flow' } = req.body
  
  try {
    const result = await taskflowRequest(action, { flowId })
    res.json({ ok: true, result })
  } catch (err) {
    res.status(500).json({ ok: false, error: err.message })
  }
})

// List active invocations
app.get('/invocations', authCheck, (_req, res) => {
  res.json({
    ok: true,
    active: Array.from(activeInvocations.entries()).map(([flowId, inv]) => ({
      flowId,
      pid: inv.pid,
      playbookId: inv.playbookId,
      logFile: inv.logFile,
      startedAt: inv.startedAt,
    })),
  })
})

// ========== Start ==========

function start() {
  console.log(`[engine-runner] ABMSignal Engine Runner v2.0.0`)
  console.log(`[engine-runner] Port: ${CONFIG.port}`)
  console.log(`[engine-runner] OpenClaw: ${CONFIG.openclawHttpUrl}`)
  console.log(`[engine-runner] Agent: ${CONFIG.orchestratorAgentId}`)
  console.log(`[engine-runner] CLI: ${CONFIG.openclawBin}`)
  console.log(`[engine-runner] Log dir: ${CONFIG.logDir}`)
  
  app.listen(CONFIG.port, '0.0.0.0', () => {
    console.log(`[engine-runner] HTTP server listening on 0.0.0.0:${CONFIG.port}`)
    console.log(`[engine-runner] Endpoints: GET /health, POST /invoke, POST /flow-status, GET /invocations`)
  })
}

start()