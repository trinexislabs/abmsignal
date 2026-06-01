import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/server/db'
import { playbookRepository } from '@/server/playbooks/playbook-repository'
import { playbookService } from '@/server/playbooks/playbook-service'
import { projectPlaybookForViewer } from '@/server/playbooks/playbook-access'
import { getUserSubscription } from '@/server/users/user-repository'
import type { PlaybookCreateRequest } from '@/types'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  const playbooks = userId
    ? await playbookService.listByUser(userId)
    : await playbookService.listAll()
  // Strip content from any completed-but-unpaid playbook so the list never leaks
  // locked deliverables (section bodies, contact PII). Open playbooks pass through.
  const projected = await Promise.all(
    playbooks.map((pb) => projectPlaybookForViewer(pb, userId)),
  )
  return NextResponse.json({ data: projected })
}

export async function POST(request: Request) {
  const session = await auth()
  const userId = session?.user?.id ?? null

  let body: PlaybookCreateRequest
  try {
    body = (await request.json()) as PlaybookCreateRequest
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { product_brief, target_account } = body

  if (!product_brief?.product_name || !target_account?.target_company) {
    const missing: string[] = []
    if (!product_brief?.product_name) missing.push('product_name')
    if (!target_account?.target_company) missing.push('target_company')
    return NextResponse.json({ error: `Missing required fields: ${missing.join(', ')}` }, { status: 400 })
  }

  // Generation is free under the post-generation paywall — no upfront payment.
  // Payment is collected after the playbook is generated (see the review-page
  // paywall + /api/payment/mock unlock). We still concurrency-gate to protect
  // the agent runtime: Growth subscribers may have up to 4 non-terminal at once;
  // everyone else (free / pay-per-playbook) processes one at a time.
  let markPendingQueue = false
  let plan: string | undefined
  if (userId) {
    const sub = await getUserSubscription(userId)
    plan = sub?.plan
    const inFlight = await playbookRepository.countInFlightForUser(userId)

    if (sub?.plan === 'growth') {
      // growth: cap at 4 non-terminal playbooks (pending_queue + in-flight + contact_review)
      const nonTerminal = await playbookRepository.countNonTerminalForUser(userId)
      if (nonTerminal >= 4) {
        return NextResponse.json(
          {
            error:
              'Queue is full (4 active playbooks max). Complete or delete an existing playbook to start a new one.',
          },
          { status: 409 },
        )
      }
      // If something is already in-flight, the new playbook waits in the user queue
      markPendingQueue = inFlight > 0
    } else if (inFlight > 0) {
      // free / one_off: one playbook at a time
      return NextResponse.json(
        {
          error:
            'A playbook is already generating. Please wait for it to reach the contact review step or complete before starting another.',
        },
        { status: 409 },
      )
    }
  }

  // Parse comma/newline-delimited fields into arrays
  const toArr = (s: string | undefined, sep: RegExp | string) =>
    s ? s.split(sep).map(v => v.trim()).filter(Boolean) : []

  const validDeployment = (['saas', 'on-prem', 'hybrid'] as const).includes(
    product_brief.deployment_model as 'saas' | 'on-prem' | 'hybrid',
  )

  const playbook = await playbookService.create({
    userId: userId ?? undefined,
    productName: product_brief.product_name,
    productUrl: product_brief.product_url || undefined,
    productBrief: {
      product_name: product_brief.product_name,
      description: product_brief.description ?? '',
      value_propositions: toArr(product_brief.value_propositions, '\n'),
      target_personas: toArr(product_brief.target_personas, ','),
      differentiators: toArr(product_brief.differentiators, '\n'),
      competitors: toArr(product_brief.competitors, ','),
      deployment_model: validDeployment ? product_brief.deployment_model : 'saas',
      deal_size: product_brief.deal_size ?? '',
      sales_cycle: product_brief.sales_cycle ?? '',
    },
    targetCompany: target_account.target_company,
    targetUrl: target_account.target_url || undefined,
    industry: target_account.industry,
    geography: target_account.geography,
    priorityTier: target_account.priority_tier,
  })

  // For growth users where another playbook is already in-flight, hold this
  // one in the user queue. The generate endpoint will no-op for it; workers
  // will auto-promote it when the current playbook releases its slot.
  if (markPendingQueue) {
    await prisma.playbook.update({
      where: { id: playbook.id },
      data: { status: 'pending_queue' },
    })
  }

  // No credit is consumed at creation under the post-generation paywall —
  // monetization happens at unlock time on the review page.

  // Enforce the per-plan retention window now that a new playbook exists: purge
  // the user's oldest terminal playbooks beyond their plan's keep-limit (20 for
  // growth, 5 otherwise). Best-effort — never fail the create on a purge hiccup.
  if (userId) {
    await playbookService
      .enforcePlaybookRetention(userId, plan ?? 'free')
      .catch(err => console.warn('[api/playbooks] retention enforcement skipped:', err))
  }

  return NextResponse.json(
    {
      data: {
        playbook_id: playbook.id,
        job_id: `job_${Date.now()}`,
        estimated_completion_minutes: 15,
      },
    },
    { status: 202 },
  )
}
