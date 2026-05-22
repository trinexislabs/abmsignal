# ABMSignal — SaaS Architecture Recommendations

> Generated: 2026-05-22
> Context: Pre-launch architectural review for agentic playbook generation at SaaS scale.

---

## Current State Summary

The schema, worker pattern, and phase separation (research → contact_review → writing → complete) are solid foundations. The OpenClaw adapter interface is clean. However, five load-bearing gaps exist that will break under real multi-tenant SaaS conditions.

---

## The Five Gaps

### Gap 1: SQLite Cannot Be Your SaaS Database

**Location:** `prisma/schema.prisma` — `provider = "sqlite"`, no `url` set.

**Problem:** SQLite serializes all writes. Two users generating playbooks simultaneously causes write contention and potential corruption. No replication, no backups, no connection pooling.

**Fix:**
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Switch to Supabase (PostgreSQL) — already in the stack. One migration, one `DATABASE_URL` env var.

> **This is the single most important change before any beta launch.**

---

### Gap 2: Workers Run In-Process, Not as Real Background Jobs

**Location:** `src/app/api/playbooks/[id]/generate/route.ts` → `playbookService.startGeneration()`

**Problem:** If the generate route calls workers inline, the Next.js serverless function holds the HTTP connection open for the entire 90-minute agent run, then gets killed by the serverless timeout (10–30s on Vercel). Users see perpetual "queued" state.

**Fix — Actual BullMQ setup:**

New files needed:
```
src/server/jobs/queue.ts           ← BullMQ Queue instance
src/server/jobs/worker-process.ts  ← Standalone Node.js process (NOT serverless)
```

`src/server/jobs/queue.ts`:
```ts
import { Queue } from 'bullmq'

export const playbookQueue = new Queue('playbooks', {
  connection: { url: process.env.REDIS_URL },
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 30000 },
  },
})
```

`src/server/jobs/worker-process.ts` (run as `node dist/worker-process.js`, never inside Next.js):
```ts
import { Worker } from 'bullmq'
import { runResearchWorker } from './workers/playbook-generation-worker'
import { runWritingWorker }  from './workers/playbook-writing-worker'

const worker = new Worker('playbooks', async job => {
  if (job.name === 'research') await runResearchWorker(job.data.runId)
  if (job.name === 'writing')  await runWritingWorker(job.data.runId)
}, {
  connection: { url: process.env.REDIS_URL },
  concurrency: 3,
})
```

The `generate` API route enqueues and returns immediately:
```ts
await playbookQueue.add(jobName, { runId }, { priority: tierPriority(user.plan) })
return NextResponse.json({ status: 'queued', runId })
```

**Priority mapping by plan:**
```ts
function tierPriority(plan: PlanId): number {
  const map: Record<PlanId, number> = {
    agency: 1, professional: 2, growth: 3, one_off: 4, free: 5,
  }
  return map[plan] ?? 5
}
```

> **This is the architectural pivot the whole system depends on.**

---

### Gap 3: OpenClaw via `execFile` Cannot Scale to Multiple Tenants

**Location:** `src/server/agent/openclaw-adapter.ts` — uses `execFileAsync(OPENCLAW_BIN, [...])`

**Problem:** Spawns a CLI process per request on the host machine. All jobs share the same `OPENCLAW_STATE_DIR`. Concurrent jobs fight over the same binary and state directory. Impossible to horizontally scale.

**Fix — Switch adapter to HTTP calls:**

The adapter already has `healthCheck()` using `fetch`. Extend that pattern to all agent calls:

```ts
const result = await fetch(`${OPENCLAW_GATEWAY_URL}/api/run`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Job-Id': runId,
    'X-Phase': phase,
  },
  body: JSON.stringify({ agent: AGENT_ID, message }),
  signal: AbortSignal.timeout(AGENT_TIMEOUT_MS),
})
```

Each BullMQ worker makes an HTTP call to the OpenClaw gateway. The gateway handles its own concurrency. Multiple gateway instances can run behind a load balancer when demand grows.

> **Dependency:** OpenClaw gateway on port 18790 must expose a `/api/run` REST endpoint. If it already does, this is a small adapter rewrite.

---

### Gap 4: No Usage Enforcement Before Job Start

**Location:** `src/server/playbooks/playbook-service.ts` — `startGeneration()` has no quota check.

**Problem:** `UserCredit` and `UserSubscription` models exist in the schema but nothing reads them before starting a job. Users can generate unlimited playbooks regardless of their plan.

**Fix — Add quota check in `startGeneration()`:**

```ts
async startGeneration(playbookId: string, userId: string) {
  const sub = await db.userSubscription.findUnique({ where: { userId } })
  const plan = SUBSCRIPTION_PLANS.find(p => p.id === sub?.plan)

  if (plan?.playbooksPerMonth !== null) {
    const used = await db.userCredit.aggregate({
      where: {
        userId,
        reason: 'consumed',
        createdAt: { gte: startOfBillingPeriod(sub) },
      },
      _sum: { amount: true },
    })
    const count = Math.abs(used._sum.amount ?? 0)
    if (count >= (plan?.playbooksPerMonth ?? 0)) {
      throw new QuotaExceededError(plan!.playbooksPerMonth!)
    }
  }

  // Deduct credit BEFORE job starts — prevents double-spending on retry
  await db.userCredit.create({
    data: { userId, amount: -1, reason: 'consumed', playbookId },
  })

  // ... enqueue job as normal
}
```

> **Credit deduction must happen before enqueueing**, not after completion — prevents quota bypass via retry attacks.

---

### Gap 5: No Stripe Webhook Handler

**Location:** Missing — `src/app/api/webhooks/stripe/route.ts` does not exist.

**Problem:** Pricing plans are defined in `src/lib/pricing.ts` and `UserSubscription` model exists, but Stripe events are never processed. Users who cancel stay on paid plan forever. Users who upgrade stay on old limits.

**Fix — Create the webhook handler:**

```
src/app/api/webhooks/stripe/route.ts
```

Minimum events to handle:

| Stripe Event | Action |
|---|---|
| `customer.subscription.created` | Upsert `UserSubscription` with plan + status |
| `customer.subscription.updated` | Update plan, status, `currentPeriodEnd` |
| `customer.subscription.deleted` | Set status to `cancelled` |
| `invoice.paid` | Create `UserCredit` with `reason: "period_reset"` to reset monthly usage |
| `checkout.session.completed` | Link `stripeCustomerId` to `User` |

```ts
export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')!
  const body = await req.text()
  const event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)

  switch (event.type) {
    case 'customer.subscription.updated':
    case 'customer.subscription.created': {
      const sub = event.data.object
      await db.userSubscription.upsert({
        where: { stripeSubId: sub.id },
        update: { status: sub.status, currentPeriodEnd: new Date(sub.current_period_end * 1000) },
        create: { /* ... */ },
      })
      break
    }
    // ... other cases
  }

  return NextResponse.json({ received: true })
}
```

---

## Priority Order

| Priority | Change | Blocking What |
|---|---|---|
| **P0** | SQLite → PostgreSQL (Supabase) | Everything — do this first |
| **P0** | BullMQ worker as standalone process | Jobs actually completing |
| **P1** | OpenClaw `execFile` → HTTP | Concurrent users, horizontal scale |
| **P1** | Quota enforcement in `startGeneration` | Billing integrity |
| **P2** | Stripe webhook handler | Subscription lifecycle correctness |
| **P2** | Per-tier BullMQ priority queues | Enterprise SLA, paid tier isolation |

---

## Additional Recommendations (Post-Launch)

### Cost Controls
Track token usage per `PlaybookRun`. Add a `tokenCount` column to `PlaybookRun` and populate it from the OpenClaw response. Alert when a single job exceeds a threshold (e.g. 200K tokens). Without this, a few power users can make high-volume plans unprofitable.

### Section-Level Checkpointing
The current batch fallback (save batch 1 if batch 2 fails) is a one-time recovery, not true checkpointing. For jobs over 60 minutes, save each section to `PlaybookSection` as it's generated, so a restart resumes from the last completed section rather than the last batch.

### Server-Sent Events for Progress
Replace polling on `/api/playbooks/[id]/status` with SSE (`text/event-stream`). Works natively with Next.js App Router, simpler than WebSockets for one-way status push, and avoids the polling latency visible in the current processing page.

### Multi-Region OpenClaw
When scaling beyond one region: run one OpenClaw gateway per region, route jobs to the nearest gateway based on user geography, store `openclawRegion` on `PlaybookRun` for debugging.

---

## Files to Create / Modify

| File | Action | Notes |
|---|---|---|
| `prisma/schema.prisma` | Modify | Change provider to `postgresql`, add `url = env("DATABASE_URL")` |
| `src/server/jobs/queue.ts` | Create | BullMQ Queue instance |
| `src/server/jobs/worker-process.ts` | Create | Standalone worker process entrypoint |
| `src/server/agent/openclaw-adapter.ts` | Modify | Replace `execFile` with `fetch` to gateway |
| `src/server/playbooks/playbook-service.ts` | Modify | Add quota check + credit deduction |
| `src/app/api/webhooks/stripe/route.ts` | Create | Stripe webhook handler |
| `src/app/api/playbooks/[id]/generate/route.ts` | Modify | Enqueue job instead of running inline |
