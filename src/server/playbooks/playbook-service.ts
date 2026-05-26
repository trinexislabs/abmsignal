import { playbookRepository } from './playbook-repository'
import { runRepository } from '../runs/run-repository'
import { runResearchWorker } from '../jobs/workers/playbook-generation-worker'
import { runWritingWorker } from '../jobs/workers/playbook-writing-worker'
import { prisma } from '../db'
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

  async startGeneration(playbookId: string): Promise<{ runId: string; alreadyActive: boolean }> {
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
        await runRepository.markFailed(active.id, 'Run idle for over 60 minutes — worker presumed dead')
        await playbookRepository.setFailed(playbookId, 'Generation timed out (no activity for 60 minutes)')
        await playbookRepository.logEvent(playbookId, 'run.stale_reaped', 'Stale running run reaped due to inactivity', { runId: active.id }, active.id)
      } else {
        return { runId: active.id, alreadyActive: true }
      }
    }

    // Create a new research run
    const run = await runRepository.create(playbookId, 'research')
    await playbookRepository.setStatus(playbookId, 'queued', 0, [
      { agent: 'orchestrator', task: 'Queued for processing', status: 'pending' },
      { agent: 'researcher', task: 'Waiting to start', status: 'pending' },
      { agent: 'writer', task: 'Waiting for research data', status: 'pending' },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ])

    await playbookRepository.logEvent(playbookId, 'generation.queued', 'Generation queued', { runId: run.id })

    await enqueueOrFallback('research', run.id, playbookId, () => {
      void runResearchWorker(run.id).catch(async (err: Error) => {
        console.error(`[playbook-service] Research worker crashed for run ${run.id}:`, err.message)
        try {
          await runRepository.markFailed(run.id, err.message)
          await playbookRepository.setFailed(playbookId, err.message)
        } catch (inner) {
          console.error('[playbook-service] Failed to mark crash:', inner)
        }
      })
    })

    return { runId: run.id, alreadyActive: false }
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
        console.error(`[playbook-service] Writing worker crashed for run ${run.id}:`, err.message)
        try {
          await runRepository.markFailed(run.id, err.message)
          await playbookRepository.setFailed(playbookId, err.message)
        } catch (inner) {
          console.error('[playbook-service] Failed to mark crash:', inner)
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
  async deletePlaybook(playbookId: string): Promise<{ deleted: boolean }> {
    const pb = await playbookRepository.findById(playbookId)
    if (!pb) return { deleted: false }

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

    return { deleted: true }
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
      await runRepository.markFailed(run.id, 'Run idle for over 60 minutes — worker presumed dead')
      await playbookRepository.setFailed(run.playbookId, 'Generation timed out (no activity for 60 minutes)')
      await playbookRepository.logEvent(run.playbookId, 'run.stale_reaped', 'Stale running run reaped due to inactivity', { runId: run.id }, run.id)
    }
  }
}
