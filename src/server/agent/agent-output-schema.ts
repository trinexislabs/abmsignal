import { z } from 'zod'

// ─── Research output (Phase 1) ────────────────────────────────────────────────

const ContactSchema = z.object({
  name: z.string().min(1),
  title: z.string().min(1),
  company: z.string().default(''),
  linkedin_url: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  rationale: z.string().optional(),
  source_urls: z.array(z.string()).default([]),
  confidence: z.enum(['high', 'medium', 'low']).default('medium'),
})

const ResearchSourceSchema = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  publisher: z.string().optional(),
  note: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
})

export const ResearchOutputSchema = z.object({
  phase: z.literal('research'),
  status: z.string().default('contact_review'),
  progress_pct: z.number().min(0).max(100).default(60),
  agent_status: z.string().optional(),
  contacts: z.array(ContactSchema).min(1, 'At least one contact is required'),
  sources: z.array(ResearchSourceSchema).default([]),
})

export type ResearchOutput = z.infer<typeof ResearchOutputSchema>

// ─── Writing output (Phase 2) ─────────────────────────────────────────────────

const WritingSourceSchema = z.object({
  url: z.string().min(1),
  title: z.string().optional(),
  publisher: z.string().optional(),
  note: z.string().optional(),
  claim: z.string().optional(),
  confidence: z.enum(['high', 'medium', 'low']).optional(),
})

const SectionSchema = z.object({
  section_key: z.string().min(1),
  title: z.string().min(1),
  content_markdown: z.string().min(1),
  order_index: z.number().int().min(1),
  sources: z.array(WritingSourceSchema).default([]),
})

export const WritingOutputSchema = z.object({
  phase: z.literal('writing'),
  status: z.string().default('complete'),
  progress_pct: z.number().min(0).max(100).default(100),
  agent_status: z.string().optional(),
  sections: z.array(SectionSchema).min(1, 'At least one section is required'),
})

export type WritingOutput = z.infer<typeof WritingOutputSchema>

// ─── Partial section recovery (truncated JSON fallback) ──────────────────────

/**
 * When the agent output JSON is truncated mid-stream, try to extract every
 * complete section object that was fully written before the cut-off point.
 * Returns an empty array if nothing can be salvaged.
 */
function recoverPartialSections(raw: string): z.infer<typeof SectionSchema>[] {
  const recovered: z.infer<typeof SectionSchema>[] = []

  // Find every position where a section object starts
  const sectionStart = /\{\s*"section_key"\s*:/g
  let match: RegExpExecArray | null

  while ((match = sectionStart.exec(raw)) !== null) {
    const start = match.index
    let depth = 0
    let inString = false
    let escaped = false
    let end = -1

    for (let i = start; i < raw.length; i++) {
      const ch = raw[i]
      if (escaped) { escaped = false; continue }
      if (ch === '\\') { escaped = true; continue }
      if (ch === '"') { inString = !inString; continue }
      if (inString) continue
      if (ch === '{') depth++
      else if (ch === '}') {
        depth--
        if (depth === 0) { end = i; break }
      }
    }

    if (end === -1) continue // Object was cut off — skip

    try {
      const obj = JSON.parse(raw.slice(start, end + 1)) as unknown
      const result = SectionSchema.safeParse(obj)
      if (result.success) recovered.push(result.data)
    } catch {
      // Unparseable even though braces balanced — skip
    }
  }

  return recovered
}

// ─── Generic parser ───────────────────────────────────────────────────────────

export function parseAgentOutput(
  raw: string,
  phase: 'research',
): { ok: true; data: ResearchOutput } | { ok: false; error: string }

export function parseAgentOutput(
  raw: string,
  phase: 'writing',
): { ok: true; data: WritingOutput } | { ok: false; error: string }

export function parseAgentOutput(raw: string, phase: 'research' | 'writing') {
  // Extract JSON block from agent output — agent may include prose before/after
  const jsonMatch = raw.match(/```json\s*([\s\S]*?)\s*```/) ??
                    raw.match(/(\{[\s\S]*\})/)
  const jsonStr = jsonMatch ? jsonMatch[1] ?? jsonMatch[0] : raw.trim()

  let parsed: unknown
  try {
    parsed = JSON.parse(jsonStr)
  } catch {
    // JSON is truncated. For writing phase, attempt to salvage completed sections
    // rather than failing the entire run.
    if (phase === 'writing') {
      const recovered = recoverPartialSections(raw)
      if (recovered.length > 0) {
        const synthetic: WritingOutput = {
          phase: 'writing',
          status: 'complete',
          progress_pct: 100,
          agent_status: `Partial recovery: ${recovered.length} sections salvaged`,
          sections: recovered,
        }
        return { ok: true, data: synthetic }
      }
    }
    return { ok: false, error: `Failed to parse JSON from agent output: ${jsonStr.slice(0, 200)}` }
  }

  const schema = phase === 'research' ? ResearchOutputSchema : WritingOutputSchema
  const result = schema.safeParse(parsed)

  if (!result.success) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const issues = result.error.issues.map((e: any) => `${(e.path as (string | number)[]).join('.')}: ${e.message as string}`).join('; ')
    return { ok: false, error: `Agent output validation failed: ${issues}` }
  }

  return { ok: true, data: result.data }
}
