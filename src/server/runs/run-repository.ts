import { prisma } from '../db'
import type { PlaybookRun, RunPhase, RunStatus } from './run-types'

function toRun(r: {
  id: string; playbookId: string; phase: string; status: string; attempt: number
  startedAt: Date | null; completedAt: Date | null; failedAt: Date | null
  errorMessage: string | null; openclawSessionId: string | null; processId: number | null
  stdoutPath: string | null; stderrPath: string | null; rawOutput: string | null
  createdAt: Date; updatedAt: Date
}): PlaybookRun {
  return {
    id: r.id,
    playbookId: r.playbookId,
    phase: r.phase as RunPhase,
    status: r.status as RunStatus,
    attempt: r.attempt,
    startedAt: r.startedAt?.toISOString() ?? null,
    completedAt: r.completedAt?.toISOString() ?? null,
    failedAt: r.failedAt?.toISOString() ?? null,
    errorMessage: r.errorMessage,
    openclawSessionId: r.openclawSessionId,
    processId: r.processId,
    stdoutPath: r.stdoutPath,
    stderrPath: r.stderrPath,
    rawOutput: r.rawOutput,
    createdAt: r.createdAt.toISOString(),
    updatedAt: r.updatedAt.toISOString(),
  }
}

export const runRepository = {
  async create(playbookId: string, phase: RunPhase): Promise<PlaybookRun> {
    // Check attempt count for this phase
    const existing = await prisma.playbookRun.count({ where: { playbookId, phase } })
    const run = await prisma.playbookRun.create({
      data: { playbookId, phase, status: 'queued', attempt: existing + 1 },
    })
    return toRun(run)
  },

  async findById(id: string): Promise<PlaybookRun | null> {
    const run = await prisma.playbookRun.findUnique({ where: { id } })
    return run ? toRun(run) : null
  },

  async findActiveForPlaybook(playbookId: string): Promise<PlaybookRun | null> {
    const run = await prisma.playbookRun.findFirst({
      where: { playbookId, status: { in: ['queued', 'running'] } },
      orderBy: { createdAt: 'desc' },
    })
    return run ? toRun(run) : null
  },

  async markRunning(id: string, processId?: number): Promise<void> {
    await prisma.playbookRun.update({
      where: { id },
      data: { status: 'running', startedAt: new Date(), processId: processId ?? null },
    })
  },

  // Lightweight status probe for cooperative cancellation. Returns the run's
  // status, or null if the row no longer exists (playbook was deleted) — both
  // are treated as "cancel" by the worker's kill poll.
  async getStatusById(id: string): Promise<string | null> {
    const run = await prisma.playbookRun.findUnique({ where: { id }, select: { status: true } })
    return run?.status ?? null
  },

  // Record the OS pid of the spawned OpenClaw child WITHOUT touching startedAt
  // (unlike markRunning). Best-effort — used for observability and host-side
  // manual kills. Swallows errors so it never disrupts the run.
  async setProcessId(id: string, processId: number): Promise<void> {
    try {
      await prisma.playbookRun.update({ where: { id }, data: { processId } })
    } catch (err) {
      console.warn(`[run-repository] setProcessId skipped for ${id}:`, err)
    }
  },

  async markSucceeded(id: string): Promise<void> {
    await prisma.playbookRun.update({
      where: { id },
      data: { status: 'succeeded', completedAt: new Date() },
    })
  },

  async markFailed(id: string, errorMessage: string, rawOutput?: string): Promise<void> {
    await prisma.playbookRun.update({
      where: { id },
      data: {
        status: 'failed',
        failedAt: new Date(),
        errorMessage,
        rawOutput: rawOutput ?? null,
      },
    })
  },

  async saveRawOutput(id: string, rawOutput: string): Promise<void> {
    await prisma.playbookRun.update({ where: { id }, data: { rawOutput } })
  },

  async listForPlaybook(playbookId: string): Promise<PlaybookRun[]> {
    const runs = await prisma.playbookRun.findMany({
      where: { playbookId },
      orderBy: { createdAt: 'desc' },
    })
    return runs.map(toRun)
  },

  // On startup, reset any stuck "running" runs to failed
  async resetStuckRuns(): Promise<number> {
    const result = await prisma.playbookRun.updateMany({
      where: { status: 'running' },
      data: { status: 'failed', errorMessage: 'Process interrupted (server restart)', failedAt: new Date() },
    })
    return result.count
  },
}
