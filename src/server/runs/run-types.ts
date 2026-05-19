export type RunPhase = 'research' | 'writing' | 'review'
export type RunStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'cancelled'

export interface PlaybookRun {
  id: string
  playbookId: string
  phase: RunPhase
  status: RunStatus
  attempt: number
  startedAt: string | null
  completedAt: string | null
  failedAt: string | null
  errorMessage: string | null
  openclawSessionId: string | null
  processId: number | null
  stdoutPath: string | null
  stderrPath: string | null
  rawOutput: string | null
  createdAt: string
  updatedAt: string
}
