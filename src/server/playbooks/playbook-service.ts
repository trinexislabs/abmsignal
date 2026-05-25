import { playbookRepository } from './playbook-repository'
import { runRepository } from '../runs/run-repository'
import { runResearchWorker } from '../jobs/workers/playbook-generation-worker'
import { runWritingWorker } from '../jobs/workers/playbook-writing-worker'
import type { ApiContact, ApiPlaybook, ApiStatus, CreatePlaybookInput } from './playbook-types'
import type { PlaybookRun } from '../runs/run-types'

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

  async startGeneration(playbookId: string): Promise<{ runId: string; alreadyActive: boolean }> {
    // Check if there is already an active run — but cancel stale queued runs that were
    // never picked up (worker wasn't running / Redis was down).
    const active = await runRepository.findActiveForPlaybook(playbookId)
    if (active) {
      const ageMs = Date.now() - new Date(active.createdAt).getTime()
      const STALE_AFTER_MS = 5 * 60 * 1000 // 5 minutes
      if (active.status === 'queued' && ageMs > STALE_AFTER_MS) {
        // Run was never picked up — cancel it so we can start fresh
        await runRepository.markFailed(active.id, 'Run was never picked up (worker unavailable)')
        await playbookRepository.logEvent(playbookId, 'run.stale_cancelled', 'Stale queued run cancelled; restarting', { runId: active.id })
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
}
