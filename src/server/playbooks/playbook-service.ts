import { playbookRepository } from './playbook-repository'
import { runRepository } from '../runs/run-repository'
import { runResearchWorker } from '../jobs/workers/playbook-generation-worker'
import { runWritingWorker } from '../jobs/workers/playbook-writing-worker'
import { prisma } from '../db'
import { recordPlaybookFailure } from './failure'
import { refundGrowthCreditForErroredPlaybook } from '../users/user-repository'
import type {
  ApiActivePlaybook,
  ApiContact,
  ApiPlaybook,
  ApiStatus,
  CreatePlaybookInput,
} from './playbook-types'
import type { PlaybookRun } from '../runs/run-types'

// A 'running' playbook run is considered stuck (zombie) if no event has been
// logged for it in this many ms. Real generations log progress events every
// few minutes, so an hour of silence means the worker process is dead.
const STALE_RUN_IDLE_MS = 60 * 60 * 1000

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let _queue: any = null
let _queueChecked = false

async function getQueue() {
  if (_queueChecked) return _queue
  try {
    const { playbookQueue } = await import('../jobs/queue')
    // Suppress unhandled error events from ioredis when Redis is unreachable
    playbookQueue.on('error', () => {})
    // Fail fast: if Redis doesn't respond within 5s, use in-process fallback
    await Promise.race([
      playbookQueue.getJobCounts(),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Redis timeout')), 5000)),
    ])
    _queue = playbookQueue
  } catch {
    _queue = null
  }
  _queueChecked = true
  return _queue
}

async function enqueueOrFallback(
  type: 'research' | 'writing',
  runId: string,
  playbookId: string,
  fallback: () => void,
) {
  const queue = await getQueue()
  if (queue) {
    await queue.add(`${type}-${runId}`, { type, runId, playbookId })
  } else {
    console.warn(`[playbook-service] Redis unavailable — running ${type} in-process for ${playbookId}`)
    fallback()
  }
}

export const playbookService = {
  async create(input: CreatePlaybookInput): Promise<ApiPlaybook> {
    const pb = await playbookRepository.create(input)
    await playbookRepository.logEvent(pb.id, 'playbook.created', 'Playbook created', {
      productName: input.productName,
      targetCompany: input.targetCompany,
    })
    return pb
  },

  async getById(id: string): Promise<ApiPlaybook | null> {
    return playbookRepository.findById(id)
  },

  async listAll(): Promise<ApiPlaybook[]> {
    return playbookRepository.listAll()
  },

  async listByUser(userId: string): Promise<ApiPlaybook[]> {
    return playbookRepository.listByUser(userId)
  },

  async getStatus(id: string): Promise<ApiStatus | null> {
    return playbookRepository.getStatus(id)
  },

  async listActiveForUser(userId: string): Promise<ApiActivePlaybook[]> {
    await reapStaleRunsForUser(userId)
    return playbookRepository.listActiveForUser(userId)
  },

  async startGeneration(
    playbookId: string,
  ): Promise<{ runId: string | null; outcome: 'started' | 'already_running' | 'queued' }> {
    // Check if there is already an active run — but cancel stale queued runs that were
    // never picked up (worker wasn't running / Redis was down).
    const active = await runRepository.findActiveForPlaybook(playbookId)
    if (active) {
      const ageMs = Date.now() - new Date(active.createdAt).getTime()
      const STALE_QUEUED_AFTER_MS = 5 * 60 * 1000 // 5 minutes
      if (active.status === 'queued' && ageMs > STALE_QUEUED_AFTER_MS) {
        // Run was never picked up — cancel it so we can start fresh
        await runRepository.markFailed(active.id, 'Run was never picked up (worker unavailable)')
        await playbookRepository.logEvent(playbookId, 'run.stale_cancelled', 'Stale queued run cancelled; restarting', { runId: active.id })
      } else if (active.status === 'running' && (await isRunStale(active.id, active.startedAt))) {
        // Worker died mid-run (no events for STALE_RUN_IDLE_MS) — recover by marking failed
        await recordPlaybookFailure({
          playbookId, runId: active.id, phase: 'generation',
          error: 'Run idle for over 60 minutes — worker presumed dead (timed out)',
        })
      } else {
        return { runId: active.id, outcome: 'already_running' }
      }
    }

    const pb = await playbookRepository.findById(playbookId)
    if (!pb) throw new Error(`Playbook ${playbookId} not found`)
    const userId = pb.user_id || null

    // Authoritative per-user concurrency guard: atomically claim the user's
    // single runtime slot. If another of their playbooks already holds it, this
    // one is held in the queue rather than dispatched — a worker will promote it
    // when the active playbook releases the slot (completes / reaches contact
    // review / fails). This prevents a single user from saturating the agent
    // runtime no matter how generation is triggered (rapid creates, retries,
    // direct API calls).
    const claimed = await playbookRepository.claimRuntimeSlot(userId, playbookId)
    if (!claimed) {
      await prisma.playbook.update({ where: { id: playbookId }, data: { status: 'pending_queue' } })
      await playbookRepository.logEvent(
        playbookId,
        'queue.deferred',
        'Another playbook is already generating — queued behind it',
        { userId },
      )
      return { runId: null, outcome: 'queued' }
    }

    // Slot won — create the research run and dispatch it.
    const run = await runRepository.create(playbookId, 'research')
    await playbookRepository.logEvent(playbookId, 'generation.queued', 'Generation queued', { runId: run.id })

    await enqueueOrFallback('research', run.id, playbookId, () => {
      void runResearchWorker(run.id).catch(async (err: Error) => {
        try {
          await recordPlaybookFailure({ playbookId, runId: run.id, phase: 'research', error: err })
        } catch (inner) {
          console.error('[playbook-service] Failed to mark research crash:', inner)
        }
      })
    })

    return { runId: run.id, outcome: 'started' }
  },

  async submitContactReview(
    playbookId: string,
    contacts: ApiContact[],
  ): Promise<{ runId: string }> {
    // Update contact verification statuses from the human review
    const updates = contacts
      .filter(c => c.id && c.verification_status)
      .map(c => ({ id: c.id, verificationStatus: c.verification_status }))

    if (updates.length > 0) {
      await playbookRepository.updateContactStatuses(playbookId, updates)
    }

    await playbookRepository.logEvent(
      playbookId, 'contacts.approved', 'Human contact review complete',
      { total: contacts.length, updates: updates.length },
    )

    // Create writing run
    const run = await runRepository.create(playbookId, 'writing')

    await playbookRepository.logEvent(
      playbookId, 'writing.queued', 'Writing phase queued', { runId: run.id },
    )

    await enqueueOrFallback('writing', run.id, playbookId, () => {
      void runWritingWorker(run.id).catch(async (err: Error) => {
        try {
          await recordPlaybookFailure({ playbookId, runId: run.id, phase: 'writing', error: err })
        } catch (inner) {
          console.error('[playbook-service] Failed to mark writing crash:', inner)
        }
      })
    })

    return { runId: run.id }
  },

  async getContacts(playbookId: string): Promise<ApiContact[]> {
    return playbookRepository.getContacts(playbookId)
  },

  async updateSourceVerification(
    sectionId: string,
    sourceId: string,
    verificationStatus: string,
  ): Promise<boolean> {
    return playbookRepository.updateSourceVerification(sectionId, sourceId, verificationStatus)
  },

  async getRuns(playbookId: string): Promise<PlaybookRun[]> {
    return runRepository.listForPlaybook(playbookId)
  },

  // Permanently remove a playbook and everything attached to it. Active workers
  // running in another process can't be killed here, but: (a) any queued BullMQ
  // job is removed, (b) active runs are flipped to 'cancelled' before deletion
  // so the in-flight worker's next DB write throws cleanly, and (c) all DB rows
  // are removed in one transaction so no orphan data is left behind.
  async deletePlaybook(
    playbookId: string,
  ): Promise<{ deleted: boolean; creditRefunded: boolean }> {
    const pb = await playbookRepository.findById(playbookId)
    if (!pb) return { deleted: false, creditRefunded: false }

    // Capture the final status BEFORE we touch anything. A cycle-credit refund
    // is only owed when the user is deleting a playbook that genuinely ended in
    // the errored state — Condition 1. (findById maps DB 'failed' → 'error'.)
    // Condition 2 — "the user chose to delete, not regenerate" — is satisfied
    // structurally: regeneration runs through the generate endpoint, which never
    // refunds; only this delete path does.
    const wasErrored = pb.status === 'error'
    const userId = pb.user_id || null

    // 1. Mark any queued/running runs as cancelled so the worker bails on its
    //    next DB touch. (We can't IPC-kill a worker process, but its next
    //    update against the soon-to-be-deleted playbook row will fail.)
    const active = await runRepository.findActiveForPlaybook(playbookId)
    if (active) {
      try {
        await prisma.playbookRun.update({
          where: { id: active.id },
          data: { status: 'cancelled', failedAt: new Date(), errorMessage: 'Playbook deleted by user' },
        })
      } catch (err) {
        console.warn(`[playbook-service] could not mark run ${active.id} cancelled:`, err)
      }
    }

    // 2. Drop any pending BullMQ jobs for this playbook so they don't fire after
    //    deletion. Best-effort — if Redis is unreachable we just skip.
    try {
      const queue = await getQueue()
      if (queue) {
        const jobs = await queue.getJobs(['waiting', 'delayed', 'paused', 'active'])
        for (const job of jobs) {
          if (job?.data?.playbookId === playbookId) {
            try { await job.remove() } catch { /* job already gone — ignore */ }
          }
        }
      }
    } catch (err) {
      console.warn(`[playbook-service] queue cleanup skipped for ${playbookId}:`, err)
    }

    // 3. Cascade-delete all DB rows.
    await playbookRepository.deleteCascade(playbookId)

    // 4. Refund a growth cycle credit if the user just deleted an errored
    //    playbook. Done AFTER the cascade succeeds so we never credit back for a
    //    delete that didn't actually happen. All eligibility checks (growth
    //    plan, credit actually consumed, once-per-playbook, same cycle) live in
    //    the helper; the UserCredit ledger is keyed to the user, not the
    //    playbook, so it survives the cascade above.
    let creditRefunded = false
    if (wasErrored && userId) {
      try {
        const { refunded } = await refundGrowthCreditForErroredPlaybook(userId, playbookId)
        creditRefunded = refunded
        if (refunded) {
          console.info(
            `[playbook-service] refunded 1 growth cycle credit to user ${userId} for errored playbook ${playbookId}`,
          )
        }
      } catch (err) {
        // A failed refund must never block the delete itself — log and move on.
        console.warn(`[playbook-service] credit refund skipped for ${playbookId}:`, err)
      }
    }

    return { deleted: true, creditRefunded }
  },
}

// ─── Stale-run reaper ─────────────────────────────────────────────────────────

// Has this 'running' run gone silent past the idle threshold? Idleness is
// measured against the most recent event for the run (workers log progress
// every few minutes), falling back to startedAt when no events exist yet.
async function isRunStale(runId: string, startedAtIso: string | null): Promise<boolean> {
  const cutoff = Date.now() - STALE_RUN_IDLE_MS
  const lastEvent = await prisma.playbookEvent.findFirst({
    where: { runId },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  })
  const lastActivityMs = lastEvent?.createdAt.getTime()
    ?? (startedAtIso ? new Date(startedAtIso).getTime() : null)
  if (lastActivityMs === null) return false
  return lastActivityMs < cutoff
}

// Lazy reaper triggered on dashboard polls: marks any of this user's stuck
// 'running' runs as failed so zombie playbooks don't hang in the In Progress
// list forever. Cheap because most calls find zero stuck runs.
async function reapStaleRunsForUser(userId: string): Promise<void> {
  const runs = await prisma.playbookRun.findMany({
    where: { status: 'running', playbook: { userId } },
    select: { id: true, playbookId: true, startedAt: true },
  })
  if (runs.length === 0) return
  for (const run of runs) {
    if (await isRunStale(run.id, run.startedAt?.toISOString() ?? null)) {
      await recordPlaybookFailure({
        playbookId: run.playbookId, runId: run.id, phase: 'generation',
        error: 'Run idle for over 60 minutes — worker presumed dead (timed out)',
      })
    }
  }
}
