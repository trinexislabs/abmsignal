import { NextRequest, NextResponse } from 'next/server'
import { urlAnalysisQueue } from '@/server/jobs/queue'
import type { ExtractedBrief } from '@/server/agent/url-analyzer'

export type { ExtractedBrief }

// The OpenClaw CLI only exists on the HOST, not in this (web) container — so the
// AI extraction runs on the host worker. We enqueue the page text and wait for
// the result (request/response), falling back to meta tags if it fails.
async function analyzeViaWorker(pageContent: string): Promise<ExtractedBrief> {
  const job = await urlAnalysisQueue.add('analyze', { pageContent })
  const jobId = job.id
  if (!jobId) throw new Error('Failed to enqueue analysis job')

  const deadline = Date.now() + 95_000
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, 1500))
    const fresh = await urlAnalysisQueue.getJob(jobId)
    if (!fresh) continue
    const state = await fresh.getState()
    if (state === 'completed') return fresh.returnvalue as ExtractedBrief
    if (state === 'failed') throw new Error(fresh.failedReason || 'URL analysis failed')
  }
  throw new Error('URL analysis timed out')
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
    // Strip nav menus but NOT <header> — hero sections with the main headline live in <header>
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    // Preserve headings as markdown-style markers so the model can identify structure
    .replace(/<h([1-4])[^>]*>([\s\S]*?)<\/h\1>/gi, (_, level, text) =>
      '\n' + '#'.repeat(parseInt(level)) + ' ' + text.replace(/<[^>]+>/g, '').trim() + '\n',
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

  // 10 000 chars gives the model full homepage content on virtually any product site
  return (prefix + body).slice(0, 10_000)
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
    const data = await analyzeViaWorker(pageContent)
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
