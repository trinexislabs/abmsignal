import { Queue, type ConnectionOptions } from 'bullmq'

export interface PlaybookJobData {
  type: 'research' | 'writing'
  runId: string
  playbookId: string
}

// Fail fast when Redis is unreachable so the in-process fallback can kick in immediately.
// These are ioredis options — cast required because ConnectionOptions is a broad union.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const FAIL_FAST: Record<string, any> = {
  enableOfflineQueue: false,
  maxRetriesPerRequest: 0,
  connectTimeout: 3000,
  retryStrategy: () => null,
}

function getRedisConnection(): ConnectionOptions {
  const url = process.env.REDIS_URL
  if (url) {
    try {
      const parsed = new URL(url)
      return {
        ...FAIL_FAST,
        host: parsed.hostname,
        port: parseInt(parsed.port || '6379', 10),
        password: parsed.password || undefined,
        username: parsed.username || undefined,
        tls: parsed.protocol === 'rediss:' ? {} : undefined,
      } as ConnectionOptions
    } catch {
      // fall through to individual env vars
    }
  }
  return {
    ...FAIL_FAST,
    host: process.env.REDIS_HOST ?? '127.0.0.1',
    port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  } as ConnectionOptions
}

export const redisConnection: ConnectionOptions = getRedisConnection()

export const PLAYBOOK_QUEUE = 'playbook-generation'

export const playbookQueue = new Queue<PlaybookJobData>(PLAYBOOK_QUEUE, {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 2,
    backoff: { type: 'exponential', delay: 15_000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
})
