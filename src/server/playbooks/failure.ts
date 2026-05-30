import { playbookRepository } from './playbook-repository'
import { runRepository } from '../runs/run-repository'
import { SUPPORT_EMAIL } from '@/lib/support'

// ─── Failure handling ──────────────────────────────────────────────────────
//
// Two audiences, two messages. End users must NEVER see raw agent output,
// stack traces, parser errors, or internal "playbook not found" strings — they
// get a calm, actionable message (retry / try again / contact support). System
// admins need the opposite: the full raw error + stack trace, tagged with the
// playbook and run IDs, in the application logs and on the admin portal.
//
// recordPlaybookFailure() is the single choke point that enforces this split:
//   • console.error  → raw message + stack + playbookId/runId/phase (dev logs)
//   • run.errorMessage (markFailed) → raw message (admin portal only)
//   • run.failed event metadata → raw message (admin observability)
//   • playbook.failedReason (setFailed) → friendly message (shown to the user)
//   • run.failed event message → friendly message (shown in the user activity feed)

export type FailurePhase = 'research' | 'writing' | 'review' | 'generation' | 'queue'

type FailureCategory =
  | 'timeout'
  | 'agent_unavailable'
  | 'invalid_output'
  | 'internal'
  | 'unknown'

// Classify a raw error string into a coarse category so we can pick the right
// user-facing guidance. Matching is intentionally forgiving (substring, case-
// insensitive) because raw errors come from several layers (HTTP client, agent
// runtime, Zod parser, our own guards).
function categorize(rawMessage: string): FailureCategory {
  const m = rawMessage.toLowerCase()
  if (
    m.includes('timed out') ||
    m.includes('timeout') ||
    m.includes('idle for over') ||
    m.includes('never picked up') ||
    m.includes('presumed dead')
  ) {
    return 'timeout'
  }
  if (
    m.includes('econnrefused') ||
    m.includes('enotfound') ||
    m.includes('fetch failed') ||
    m.includes('network') ||
    m.includes('socket') ||
    m.includes('unreachable') ||
    m.includes('worker unavailable') ||
    m.includes('502') ||
    m.includes('503') ||
    m.includes('504') ||
    m.includes('connection')
  ) {
    return 'agent_unavailable'
  }
  if (
    m.includes('parse') ||
    m.includes('json') ||
    m.includes('schema') ||
    m.includes('invalid') ||
    m.includes('unexpected token') ||
    m.includes('validation') ||
    m.includes('no payload') ||
    m.includes('empty')
  ) {
    return 'invalid_output'
  }
  if (m.includes('not found') || m.includes('undefined') || m.includes('null')) {
    return 'internal'
  }
  return 'unknown'
}

// Build the calm, actionable message the end user sees. Every variant tells the
// user what to do next (retry / try again / contact support) and never exposes
// internal detail.
export function toUserFacingMessage(rawError: unknown, phase?: FailurePhase): string {
  const raw = rawError instanceof Error ? rawError.message : String(rawError ?? '')
  const stage = phase === 'writing' ? 'writing your playbook' : phase === 'research' ? 'researching your account' : 'generating your playbook'

  switch (categorize(raw)) {
    case 'timeout':
      return `Generation took longer than expected and timed out while ${stage}. This is usually temporary — please retry. If it keeps happening, contact us at ${SUPPORT_EMAIL}.`
    case 'agent_unavailable':
      return `We couldn't reach the generation engine while ${stage}. Please wait a moment and try again. If the problem continues, contact us at ${SUPPORT_EMAIL}.`
    case 'invalid_output':
      return `The AI returned an unexpected result while ${stage}. Retrying usually fixes this. If it persists, contact ${SUPPORT_EMAIL} and we'll investigate.`
    case 'internal':
      return `We hit an internal problem while ${stage}. Please try again. If this keeps happening, contact our support team at ${SUPPORT_EMAIL}.`
    default:
      return `Something went wrong while ${stage}. Your inputs are saved — please retry. If the issue persists, reach out to ${SUPPORT_EMAIL} and we'll help.`
  }
}

// Record a terminal generation failure once, with the correct message for each
// audience. Safe to call even when there's no run (runId omitted) — only the
// playbook-level state and logs are written in that case.
export async function recordPlaybookFailure(params: {
  playbookId: string
  runId?: string
  phase?: FailurePhase
  error: unknown
  rawOutput?: string
}): Promise<void> {
  const { playbookId, runId, phase, error, rawOutput } = params
  const rawMessage = error instanceof Error ? error.message : String(error ?? 'Unknown error')
  const stack = error instanceof Error ? error.stack : undefined
  const userMessage = toUserFacingMessage(error, phase)

  // 1. Developer observability — full raw error + stack, tagged with IDs. This
  //    is the line a system admin greps for when investigating root cause.
  console.error(
    `[playbook-failure] playbook=${playbookId}${runId ? ` run=${runId}` : ''}${phase ? ` phase=${phase}` : ''} :: ${rawMessage}`,
  )
  if (stack) console.error(stack)

  // 2. Raw error on the run row — surfaced only on the admin portal.
  if (runId) {
    try {
      await runRepository.markFailed(runId, rawMessage, rawOutput)
    } catch (err) {
      console.error(`[playbook-failure] could not mark run ${runId} failed:`, err)
    }
  }

  // 3. Friendly message on the playbook — this is what the end user reads.
  await playbookRepository.setFailed(playbookId, userMessage)

  // 4. Activity-feed event: friendly message for the user, raw error preserved
  //    in metadata for admins inspecting the event log.
  await playbookRepository.logEvent(
    playbookId,
    'run.failed',
    userMessage,
    { rawError: rawMessage, phase: phase ?? null },
    runId,
  )
}
