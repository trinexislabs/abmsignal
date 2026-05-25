import { Worker } from 'bullmq'
import { redisConnection, PLAYBOOK_QUEUE, type PlaybookJobData } from './queue'
import { runResearchWorker } from './workers/playbook-generation-worker'
import { runWritingWorker } from './workers/playbook-writing-worker'
import { runRepository } from '../runs/run-repository'

const CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY ?? '3', 10)

const worker = new Worker<PlaybookJobData>(
  PLAYBOOK_QUEUE,
  async (job) => {
    const { type, runId } = job.data
    if (type === 'research') {
      await runResearchWorker(runId)
    } else if (type === 'writing') {
      await runWritingWorker(runId)
    }
  },
  {
    connection: redisConnection,
    concurrency: CONCURRENCY,
    // Keep the lock alive for the full agent timeout window + buffer
    lockDuration: 1_800_000,
    lockRenewTime: 600_000,
  },
)

worker.on('completed', (job) => {
  console.log(`[worker] Job ${job.id} (${job.data.type}) completed for playbook ${job.data.playbookId}`)
})

worker.on('failed', (job, err) => {
  console.error(`[worker] Job ${job?.id} (${job?.data?.type}) failed:`, err.message)
})

worker.on('error', (err) => {
  console.error('[worker] Worker error:', err)
})

// Reset any runs that were left in "running" state from a previous crash
runRepository.resetStuckRuns()
  .then(count => { if (count > 0) console.log(`[worker] Reset ${count} stuck runs from previous session`) })
  .catch((err: unknown) => console.error('[worker] Failed to reset stuck runs:', err))

async function shutdown() {
  console.log('[worker] Shutting down gracefully...')
  await worker.close()
  process.exit(0)
}

process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)

console.log(`[worker] ABMSignal playbook worker started (concurrency: ${CONCURRENCY})`)
