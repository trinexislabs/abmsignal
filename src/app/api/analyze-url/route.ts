import { NextRequest, NextResponse } from 'next/server'
import { execFile } from 'child_process'
import { promisify } from 'util'

const execFileAsync = promisify(execFile)

const OPENCLAW_BIN = process.env.OPENCLAW_BIN ?? '/home/trinexis-dgx-spark/.openclaw/bin/openclaw'
const OPENCLAW_STATE_DIR = process.env.OPENCLAW_STATE_DIR ?? '/home/trinexis-dgx-spark/.openclaw-abmsignal'
const OPENCLAW_CONFIG_PATH = process.env.OPENCLAW_CONFIG_PATH ?? `${OPENCLAW_STATE_DIR}/openclaw.json`
const OPENCLAW_GATEWAY_PORT = process.env.OPENCLAW_GATEWAY_PORT ?? '18790'
// Use the general-purpose `main` agent — NOT `orchestrator`, which is wired to
// the ABM pipeline soul and will attempt to run a playbook pipeline for any input.
const URL_ANALYSIS_AGENT_ID = process.env.URL_ANALYSIS_AGENT_ID ?? 'main'

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

// ─── HTML → readable text ──────────────────────────────────────────────────────

function extractPageContent(html: string): string {
  const ogTitle =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ?? ''
  const ogDesc =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] ?? ''
  const metaDesc =
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1] ?? ''
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() ?? ''

  let prefix = ''
  if (ogTitle || titleTag) prefix += `TITLE: ${ogTitle || titleTag}\n`
  if (ogDesc || metaDesc) prefix += `META DESCRIPTION: ${ogDesc || metaDesc}\n\n`

  const body = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript\b[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header\b[\s\S]*?<\/header>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<h([1-3])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) =>
      '\n' + '#'.repeat(parseInt(level)) + ' ' + text.replace(/<[^>]+>/g, '') + '\n',
    )
    .replace(/<li[^>]*>/gi, '\n• ')
    .replace(/<p[^>]*>/gi, '\n')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&[a-z]+;/gi, ' ').replace(/&#\d+;/g, ' ')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim()

  return (prefix + body).slice(0, 5000)
}

// ─── Meta-tag fallback when AI fails ─────────────────────────────────────────

function extractMetaOnly(html: string): ExtractedBrief {
  const ogTitle =
    html.match(/<meta[^>]+property="og:title"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:title"/i)?.[1] ?? ''
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)?.[1]?.trim() ?? ''
  const cleanName = (ogTitle || titleTag).split(/\s*[\|—\-–]\s*/)[0].trim()

  const ogDesc =
    html.match(/<meta[^>]+property="og:description"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+property="og:description"/i)?.[1] ?? ''
  const metaDesc =
    html.match(/<meta[^>]+name="description"[^>]+content="([^"]+)"/i)?.[1] ??
    html.match(/<meta[^>]+content="([^"]+)"[^>]+name="description"/i)?.[1] ?? ''

  return {
    product_name: cleanName,
    description: ogDesc || metaDesc || '',
    value_propositions: [],
    target_personas: '',
    differentiators: '',
    competitors: '',
    deployment_model: 'saas',
    deal_size: '<50k',
    sales_cycle: '30-90d',
  }
}

// ─── AI extraction via the `main` general-purpose agent ───────────────────────

async function analyzeWithAgent(pageContent: string): Promise<ExtractedBrief> {
  const message = [
    `You are a product intelligence analyst. Extract structured product information from the webpage content below.`,
    `Return ONLY a JSON code block. No other text before or after it.`,
    ``,
    `## Webpage Content`,
    pageContent,
    ``,
    `## Return this exact JSON structure:`,
    `\`\`\`json`,
    `{`,
    `  "product_name": "Short clean product name (no taglines)",`,
    `  "description": "2-3 sentences: what it does, who it's for, core value",`,
    `  "value_propositions": ["Specific measurable outcome 1", "Outcome 2", "Outcome 3"],`,
    `  "target_personas": "Job Title 1, Job Title 2, Job Title 3",`,
    `  "differentiators": "What sets this apart from alternatives",`,
    `  "competitors": "Competitor A, Competitor B",`,
    `  "deployment_model": "saas",`,
    `  "deal_size": "50k-250k",`,
    `  "sales_cycle": "30-90d"`,
    `}`,
    `\`\`\``,
    ``,
    `Field rules:`,
    `- product_name: brand name only`,
    `- value_propositions: 3-5 items, specific outcomes with numbers/metrics where visible`,
    `- target_personas: comma-separated job titles (e.g. "CTO, Head of Engineering, VP Product")`,
    `- deployment_model: one of exactly — saas | on-prem | hybrid | open-source`,
    `- deal_size: one of exactly — <50k | 50k-250k | 250k-1m | 1m+`,
    `- sales_cycle: one of exactly — <30d | 30-90d | 90-180d | 180d+`,
    `- competitors: empty string "" if none found`,
  ].join('\n')

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    OPENCLAW_STATE_DIR,
    OPENCLAW_CONFIG_PATH,
    OPENCLAW_GATEWAY_PORT,
  }

  const { stdout } = await execFileAsync(
    OPENCLAW_BIN,
    ['agent', '--agent', URL_ANALYSIS_AGENT_ID, '--message', message, '--json'],
    { env, timeout: 90_000, maxBuffer: 10 * 1024 * 1024 },
  )

  // Unwrap OpenClaw JSON envelope
  let agentText = stdout
  try {
    const envelope = JSON.parse(stdout) as { result?: { payloads?: Array<{ text?: string }> } }
    const text = envelope.result?.payloads?.[0]?.text
    if (typeof text === 'string') agentText = text
  } catch {
    // Raw stdout — use as-is
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

// ─── Route handler ────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  let url: string | undefined
  try {
    ;({ url } = await req.json() as { url?: string })
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid request body' }, { status: 400 })
  }

  if (!url?.trim()) {
    return NextResponse.json({ ok: false, error: 'URL is required' }, { status: 400 })
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
    if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'Invalid URL — must start with http:// or https://' },
      { status: 400 },
    )
  }

  // Fetch the page server-side (avoids CORS, follows redirects)
  let html = ''
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15_000)
    const res = await fetch(parsedUrl.toString(), {
      signal: controller.signal,
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; ABMSignal/1.0)',
        'Accept': 'text/html,application/xhtml+xml,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
    })
    clearTimeout(timer)

    if (!res.ok) {
      return NextResponse.json({ ok: false, error: `Page returned HTTP ${res.status}` }, { status: 422 })
    }
    const ct = res.headers.get('content-type') ?? ''
    if (!ct.includes('html')) {
      return NextResponse.json({ ok: false, error: 'URL does not appear to be an HTML page' }, { status: 422 })
    }
    html = await res.text()
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ ok: false, error: `Could not reach URL: ${msg}` }, { status: 422 })
  }

  const pageContent = extractPageContent(html)

  // Try AI analysis with the general-purpose agent; fall back to meta-tag extraction
  try {
    const data = await analyzeWithAgent(pageContent)
    return NextResponse.json({ ok: true, data, source: 'ai' })
  } catch (agentErr) {
    console.error('[analyze-url] AI analysis failed, falling back to meta extraction:', agentErr)
    const data = extractMetaOnly(html)
    if (!data.product_name) {
      return NextResponse.json(
        { ok: false, error: 'Could not extract product info from this page. Try Form Mode.' },
        { status: 422 },
      )
    }
    return NextResponse.json({ ok: true, data, source: 'meta' })
  }
}
