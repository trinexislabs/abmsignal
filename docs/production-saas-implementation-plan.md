# ABMSignal — Production SaaS Implementation Plan

> Generated: 2026-05-22
> Companion to: [architecture-saas-recommendations.md](./architecture-saas-recommendations.md)
> Goal: Convert ABMSignal from a single-tenant prototype into a production-grade
> multi-tenant SaaS, with OpenClaw agentic orchestration as the runtime.
> Constraint: Playbook generation pipeline already works well — do not refactor
> what is producing good output today.

---

## Locked-In Decisions

| # | Decision | Choice |
|---|----------|--------|
| 1 | Postgres host | **Supabase** (already in stack) |
| 2 | Redis host | **Self-hosted** |
| 3 | Worker hosting | **Railway** (background worker service) |
| 4 | OpenClaw gateway | `POST /api/run` on port 18790 — **already exists** |
| 5 | User ↔ Org model | **One user belongs to exactly one org**; one org has many users |
| 6 | Data migration | **Delete and start fresh** — wipe SQLite dev.db and prior auth migration |

---

## Current State (Confirmed by Reading the Code)

### Working well — do not touch
- Playbook generation pipeline (research → contact_review → writing) at `src/server/jobs/workers/`
- 18-section batched writing at `playbook-writing-worker.ts`
- OpenClaw output parsing (`agent-output-schema.ts`, JSON envelope unwrap)
- Auth.js v5 stack (Credentials + Google + Resend) at `src/auth.ts`
- Schema for `Playbook`, `PlaybookRun`, `PlaybookContact`, `PlaybookSection`, `PlaybookSource`, `PlaybookEvent` — all sound

### Gaps identified in the architecture-recommendations doc — all confirmed
1. `prisma/schema.prisma:7` — SQLite via libsql, no pooling, write-serialized
2. `playbook-service.ts:49` — `void runResearchWorker(...)` fires inside the Next.js process; will die on Vercel serverless timeout (10–30s)
3. `openclaw-adapter.ts:54` — `execFileAsync` spawns the CLI on the host; shared `OPENCLAW_STATE_DIR`; not horizontally scalable
4. `playbook-service.ts:30` — `startGeneration()` has zero quota/credit checks
5. No `app/api/webhooks/stripe/` route exists

### Additional load-bearing gaps the doc misses (bigger than the infra ones)

| # | Gap | Where | Why critical for multi-tenant |
|---|-----|-------|-------------------------------|
| A | `userId: 'usr_demo'` hardcoded | `app/api/playbooks/route.ts:37`, `playbook-repository.ts:94` | Every playbook is assigned to a fake user |
| B | Zero ownership checks on API routes | `app/api/playbooks/[id]/{generate,status,verify,contacts,flow}/route.ts` | Any logged-in user can read/modify any playbook by guessing IDs |
| C | `listAll()` returns the entire table | `playbook-repository.ts:144` | Dashboard would leak every tenant's playbooks |
| D | No org/team model | `prisma/schema.prisma` | Pricing has 3-seat and 10-seat tiers; schema can't represent them |
| E | `bullmq`/`ioredis` not installed | `package.json` | Doc Gap 2 fix can't ship without dependencies |
| F | No per-tenant rate limiting | (missing) | One tenant can drain OpenClaw capacity |
| G | Job logs on local disk (`/tmp/abmsignal-logs`) | `openclaw-adapter.ts:15` | Stateless deploys lose logs; not shareable across worker hosts |

> Gaps A–D are the multi-tenancy blockers. Without these, the infra changes from the doc don't make the app safe to expose to multiple clients.

---

## Phase 0 — Tenant Identity & Authorization

**Goal:** Every byte of playbook data is owned by, and gated by, a real user in a real org.

### Tasks
1. **Add Organization model** to `prisma/schema.prisma`:
   ```prisma
   model Organization {
     id               String   @id @default(cuid())
     name             String
     plan             String   @default("free")
     stripeCustomerId String?  @unique
     createdAt        DateTime @default(now())
     updatedAt        DateTime @updatedAt
     members          OrgMember[]
     playbooks        Playbook[]
     subscription     UserSubscription?
     credits          UserCredit[]
   }

   model OrgMember {
     id        String   @id @default(cuid())
     orgId     String
     userId    String   @unique  // one-user-one-org (locked-in decision #5)
     role      String   @default("member") // "owner" | "admin" | "member"
     createdAt DateTime @default(now())
     org       Organization @relation(fields: [orgId], references: [id], onDelete: Cascade)
     user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)
     @@unique([orgId, userId])
   }
   ```

2. **Move `UserSubscription.userId` → `orgId`** and `UserCredit.userId` → `orgId`. Subscriptions and credits are billed at the org level.

3. **Add `Playbook.orgId`** (non-nullable). Drop the nullable `Playbook.userId` ownership field (keep `createdBy: userId` for audit). Backfill not needed (decision #6: delete and start fresh).

4. **Replace `userId: 'usr_demo'`** in `app/api/playbooks/route.ts:37` and `playbook-repository.ts:94` with the session user's orgId from `auth()`. All POST/GET routes call `const session = await requireSession()` and 401 if absent.

5. **Tenant-scoped repository methods.** Refactor `playbookRepository`:
   - `findById(id, orgId)` — returns null if `playbook.orgId !== orgId` (treated as 404 at the route layer)
   - `listAll(orgId)` — `where: { orgId }`
   - Same pattern for status / contacts / sections / runs / events
   - Central `requireOwnership(playbookId, orgId)` helper used by every API route

6. **Middleware extension.** `src/middleware.ts:7` already gates `/dashboard` and `/playbook/*`. Extend it so `/api/playbooks/*` returns **401 JSON** (not a redirect) for unauthenticated requests, before the route logic runs.

### Files touched
- `prisma/schema.prisma`
- `src/server/playbooks/playbook-repository.ts`
- `src/server/playbooks/playbook-service.ts`
- `src/server/runs/run-repository.ts`
- `src/server/users/user-repository.ts`
- All files under `src/app/api/playbooks/`
- `src/middleware.ts`
- `src/auth.ts` (signup hook creates Org + OrgMember atomically)
- `src/app/api/auth/register/route.ts` (Credentials signup creates org too)
- `src/lib/auth/session.ts` + `src/types/next-auth.d.ts` (expose orgId in session)

---

## Phase 1 — Database: SQLite → Postgres (Supabase)

**Goal:** Real concurrent writes, backups, connection pooling.

### Tasks
1. `prisma/schema.prisma`: change `provider = "sqlite"` → `provider = "postgresql"`. Drop libsql.
2. `src/server/db.ts`: drop `@prisma/adapter-libsql`, use the native Prisma client with pooled `DATABASE_URL`.
3. **Two env vars** required:
   - `DATABASE_URL` — Supabase pgbouncer pooled connection (app runtime)
   - `DIRECT_URL` — Supabase direct connection (for `prisma migrate`)
4. Delete `prisma/dev.db` and `prisma/migrations/20260521100933_add_auth_models/`.
5. Run `prisma migrate dev --name init` to generate a single baseline Postgres migration including Phase 0's Org/OrgMember tables.
6. Remove `@libsql/client` and `@prisma/adapter-libsql` from `package.json`.
7. Add a seed script for local dev so contributors aren't stuck without data.

### Prerequisites before this phase runs
- Supabase project created
- `DATABASE_URL` + `DIRECT_URL` filled in `.env.local`

---

## Phase 2 — Real Background Workers (BullMQ + self-hosted Redis)

**Goal:** HTTP returns in < 500ms; jobs survive deploys and run to completion in a separate process on Railway.

### Tasks
1. Add deps: `bullmq`, `ioredis`.
2. Create `src/server/jobs/queue.ts`:
   ```ts
   import { Queue } from 'bullmq'
   import type { PlanId } from '@/lib/pricing'

   export const playbookQueue = new Queue('playbooks', {
     connection: { url: process.env.REDIS_URL },
     defaultJobOptions: {
       attempts: 2,
       backoff: { type: 'exponential', delay: 30_000 },
     },
   })

   export function tierPriority(plan: PlanId): number {
     const map: Record<PlanId, number> = {
       agency: 1, professional: 2, growth: 3, one_off: 4, free: 5,
     }
     return map[plan] ?? 5
   }
   ```

3. Create `src/server/jobs/worker-process.ts` — entrypoint for a standalone Node process:
   ```ts
   import { Worker } from 'bullmq'
   import { runResearchWorker } from './workers/playbook-generation-worker'
   import { runWritingWorker } from './workers/playbook-writing-worker'

   new Worker('playbooks', async job => {
     if (job.name === 'research') await runResearchWorker(job.data.runId)
     if (job.name === 'writing')  await runWritingWorker(job.data.runId)
   }, {
     connection: { url: process.env.REDIS_URL },
     concurrency: 3,
   })
   ```

4. **Rewrite `startGeneration()` and `submitContactReview()`** in `playbook-service.ts`:
   - Drop the `void runResearchWorker(...)` fire-and-forget pattern
   - Replace with `await playbookQueue.add('research', { runId, orgId, plan }, { priority: tierPriority(plan) })`
   - Return immediately

5. Per-org concurrency cap (Redis `SET NX EX` or BullMQ rate-limiter group) so one tenant can't run 50 jobs concurrently.

6. **Deployment topology:**
   - Vercel → Next.js app
   - Railway → `worker-process.ts` background service
   - Railway → self-hosted Redis service (single container, persisted volume)

7. Add scripts to `package.json`:
   ```
   "worker": "tsx src/server/jobs/worker-process.ts"
   "worker:build": "tsc -p tsconfig.worker.json"
   ```

---

## Phase 3 — OpenClaw HTTP Gateway

**Goal:** Workers and OpenClaw scale independently. Multiple workers can hit one (or many) gateway instances.

### Tasks
1. Confirmed: `POST /api/run` already exists on port 18790 (decision #4). No coordination delay.

2. Rewrite `runAgent()` in `src/server/agent/openclaw-adapter.ts:36`:
   ```ts
   const res = await fetch(`${OPENCLAW_GATEWAY_URL}/api/run`, {
     method: 'POST',
     headers: {
       'Content-Type': 'application/json',
       'X-Job-Id': runId,
       'X-Phase': phase,
       'X-Tenant-Id': orgId,
       'Authorization': `Bearer ${process.env.OPENCLAW_API_KEY}`,
     },
     body: JSON.stringify({ agent: AGENT_ID, message }),
     signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
   })
   ```

3. Drop `execFile`, `OPENCLAW_BIN`, `OPENCLAW_STATE_DIR`, `OPENCLAW_CONFIG_PATH` — gateway owns those.

4. Plumb `orgId` through workers (`runResearchWorker` / `runWritingWorker` → `openclawAdapter.runResearch` / `runWriting`) so the gateway can namespace OpenClaw session state per tenant.

5. Move job logs from `/tmp/abmsignal-logs` to:
   - **Option A:** Gateway-side responsibility (preferred — gateway already has visibility)
   - **Option B:** Supabase Storage object keyed by `runId`

6. Drop `LOG_DIR` env var and `saveLog()` writes to local disk.

---

## Phase 4 — Billing Wired End-to-End

**Goal:** Quotas enforced before work starts; Stripe lifecycle keeps subscriptions in sync.

### Tasks
1. **Quota check in `playbook-service.startGeneration()`** — keyed by **org**, not user:
   ```ts
   const sub = await db.userSubscription.findUnique({ where: { orgId } })
   const plan = SUBSCRIPTION_PLANS.find(p => p.id === sub?.plan)
   if (plan?.playbooksPerMonth !== null) {
     const used = await db.userCredit.aggregate({
       where: { orgId, reason: 'consumed', createdAt: { gte: startOfBillingPeriod(sub) } },
       _sum: { amount: true },
     })
     if (Math.abs(used._sum.amount ?? 0) >= plan.playbooksPerMonth) {
       throw new QuotaExceededError(plan.playbooksPerMonth)
     }
   }
   await db.userCredit.create({ data: { orgId, amount: -1, reason: 'consumed', playbookId } })
   ```
   Credit deduction **before** `playbookQueue.add()` — prevents quota bypass on retry.

2. **Refund credit on failure** — extend `markFailed` path in workers to insert `UserCredit { amount: +1, reason: 'refund' }` so failures don't burn the user's monthly budget.

3. **Stripe webhook** at `src/app/api/webhooks/stripe/route.ts`:

   | Stripe Event | Action |
   |---|---|
   | `customer.subscription.created` | Upsert `UserSubscription` with plan + status |
   | `customer.subscription.updated` | Update plan, status, `currentPeriodEnd` |
   | `customer.subscription.deleted` | Set status to `cancelled` |
   | `invoice.paid` | Create `UserCredit` with `reason: "period_reset"` to reset monthly usage |
   | `checkout.session.completed` | Link `Organization.stripeCustomerId` |

   Use `stripe.webhooks.constructEvent` with raw body. Add `STRIPE_WEBHOOK_SECRET` env var.

4. **Checkout & portal API routes:**
   - `POST /api/billing/checkout` → creates Stripe Checkout session with org metadata
   - `POST /api/billing/portal` → opens customer portal

5. Add `UserSubscription.currentPeriodStart` (we already have `currentPeriodEnd`) so `startOfBillingPeriod` is a cheap field lookup.

---

## Phase 5 — Observability & Cost Controls

**Goal:** When something breaks for one tenant, find out why in < 2 minutes.

### Tasks
1. **Structured logging** — replace `console.error` with `pino` carrying `runId`, `orgId`, `playbookId`, `phase` fields on every line. Ship to Logtail / Datadog / Axiom.

2. **Token tracking** — add `PlaybookRun.tokenCount` and `PlaybookRun.tokenCostUsd`. Gateway must return these in the JSON envelope; adapter persists.

3. **Per-tenant alerting** — Slack webhook when a single job exceeds a threshold (e.g. 200K tokens / 90 min). Prevents one runaway job from torching margin.

4. **Sentry** for unhandled exceptions in workers and API routes.

5. **Switch progress from polling → SSE.** Replace `/api/playbooks/[id]/status` polling with `/api/playbooks/[id]/events` (text/event-stream). Removes ~1 req/sec/playbook of DB load and makes the UI snappier.

---

## Phase 6 — Hardening for Open Beta

### Tasks
1. **Rate limiting** with Upstash ratelimit or self-hosted equivalent on `/api/playbooks/*` (per-IP + per-org) and on `/api/auth/*` (per-IP).
2. **Zod validation at every API boundary** — `agent-output-schema.ts` validates agent output; HTTP routes only do field-presence checks. Add Zod schemas for every POST body.
3. **Audit log** — leverage existing `PlaybookEvent` model: insert `{ type: 'access.denied', metadata: { userId, ip } }` on ownership failures.
4. **Backup automation** — Supabase nightly snapshots + WAL archiving (free tier) or scheduled `pg_dump` to S3.
5. **CI gate** — `prisma migrate deploy` on every release; block deploys with pending migrations.
6. **Soft-delete** — `Playbook.deletedAt` for GDPR delete-on-request and accidental drops.

---

## Priority & Dependency Graph

| Order | Phase | Blocks |
|---|---|---|
| **1** | Phase 0 (tenant identity + auth checks) | Everything — without this, the app cannot ship to a second user |
| **2** | Phase 1 (Postgres) | Concurrency, backups, all phases that need transactions |
| **3** | Phase 2 (BullMQ) | Reliable job completion |
| **4** | Phase 3 (OpenClaw HTTP) | Horizontal scale of agent compute |
| **5** | Phase 4 (Billing) | Monetization |
| **6** | Phase 5 (Observability) | Operability during early customer load |
| **7** | Phase 6 (Hardening) | Open-beta safety |

**Phases 0 + 1 ship as one PR** because they touch the same files (schema, repositories, routes, db client). Phase 3 depends only on the gateway being ready (already is). Phase 4 can run in parallel with Phase 3.

---

## First PR — Phase 0 + 1 Bundled

Tracked in TaskCreate items #1–#10 in the working session. Files touched:

| File | Action |
|------|--------|
| `prisma/schema.prisma` | Switch to postgres; add Organization, OrgMember; move ownership to orgId |
| `src/server/db.ts` | Drop libsql adapter; use native Prisma client |
| `prisma/migrations/*` | Delete old migration; generate new baseline |
| `src/auth.ts` | Extend createUser to create Org + OrgMember + trial credit atomically |
| `src/app/api/auth/register/route.ts` | Credentials signup creates org too |
| `src/lib/auth/session.ts` + `src/types/next-auth.d.ts` | Expose orgId in session |
| `src/server/playbooks/playbook-repository.ts` | Add orgId scoping to every method |
| `src/server/runs/run-repository.ts` | Join through Playbook.orgId for safety |
| `src/app/api/playbooks/*/*.ts` | `requireSession()` + ownership checks; drop `usr_demo` |
| `src/middleware.ts` | 401 JSON for unauth requests to /api/playbooks/* |
| `src/server/__tests__/playbook.test.ts` | Seed Org + OrgMember in setup; pass orgId through |
| `package.json` | Remove @libsql/client and @prisma/adapter-libsql |
| `.env.local.example` | Add DATABASE_URL, DIRECT_URL Supabase placeholders |

### Prerequisites before Phase 0+1 PR can run
1. Supabase project created; `DATABASE_URL` and `DIRECT_URL` in `.env.local`
2. Confirmation that deleting `prisma/dev.db` and `prisma/migrations/20260521100933_add_auth_models/` is acceptable (decision #6 covers this, just explicit acknowledgement)

---

## Files to Create (across all phases)

| File | Phase | Purpose |
|------|-------|---------|
| `src/server/jobs/queue.ts` | 2 | BullMQ Queue + tier priority |
| `src/server/jobs/worker-process.ts` | 2 | Standalone worker entrypoint |
| `src/app/api/webhooks/stripe/route.ts` | 4 | Stripe lifecycle handler |
| `src/app/api/billing/checkout/route.ts` | 4 | Stripe Checkout session |
| `src/app/api/billing/portal/route.ts` | 4 | Stripe customer portal |
| `src/app/api/playbooks/[id]/events/route.ts` | 5 | SSE progress stream |
| `src/lib/auth/require-session.ts` | 0 | Throws Unauthorized; returns {userId, orgId, role} |
| `src/lib/ratelimit.ts` | 6 | Per-org + per-IP throttling |
| `src/lib/logger.ts` | 5 | pino with structured fields |

## Files to Modify

| File | Phase | Change |
|------|-------|--------|
| `prisma/schema.prisma` | 0+1 | Postgres provider, Organization, OrgMember, orgId on Playbook/UserSubscription/UserCredit |
| `src/server/db.ts` | 1 | Drop libsql adapter |
| `src/server/playbooks/playbook-repository.ts` | 0 | orgId scoping on every method |
| `src/server/playbooks/playbook-service.ts` | 0, 2, 4 | Use queue; quota check; orgId pass-through |
| `src/server/runs/run-repository.ts` | 0 | Join via Playbook.orgId |
| `src/server/agent/openclaw-adapter.ts` | 3 | Replace execFile with fetch |
| `src/app/api/playbooks/route.ts` | 0 | requireSession; drop usr_demo |
| `src/app/api/playbooks/[id]/{generate,status,verify,contacts,flow}/route.ts` | 0 | requireSession + ownership |
| `src/middleware.ts` | 0 | 401 JSON for /api/playbooks/* |
| `src/auth.ts` | 0 | Create Org + OrgMember on signup |
| `src/app/api/auth/register/route.ts` | 0 | Create Org + OrgMember on credentials signup |
| `package.json` | 1, 2 | Drop libsql; add bullmq, ioredis, pino |

---

## Open Items / Not Yet Decided

- **Email-based org invites** — flow for "owner adds member to org" UI. Not blocking Phase 0–2.
- **Per-org Redis namespace** — single Redis with prefixed keys, or one DB index per tier? Decide in Phase 2.
- **OpenClaw API key model** — single shared key vs. per-org keys for billing attribution? Decide in Phase 3.
- **PDF export** — `@react-pdf/renderer` vs. server-side Playwright. Not in Phase 0–6; post-launch.
