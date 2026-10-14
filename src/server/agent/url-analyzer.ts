import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

// Runs on the HOST (worker process) because it execs the local OpenClaw CLI.
const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? '/home/trinexis-dgx-spark/.openclaw/bin/openclaw'
const OPENCLAW_STATE_DIR = process.env.OPENCLAW_STATE_DIR ?? '/home/trinexis-dgx-spark/.openclaw-abmsignal'
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH ?? `${OPENCLAW_STATE_DIR}/openclaw.json`
const OPENCLAW_GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? '18790'
// Dedicated product-analyst agent — NOT `orchestrator`, which runs the full ABM pipeline.
const URL_ANALYSIS_AGENT_ID = process.env.URL_ANALYSIS_AGENT_ID ?? 'product-analyst'

export interface ExtractedBrief {
  product_name: string
  description: string
  value_propositions: string[]
  target_personas: string
  differentiators: string
  competitors: string
  deployment_model: string
  deal_size: string
  sales_cycle: string
}

function buildPrompt(pageContent: string): string {
  return [
    `You are a product intelligence analyst. Your job is to extract structured product information STRICTLY from the webpage content below.`,
    ``,
    `CRITICAL RULES:`,
    `- Extract ONLY what is explicitly stated on the page. Do NOT infer, guess, or fabricate details.`,
    `- value_propositions must use the product's own language and claims — copy phrases directly from the page where possible.`,
    `- If a field cannot be determined from the page content, use the default value shown below. Never invent values.`,
    `- Return ONLY a valid JSON code block. No other text, no explanation, no preamble.`,
    ``,
    `## Webpage Content`,
    pageContent,
    ``,
    `## Return this exact JSON structure:`,
    `\`\`\`json`,
    `{`,
    `  "product_name": "Brand name only — no taglines or slogans",`,
    `  "description": "2-3 sentences using the page's own words: what it does, who it serves, core outcome",`,
    `  "value_propositions": ["Specific claim from the page", "Second claim", "Third claim"],`,
    `  "target_personas": "Comma-separated job titles explicitly mentioned or strongly implied",`,
    `  "differentiators": "Features or positioning the page explicitly contrasts with alternatives",`,
    `  "competitors": "Competitor names only if explicitly mentioned — empty string if none",`,
    `  "deployment_model": "saas",`,
    `  "deal_size": "",`,
    `  "sales_cycle": ""`,
    `}`,
    `\`\`\``,
    ``,
    `Enum constraints (use empty string "" if not determinable from page):`,
    `- deployment_model: saas | on-prem | hybrid | open-source`,
    `- deal_size: <50k | 50k-250k | 250k-1m | 1m+ | ""`,
    `- sales_cycle: <30d | 30-90d | 90-180d | 180d+ | ""`,
    `- value_propositions: minimum 2, maximum 6 items, all sourced from explicit page claims`,
  ].join('\n')
}

/** Forward-scan from a `{` to its matching `}`, respecting string literals. */
function findMatchingBrace(s: string, start: number): number {
  let depth = 0, inString = false, escape = false
  for (let i = start; i < s.length; i++) {
    const c = s[i]
    if (escape) { escape = false; continue }
    if (c === '\\') { escape = true; continue }
    if (c === '"') { inString = !inString; continue }
    if (inString) continue
    if (c === '{') depth++
    else if (c === '}') { depth--; if (depth === 0) return i }
  }
  return -1
}

// --local writes the JSON envelope to STDERR (after logs); gateway mode to STDOUT.
// Envelope shapes: gateway { result: { payloads:[{text}] } } · --local { payloads:[{text}] }.
function extractAgentText(stdout: string, stderr: string): string | null {
  for (const stream of [stderr, stdout]) {
    if (!stream) continue
    const candidates: number[] = []
    for (let i = 0; i < stream.length; i++) {
      if (stream[i] === '{' && (i === 0 || stream[i - 1] === '\n')) candidates.push(i)
    }
    for (let k = candidates.length - 1; k >= 0; k--) {
      const end = findMatchingBrace(stream, candidates[k])
      if (end === -1) continue
      try {
        const env = JSON.parse(stream.slice(candidates[k], end + 1)) as {
          result?: { payloads?: Array<{ text?: string }> }
          payloads?: Array<{ text?: string }>
        }
        const text = env.result?.payloads?.[0]?.text ?? env.payloads?.[0]?.text
        if (typeof text === 'string') return text
      } catch {
        // try next candidate
      }
    }
  }
  return null
}

// Exec the product-analyst agent once and return its reply text.
// `local: false` routes through the running gateway; `local: true` embeds the
// agent in this process, which OpenClaw refuses while a gateway owns the state dir.
async function invokeAgent(message: string, sessionId: string, local: boolean): Promise<string> {
  const env: NodeJS.ProcessEnv = { ...process.env, OPENCLAW_STATE_DIR, OPENCLAW_CONFIG_PATH, OPENCLAW_GATEWAY_PORT }
  const { stdout, stderr } = await execFileAsync(
    OPENCLAW_BIN,
    [
      'agent', '--agent', URL_ANALYSIS_AGENT_ID,
      ...(local ? ['--local'] : []),
      '--session-id', `url-${sessionId}`,
      '--message', message,
      '--json', '--timeout', '85',
    ],
    { env, timeout: 90_000, maxBuffer: 10 * 1024 * 1024 },
  )
  return extractAgentText(stdout, stderr) ?? stdout
}

// Runs the product-analyst agent (isolated session) and returns a brief.
// Gateway first — the openclaw-abmsignal gateway service holds exclusive ownership
// of the state dir, so `--local` fails fast whenever it is up. If the gateway call
// fails quickly (gateway down), retry embedded with `--local`.
// Throws if OpenClaw fails or returns no parseable JSON — callers fall back to meta tags.
export async function analyzePageContent(pageContent: string, sessionId: string): Promise<ExtractedBrief> {
  const message = buildPrompt(pageContent)
  const started = Date.now()
  let agentText: string
  try {
    agentText = await invokeAgent(message, sessionId, false)
  } catch (gatewayErr) {
    // A slow failure means the gateway ran the agent and it timed out — retrying
    // embedded would blow the web route's 95s wait, so only retry fast failures.
    if (Date.now() - started > 20_000) throw gatewayErr
    console.warn('[url-analyzer] gateway call failed, retrying with --local:', (gatewayErr as Error).message.slice(0, 300))
    agentText = await invokeAgent(message, sessionId, true)
  }

  const jsonMatch =
    agentText.match(/```json\s*([\s\S]*?)\s*```/) ??
    agentText.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? (jsonMatch[1] ?? jsonMatch[0]) : agentText.trim()
  const parsed = JSON.parse(jsonStr) as Partial<ExtractedBrief>

  return {
    product_name: parsed.product_name ?? '',
    description: parsed.description ?? '',
    value_propositions: Array.isArray(parsed.value_propositions) ? parsed.value_propositions : [],
    target_personas: parsed.target_personas ?? '',
    differentiators: parsed.differentiators ?? '',
    competitors: parsed.competitors ?? '',
    deployment_model: parsed.deployment_model ?? 'saas',
    deal_size: parsed.deal_size ?? '<50k',
    sales_cycle: parsed.sales_cycle ?? '30-90d',
  }
}
