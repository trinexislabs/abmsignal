/**
 * Migration script: data/playbooks.json → SQLite (Prisma)
 *
 * Run with:
 *   npx tsx scripts/migrate-from-json.ts
 *
 * or:
 *   npx ts-node --project tsconfig.json scripts/migrate-from-json.ts
 */

import fs from 'fs'
import path from 'path'
import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../src/generated/prisma/client'

const url = process.env.DATABASE_URL ?? 'file:./prisma/dev.db'
const adapter = new PrismaLibSql({ url })
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new (PrismaClient as any)({ adapter }) as InstanceType<typeof PrismaClient>
const STORE_FILE = path.join(process.cwd(), 'data', 'playbooks.json')

interface LegacyPlaybook {
  id: string
  user_id?: string
  product_name?: string
  product_url?: string
  product_brief?: Record<string, unknown>
  target_company?: string
  target_url?: string
  industry?: string
  geography?: string
  priority_tier?: string
  status?: string
  progress_pct?: number
  agent_status?: unknown[]
  sections?: LegacySection[]
  contacts?: LegacyContact[]
  openclaw_session_id?: string
  phase_started_at?: string
  created_at?: string
  updated_at?: string
}

interface LegacySection {
  id?: string
  section_type?: string
  title?: string
  content?: string
  status?: string
  sources?: LegacySource[]
  created_at?: string
}

interface LegacyContact {
  id?: string
  name?: string
  title?: string
  linkedin_url?: string
  email?: string
  confidence?: string
  source?: string
  verification_status?: string
  notes?: string
  personalization_signals?: unknown[]
  direct_quotes?: unknown[]
  created_at?: string
}

interface LegacySource {
  id?: string
  claim?: string
  source_url?: string
  confidence?: string
  verification_status?: string
}

const SECTION_ORDER: Record<string, number> = {
  executive_summary: 1,
  account_intelligence: 2,
  buying_committee: 3,
  why_now: 4,
  competitive_landscape: 5,
  cultural_context: 6,
  outreach_strategy: 7,
  personalized_sequences: 8,
  battle_cards: 9,
  content_strategy: 10,
  measurement_framework: 11,
  appendix: 12,
}

async function migrate() {
  if (!fs.existsSync(STORE_FILE)) {
    console.log(`[migrate] No legacy file found at ${STORE_FILE} — nothing to migrate.`)
    return
  }

  const raw = fs.readFileSync(STORE_FILE, 'utf-8')
  let data: Record<string, LegacyPlaybook>
  try {
    data = JSON.parse(raw) as Record<string, LegacyPlaybook>
  } catch (err) {
    console.error('[migrate] Failed to parse playbooks.json:', err)
    process.exit(1)
  }

  const entries = Object.entries(data)
  console.log(`[migrate] Found ${entries.length} playbook(s) to migrate.`)

  let migrated = 0
  let skipped = 0

  for (const [jsonId, pb] of entries) {
    const id = pb.id ?? jsonId

    const existing = await prisma.playbook.findUnique({ where: { id } })
    if (existing) {
      console.log(`[migrate] Skipping ${id} — already in database.`)
      skipped++
      continue
    }

    try {
      await prisma.$transaction(async (tx) => {
        // Create the playbook
        await tx.playbook.create({
          data: {
            id,
            userId: pb.user_id ?? 'usr_demo',
            productName: pb.product_name ?? 'Unknown',
            productUrl: pb.product_url ?? null,
            productBrief: JSON.stringify(pb.product_brief ?? {}),
            targetCompany: pb.target_company ?? 'Unknown',
            targetUrl: pb.target_url ?? null,
            industry: pb.industry ?? '',
            geography: pb.geography ?? '',
            priorityTier: pb.priority_tier ?? 'tier1',
            status: pb.status ?? 'draft',
            progressPct: pb.progress_pct ?? 0,
            agentStatus: JSON.stringify(pb.agent_status ?? []),
            openclawSessionId: pb.openclaw_session_id ?? null,
            createdAt: pb.created_at ? new Date(pb.created_at) : new Date(),
            updatedAt: pb.updated_at ? new Date(pb.updated_at) : new Date(),
          },
        })

        // Migrate contacts
        const contacts = pb.contacts ?? []
        for (const c of contacts) {
          await tx.playbookContact.create({
            data: {
              playbookId: id,
              name: c.name ?? 'Unknown',
              title: c.title ?? '',
              company: '',
              linkedinUrl: c.linkedin_url ?? null,
              email: c.email ?? null,
              confidence: c.confidence ?? 'medium',
              source: c.source ?? 'AI Research',
              verificationStatus: c.verification_status ?? 'pending',
              notes: c.notes ?? null,
              personalizationSignals: JSON.stringify(c.personalization_signals ?? []),
              directQuotes: JSON.stringify(c.direct_quotes ?? []),
              createdAt: c.created_at ? new Date(c.created_at) : new Date(),
            },
          })
        }

        // Migrate sections
        const sections = pb.sections ?? []
        for (const s of sections) {
          const sectionKey = s.section_type ?? 'executive_summary'
          const created = await tx.playbookSection.create({
            data: {
              playbookId: id,
              sectionKey,
              title: s.title ?? sectionKey,
              contentMarkdown: s.content ?? '',
              status: s.status ?? 'complete',
              orderIndex: SECTION_ORDER[sectionKey] ?? 99,
              createdAt: s.created_at ? new Date(s.created_at) : new Date(),
            },
          })

          // Migrate sources for this section
          const sources = s.sources ?? []
          for (const src of sources) {
            await tx.playbookSource.create({
              data: {
                playbookId: id,
                sectionId: created.id,
                url: src.source_url ?? '#',
                claim: src.claim ?? null,
                confidence: src.confidence ?? null,
                verificationStatus: src.verification_status ?? 'unverified',
              },
            })
          }
        }
      })

      console.log(`[migrate] Migrated ${id} (${pb.product_name} → ${pb.target_company})`)
      migrated++
    } catch (err) {
      console.error(`[migrate] Failed to migrate ${id}:`, err)
    }
  }

  console.log(`[migrate] Done. Migrated: ${migrated}, Skipped: ${skipped}, Total: ${entries.length}`)
}

migrate()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
