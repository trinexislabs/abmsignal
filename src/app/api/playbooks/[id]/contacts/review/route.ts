import { NextResponse } from 'next/server'
import { getPlaybook, updatePlaybook, updateContacts } from '@/lib/store/playbooks'
import { continuePlaybookFlow } from '@/lib/openclaw/client'
import type { Contact } from '@/types'

const ENGINE_RUNNER_URL = process.env.ENGINE_RUNNER_URL ?? 'http://localhost:18793'
const ENGINE_RUNNER_API_KEY = process.env.ENGINE_RUNNER_API_KEY ?? 'abmsignal-engine-runner-2026'

interface RouteContext {
  params: Promise<{ id: string }>
}

export async function POST(request: Request, { params }: RouteContext) {
  const { id } = await params
  const playbook = getPlaybook(id)

  if (!playbook) {
    return NextResponse.json({ error: 'Playbook not found' }, { status: 404 })
  }

  let body: { contacts: Contact[] }
  try {
    body = (await request.json()) as { contacts: Contact[] }
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  if (!Array.isArray(body.contacts)) {
    return NextResponse.json({ error: 'contacts must be an array' }, { status: 400 })
  }

  updateContacts(id, body.contacts)
  updatePlaybook(id, {
    status: 'writing',
    progress_pct: 40,
    phase_started_at: new Date().toISOString(),
    agent_status: [
      {
        agent: 'orchestrator',
        task: 'Contact review complete — starting content generation',
        status: 'running',
      },
      { agent: 'researcher', task: 'Account research complete', status: 'complete' },
      {
        agent: 'writer',
        task: 'Generating hyper-personalized sections',
        status: 'running',
        detail: 'Starting section 1 of 8',
      },
      { agent: 'reviewer', task: 'Awaiting content', status: 'pending' },
    ],
  })

  // Re-invoke the orchestrator to continue with writing + reviewing phases.
  // First try the Engine Runner (same mechanism as generate), then fall back
  // to a direct OpenClaw task via continuePlaybookFlow.
  const flowId = playbook.openclaw_session_id
  if (flowId) {
    let invokedViaRunner = false
    try {
      const res = await fetch(`${ENGINE_RUNNER_URL}/invoke`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': ENGINE_RUNNER_API_KEY,
        },
        body: JSON.stringify({ flowId, playbookId: id, phase: 'writing', contactsApproved: true }),
      })
      invokedViaRunner = res.ok
      if (!invokedViaRunner) {
        console.error('[contacts/review] Engine Runner returned', res.status)
      }
    } catch (err) {
      console.error('[contacts/review] Engine Runner unreachable:', err instanceof Error ? err.message : err)
    }

    if (!invokedViaRunner) {
      // Fallback: create a new task directly in the existing OpenClaw flow
      const result = await continuePlaybookFlow({ flowId, playbookId: id })
      if (!result.ok) {
        console.error('[contacts/review] continuePlaybookFlow failed:', result.error)
      } else {
        console.log(`[contacts/review] Orchestrator resumed via OpenClaw task ${result.taskId ?? '(no taskId)'}`)
      }
    } else {
      console.log(`[contacts/review] Orchestrator resumed via Engine Runner for flow ${flowId}`)
    }
  } else {
    console.warn('[contacts/review] No flowId stored — orchestrator cannot be re-invoked automatically')
  }

  return NextResponse.json({
    data: { message: 'Contact review submitted. Writing phase started.' },
  })
}
