import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/server/db'
import { playbookRepository } from '@/server/playbooks/playbook-repository'
import { playbookService } from '@/server/playbooks/playbook-service'
import {
  getUserCreditBalance,
  getUserSubscription,
  playbookConsumedReason,
} from '@/server/users/user-repository'
import type { PlaybookCreateRequest } from '@/types'

export async function GET() {
  const session = await auth()
  const userId = session?.user?.id
  const playbooks = userId
    ? await playbookService.listByUser(userId)
    : await playbookService.listAll()
  return NextResponse.json({ data: playbooks })
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

  // Both plans are credit-gated: one_off pays per playbook, growth gets 10
  // credits per 30-day cycle and can buy single top-ups when those run out.
  // Both plans are also concurrency-gated: one_off blocks while any playbook
  // is in-flight (research/writing), growth allows up to 4 queued at once.
  let markPendingQueue = false
  if (userId) {
    const sub = await getUserSubscription(userId)
    if (sub?.plan === 'one_off' || sub?.plan === 'growth') {
      const credits = await getUserCreditBalance(userId)
      if (credits < 1) {
        return NextResponse.json(
          {
            error:
              sub.plan === 'growth'
                ? 'No credits remaining in this cycle. Top up to generate another playbook.'
                : 'Payment required before generating a playbook.',
          },
          { status: 402 },
        )
      }

      const inFlight = await playbookRepository.countInFlightForUser(userId)

      if (sub.plan === 'one_off') {
        if (inFlight > 0) {
          return NextResponse.json(
            {
              error:
                'A playbook is already generating. One-off accounts process one at a time — wait for it to reach the contact review step or complete before starting another.',
            },
            { status: 409 },
          )
        }
      } else {
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
      }
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

  // Deduct one credit now that the playbook exists. Applies to both plans —
  // growth credits come from the monthly cycle grant, one_off credits from
  // per-playbook top-ups.
  if (userId) {
    const sub = await getUserSubscription(userId)
    if (sub?.plan === 'one_off' || sub?.plan === 'growth') {
      await prisma.userCredit.create({
        data: { userId, amount: -1, reason: playbookConsumedReason(playbook.id) },
      })
    }
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
