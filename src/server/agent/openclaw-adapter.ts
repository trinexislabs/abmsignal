import { execFile } from 'child_process'
import { promisify } from 'util'
import fs from 'fs'
import path from 'path'
import { parseAgentOutput } from './agent-output-schema'
import type { ResearchOutput, WritingOutput } from './agent-output-schema'

const execFileAsync = promisify(execFile)

const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? '/home/trinexis-dgx-spark/.openclaw/bin/openclaw'
const OPENCLAW_STATE_DIR = process.env.OPENCLAW_STATE_DIR ?? '/home/trinexis-dgx-spark/.openclaw-abmsignal'
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH ?? `${OPENCLAW_STATE_DIR}/openclaw.json`
const OPENCLAW_GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? '18790'
const AGENT_TIMEOUT_MS = parseInt(process.env.AGENT_TIMEOUT_MS ?? '600000', 10) // 10 min
const LOG_DIR = process.env.LOG_DIR ?? '/tmp/abmsignal-logs'
const AGENT_ID = process.env.ORCHESTRATOR_AGENT_ID ?? 'orchestrator'

function ensureLogDir() {
  if (!fs.existsSync(LOG_DIR)) {
    fs.mkdirSync(LOG_DIR, { recursive: true })
  }
}

function saveLog(runId: string, phase: string, stdout: string, stderr: string) {
  ensureLogDir()
  const ts = Date.now()
  const logPath = path.join(LOG_DIR, `run-${runId}-${phase}-${ts}.log`)
  fs.writeFileSync(logPath, `=== STDOUT ===\n${stdout}\n\n=== STDERR ===\n${stderr}`)
  return logPath
}

type AdapterResult<T> =
  | { ok: true; data: T; rawOutput: string; logPath: string }
  | { ok: false; error: string; rawOutput: string; logPath: string }

async function runAgent(
  message: string,
  runId: string,
  phase: string,
): Promise<{ stdout: string; stderr: string; logPath: string }> {
  ensureLogDir()

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENCLAW_STATE_DIR,
    OPENCLAW_CONFIG_PATH,
    OPENCLAW_GATEWAY_PORT,
  }

  let stdout = ''
  let stderr = ''

  try {
    const result = await execFileAsync(
      OPENCLAW_BIN,
      ['agent', '--agent', AGENT_ID, '--message', message, '--json'],
      { env, timeout: AGENT_TIMEOUT_MS, maxBuffer: 50 * 1024 * 1024 },
    )
    stdout = result.stdout
    stderr = result.stderr
  } catch (err: unknown) {
    const e = err as { stdout?: string; stderr?: string; message?: string }
    stdout = e.stdout ?? ''
    stderr = e.stderr ?? (e.message ?? 'Unknown error')
    const logPath = saveLog(runId, phase, stdout, stderr)
    throw Object.assign(new Error(stderr || 'OpenClaw process failed'), { logPath, stdout })
  }

  const logPath = saveLog(runId, phase, stdout, stderr)
  return { stdout, stderr, logPath }
}

export const openclawAdapter = {
  async runResearch(
    message: string,
    runId: string,
  ): Promise<AdapterResult<ResearchOutput>> {
    let stdout = ''
    let logPath = ''

    try {
      const result = await runAgent(message, runId, 'research')
      stdout = result.stdout
      logPath = result.logPath
    } catch (err: unknown) {
      const e = err as { message?: string; logPath?: string; stdout?: string }
      const rawOutput = e.stdout ?? ''
      return {
        ok: false,
        error: e.message ?? 'OpenClaw failed',
        rawOutput,
        logPath: e.logPath ?? '',
      }
    }

    const parsed = parseAgentOutput(stdout, 'research')
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, rawOutput: stdout, logPath }
    }

    return { ok: true, data: parsed.data, rawOutput: stdout, logPath }
  },

  async runWriting(
    message: string,
    runId: string,
  ): Promise<AdapterResult<WritingOutput>> {
    let stdout = ''
    let logPath = ''

    try {
      const result = await runAgent(message, runId, 'writing')
      stdout = result.stdout
      logPath = result.logPath
    } catch (err: unknown) {
      const e = err as { message?: string; logPath?: string; stdout?: string }
      const rawOutput = e.stdout ?? ''
      return {
        ok: false,
        error: e.message ?? 'OpenClaw failed',
        rawOutput,
        logPath: e.logPath ?? '',
      }
    }

    const parsed = parseAgentOutput(stdout, 'writing')
    if (!parsed.ok) {
      return { ok: false, error: parsed.error, rawOutput: stdout, logPath }
    }

    return { ok: true, data: parsed.data, rawOutput: stdout, logPath }
  },

  async healthCheck(): Promise<boolean> {
    const openclaw_url = process.env.OPENCLAW_ABMSIGNAL_URL ?? 'http://localhost:18790'
    try {
      const res = await fetch(`${openclaw_url}/health`, { signal: AbortSignal.timeout(3000) })
      return res.ok
    } catch {
      return false
    }
  },
}
