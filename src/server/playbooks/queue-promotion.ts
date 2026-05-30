import { prisma } from '../db'
import { playbookRepository } from './playbook-repository'
import { runRepository } from '../runs/run-repository'
import { recordPlaybookFailure } from './failure'

// Called by workers when a playbook releases its OpenClaw slot (enters contact_review,
// completes, or fails). Finds the oldest pending_queue playbook for that user and
// dispatches it — keeping one playbook per user in-flight at all times.
export async function promoteNextInQueue(userId: string): Promise<void> {
  const next = await prisma.playbook.findFirst({
    where: { userId, status: 'pending_queue' },
    orderBy: { createdAt: 'asc' },
    select: { id: true },
  })
  if (!next) return

  // Use the same atomic slot claim as direct dispatch, so promotion and a
  // racing startGeneration can never both win the user's single slot. If the
  // claim loses (someone else grabbed the slot first), bail — whoever holds it
  // will re-trigger promotion when they release it.
  const claimed = await playbookRepository.claimRuntimeSlot(userId, next.id)
  if (!claimed) return

  const run = await runRepository.create(next.id, 'research')
  await playbookRepository.logEvent(
    next.id,
    'queue.promoted',
    'Auto-promoted from user queue — generation starting',
    { userId, runId: run.id },
  )

  // Push to BullMQ; fall back to in-process if Redis is unavailable.
  // Both imports are dynamic to avoid a circular-module issue (the research
  // worker imports this file, so we can't statically import the worker here).
  let pushed = false
  try {
    const { playbookQueue } = await import('../jobs/queue')
    playbookQueue.on('error', () => {})
    await Promise.race([
      playbookQueue.add(`research-${run.id}`, {
        type: 'research' as const,
        runId: run.id,
        playbookId: next.id,
      }),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('queue timeout')), 5000),
      ),
    ])
    pushed = true
  } catch {
    pushed = false
  }

  if (!pushed) {
    console.warn(`[queue-promotion] Redis unavailable — running research in-process for ${next.id}`)
    const { runResearchWorker } = await import('../jobs/workers/playbook-generation-worker')
    void runResearchWorker(run.id).catch(async (err: Error) => {
      try {
        await recordPlaybookFailure({ playbookId: next.id, runId: run.id, phase: 'research', error: err })
      } catch { /* ignore */ }
    })
  }
}
