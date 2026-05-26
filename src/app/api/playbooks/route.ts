import { NextResponse } from 'next/server'
import { auth } from '@/auth'
import { prisma } from '@/server/db'
import { playbookService } from '@/server/playbooks/playbook-service'
import {
  getUserCreditBalance,
  getUserSubscription,
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

  // Deduct one credit now that the playbook exists. Applies to both plans —
  // growth credits come from the monthly cycle grant, one_off credits from
  // per-playbook top-ups.
  if (userId) {
    const sub = await getUserSubscription(userId)
    if (sub?.plan === 'one_off' || sub?.plan === 'growth') {
      await prisma.userCredit.create({
        data: { userId, amount: -1, reason: `playbook_consumed:${playbook.id}` },
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
