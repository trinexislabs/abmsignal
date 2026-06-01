/**
 * Integration test scripts for the refactored backend.
 * Run with: npx tsx src/server/__tests__/playbook.test.ts
 *
 * These are lightweight smoke tests — not a full Jest suite.
 * They test against the real SQLite database (uses a test prefix to avoid polluting).
 */

import { playbookRepository } from '../playbooks/playbook-repository'
import { runRepository } from '../runs/run-repository'
import { parseAgentOutput } from '../agent/agent-output-schema'
import { extractAgentText } from '../agent/openclaw-adapter'
import { prisma } from '../db'
import type { PlaybookSection } from '../../generated/prisma/client'

const TEST_PREFIX = `pb_test_${Date.now()}`

let pass = 0
let fail = 0

function assert(condition: boolean, msg: string) {
  if (condition) {
    console.log(`  ✓ ${msg}`)
    pass++
  } else {
    console.error(`  ✗ FAIL: ${msg}`)
    fail++
  }
}

async function cleanup(ids: string[]) {
  for (const id of ids) {
    await prisma.playbookEvent.deleteMany({ where: { playbookId: id } })
    await prisma.playbookRun.deleteMany({ where: { playbookId: id } })
    const sections = await prisma.playbookSection.findMany({ where: { playbookId: id } })
    await prisma.playbookSource.deleteMany({ where: { sectionId: { in: sections.map((s: PlaybookSection) => s.id) } } })
    await prisma.playbookSource.deleteMany({ where: { playbookId: id } })
    await prisma.playbookSection.deleteMany({ where: { playbookId: id } })
    await prisma.playbookContact.deleteMany({ where: { playbookId: id } })
    await prisma.playbook.deleteMany({ where: { id } })
  }
}

const createdIds: string[] = []

async function test1_createPlaybook() {
  console.log('\n[1] Create playbook')
  const pb = await playbookRepository.create({
    productName: 'TestProd',
    productBrief: { description: 'A test product', value_propositions: ['vp1'] },
    targetCompany: 'TestCo',
    industry: 'Tech',
    geography: 'US',
    priorityTier: 'tier1',
  })
  createdIds.push(pb.id)
  assert(pb.id.startsWith('pb_'), 'ID starts with pb_')
  assert(pb.status === 'draft', 'Status is draft')
  assert(pb.product_name === 'TestProd', 'Product name correct')
  assert(pb.target_company === 'TestCo', 'Target company correct')
  assert(Array.isArray(pb.sections), 'Sections is array')
  assert(Array.isArray(pb.contacts), 'Contacts is array')
  return pb.id
}

async function test2_generateCreatesRun(playbookId: string) {
  console.log('\n[2] Generate creates queued run')
  const run = await runRepository.create(playbookId, 'research')
  assert(run.id.length > 0, 'Run ID exists')
  assert(run.phase === 'research', 'Phase is research')
  assert(run.status === 'queued', 'Status is queued')
  assert(run.playbookId === playbookId, 'Run linked to playbook')
  return run.id
}

async function test3_researchOutputParsing() {
  console.log('\n[3] Valid research output parses correctly')
  const valid = JSON.stringify({
    phase: 'research',
    status: 'contact_review',
    progress_pct: 60,
    contacts: [{
      name: 'Jane Smith',
      title: 'CTO',
      company: 'TestCo',
      linkedin_url: 'https://linkedin.com/in/janesmith',
      rationale: 'Key tech decision maker',
      source_urls: ['https://example.com'],
      confidence: 'high',
    }],
    sources: [{ url: 'https://example.com', title: 'Test Source', confidence: 'high' }],
  })
  const result = parseAgentOutput(`\`\`\`json\n${valid}\n\`\`\``, 'research')
  assert(result.ok, 'Valid research output parses OK')
  if (result.ok) {
    assert(result.data.contacts.length === 1, 'One contact parsed')
    assert(result.data.contacts[0].name === 'Jane Smith', 'Contact name correct')
  }
}

async function test3b_envelopeMultiPayloadExtraction() {
  console.log('\n[3b] Multi-payload OpenClaw envelope extracts the JSON answer (regression)')
  const answerJson = JSON.stringify({
    phase: 'research',
    status: 'contact_review',
    progress_pct: 60,
    contacts: [{ name: 'Jane Smith', title: 'CTO', company: 'TestCo', confidence: 'high' }],
    sources: [],
  })
  // Mirrors the real failure: the agent emits conversational preamble in the
  // FIRST payload and the JSON answer in a LATER payload. extractAgentText must
  // not drop the later payloads (the old payloads[0]-only code did).
  const envelope = JSON.stringify({
    status: 'ok',
    result: {
      payloads: [
        { text: 'Let me research TestCo to ensure specificity.' },
        { text: 'Now I have enough data. Let me compile the JSON output.' },
        { text: `\`\`\`json\n${answerJson}\n\`\`\`` },
      ],
    },
  })

  const extracted = extractAgentText(envelope)
  assert(extracted.includes('"section_key"') === false, 'Extracted text is research, not writing')
  assert(extracted.includes('Jane Smith'), 'Extracted text contains the JSON answer from a later payload')

  const result = parseAgentOutput(extracted, 'research')
  assert(result.ok, 'Multi-payload envelope parses OK after extraction')
  if (result.ok) {
    assert(result.data.contacts[0].name === 'Jane Smith', 'Contact recovered from later payload')
  }

  // Non-envelope input must pass through untouched.
  const plain = extractAgentText('just plain agent text, no envelope')
  assert(plain === 'just plain agent text, no envelope', 'Non-envelope input passes through unchanged')
}

async function test4_invalidResearchOutputFails() {
  console.log('\n[4] Invalid research output is rejected')
  const invalid = JSON.stringify({ phase: 'research', contacts: [] })
  const result = parseAgentOutput(invalid, 'research')
  assert(!result.ok, 'Invalid output (empty contacts) fails validation')
}

async function test5_contactApprovalSavesAndQueuesWriting(playbookId: string) {
  console.log('\n[5] Contact approval saves contacts')
  await playbookRepository.replaceContacts(playbookId, [
    { name: 'Alice', title: 'VP Sales', company: 'TestCo', confidence: 'high', verificationStatus: 'pending' },
    { name: 'Bob', title: 'CTO', company: 'TestCo', confidence: 'medium', verificationStatus: 'pending' },
  ])
  const contacts = await playbookRepository.getContacts(playbookId)
  assert(contacts.length === 2, 'Two contacts saved')
  assert(contacts[0].name === 'Alice', 'First contact name correct')

  await playbookRepository.updateContactStatuses(playbookId, [
    { id: contacts[0].id, verificationStatus: 'confirmed' },
    { id: contacts[1].id, verificationStatus: 'removed' },
  ])
  const updated = await playbookRepository.getContacts(playbookId)
  assert(updated[0].verification_status === 'confirmed', 'Alice confirmed')
  assert(updated[1].verification_status === 'removed', 'Bob removed')
}

async function test6_writingOutputSavesSections(playbookId: string) {
  console.log('\n[6] Valid writing output saves sections')
  const rawOutput = JSON.stringify({
    phase: 'writing',
    status: 'complete',
    progress_pct: 100,
    sections: [
      {
        section_key: 'executive_summary',
        title: 'Executive Summary',
        content_markdown: '## Overview\n\nThis is a test playbook.',
        order_index: 1,
        sources: [{ url: 'https://example.com', title: 'Source', claim: 'Test claim', confidence: 'high' }],
      },
      {
        section_key: 'account_intelligence',
        title: 'Account Intelligence',
        content_markdown: '## TestCo Overview\n\nSome intel here.',
        order_index: 2,
        sources: [],
      },
    ],
  })

  const result = parseAgentOutput(rawOutput, 'writing')
  assert(result.ok, 'Writing output parses OK')
  if (!result.ok) return

  await playbookRepository.replaceSections(
    playbookId,
    result.data.sections.map(s => ({
      sectionKey: s.section_key,
      title: s.title,
      contentMarkdown: s.content_markdown,
      orderIndex: s.order_index,
      sources: s.sources,
    })),
  )

  const pb = await playbookRepository.findById(playbookId)
  assert(pb !== null, 'Playbook found after section save')
  assert((pb?.sections.length ?? 0) === 2, 'Two sections saved')
  assert(pb?.sections[0].type === 'executive_summary', 'First section key correct')
  assert(pb?.sections[0].content === '## Overview\n\nThis is a test playbook.', 'Section content correct')
}

async function test7_statusEndpointShape(playbookId: string) {
  console.log('\n[7] Status endpoint returns expected shape')
  await playbookRepository.setStatus(playbookId, 'complete', 100, [
    { agent: 'orchestrator', task: 'Done', status: 'complete' },
  ])
  const status = await playbookRepository.getStatus(playbookId)
  assert(status !== null, 'Status returned')
  assert(status?.status === 'complete', 'Status is complete')
  assert(status?.progress_pct === 100, 'Progress is 100')
  assert(Array.isArray(status?.agent_status), 'agent_status is array')
  assert('playbook_id' in (status ?? {}), 'playbook_id field present')
}

async function test8_failedRunSetsPlaybookError(playbookId: string, runId: string) {
  console.log('\n[8] Failed run marks playbook as error')
  await runRepository.markFailed(runId, 'Test error message', '{"phase":"research"}')
  await playbookRepository.setFailed(playbookId, 'Test error message')
  const status = await playbookRepository.getStatus(playbookId)
  assert(status?.status === 'error', 'Playbook status is error')
  assert(status?.failed_reason === 'Test error message', 'Failed reason preserved')
}

// ─── User-friendly failure messages + dev observability split ───────────────

async function test14_recordPlaybookFailureSplitsAudiences() {
  console.log('\n[14] recordPlaybookFailure: friendly for users, raw for admins')
  const { recordPlaybookFailure } = await import('../playbooks/failure')
  const pb = await playbookRepository.create({
    productName: 'FailProd', productBrief: {}, targetCompany: 'FailCo',
    industry: 'Tech', geography: 'US', priorityTier: 'tier1',
  })
  createdIds.push(pb.id)
  const run = await runRepository.create(pb.id, 'writing')
  const rawError = 'ZodError: sections[3].content_markdown expected string, received null'

  await recordPlaybookFailure({
    playbookId: pb.id, runId: run.id, phase: 'writing',
    error: rawError, rawOutput: '{"garbage": true}',
  })

  // Playbook (user-facing) carries the friendly message, NOT the raw error.
  const after = await playbookRepository.findById(pb.id)
  assert(after?.status === 'error', 'Playbook marked error')
  assert(!!after?.failed_reason && !after.failed_reason.includes('ZodError'), 'failed_reason hides raw ZodError')
  assert(/support|retry|try again/i.test(after?.failed_reason ?? ''), 'failed_reason gives the user an action')

  // Run (admin-facing) keeps the raw error + raw output.
  const runRow = await prisma.playbookRun.findUnique({ where: { id: run.id } })
  assert(runRow?.errorMessage === rawError, 'Run errorMessage keeps the raw error for admins')
  assert(runRow?.status === 'failed', 'Run marked failed')
  assert(runRow?.rawOutput === '{"garbage": true}', 'Raw agent output preserved on the run')

  // Activity-feed event: friendly message, raw error tucked into metadata.
  const failEvent = await prisma.playbookEvent.findFirst({
    where: { playbookId: pb.id, type: 'run.failed' },
    orderBy: { createdAt: 'desc' },
  })
  assert(!!failEvent && !failEvent.message.includes('ZodError'), 'run.failed event message hides raw error')
  assert((failEvent?.metadata ?? '').includes('ZodError'), 'run.failed event metadata keeps raw error for admins')
}

async function test15_userMessageCategorization() {
  console.log('\n[15] toUserFacingMessage categorizes common failures')
  const { toUserFacingMessage } = await import('../playbooks/failure')
  const timeout = toUserFacingMessage('Run idle for over 60 minutes — worker presumed dead', 'writing')
  assert(/timed out/i.test(timeout) && /retry|try again/i.test(timeout), 'Timeout → retry guidance')
  const net = toUserFacingMessage('fetch failed: ECONNREFUSED 127.0.0.1:8080', 'research')
  assert(/reach the generation engine|try again/i.test(net), 'Connection error → engine-unavailable guidance')
  const parse = toUserFacingMessage('Unexpected token < in JSON at position 0', 'writing')
  assert(/unexpected result|retry/i.test(parse), 'Parse error → friendly retry guidance')
  // No raw fragments ever leak through.
  for (const m of [timeout, net, parse]) {
    assert(!/ECONNREFUSED|JSON at position|presumed dead/i.test(m), 'No raw fragments leak to the user message')
  }
}

// ─── Growth errored-delete credit refund ────────────────────────────────────

const createdUserIds: string[] = []

// A growth subscriber in an active 30-day cycle. Grants the 10-credit cycle and
// (optionally) consumes one credit for a specific playbook id.
async function makeGrowthUser(consumedForPlaybook?: string): Promise<string> {
  const user = await prisma.user.create({
    data: { email: `refund_test_${crypto.randomUUID()}@example.com` },
  })
  createdUserIds.push(user.id)
  await prisma.userSubscription.create({
    data: {
      userId: user.id,
      plan: 'growth',
      status: 'active',
      currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    },
  })
  await prisma.userCredit.create({ data: { userId: user.id, amount: 10, reason: 'growth_cycle_grant' } })
  if (consumedForPlaybook) {
    await prisma.userCredit.create({
      data: { userId: user.id, amount: -1, reason: `playbook_consumed:${consumedForPlaybook}` },
    })
  }
  return user.id
}

async function makeUserPlaybook(userId: string): Promise<string> {
  const pb = await playbookRepository.create({
    productName: 'RefundProd', productBrief: { description: 'x' },
    targetCompany: 'RefundCo', industry: 'Tech', geography: 'US', priorityTier: 'tier1',
  })
  createdIds.push(pb.id)
  await prisma.playbook.update({ where: { id: pb.id }, data: { userId } })
  return pb.id
}

async function balance(userId: string): Promise<number> {
  const r = await prisma.userCredit.aggregate({ where: { userId }, _sum: { amount: true } })
  return r._sum.amount ?? 0
}

async function test9_growthErroredDeleteRefundsCredit() {
  console.log('\n[9] Growth user deleting an errored playbook gets +1 credit back')
  const { playbookService } = await import('../playbooks/playbook-service')
  const userId = await makeGrowthUser()
  const pbId = await makeUserPlaybook(userId)
  await prisma.userCredit.create({ data: { userId, amount: -1, reason: `playbook_consumed:${pbId}` } })
  await playbookRepository.setFailed(pbId, 'boom')

  assert((await balance(userId)) === 9, 'Balance is 9 after consuming 1')

  const res = await playbookService.deletePlaybook(pbId)
  assert(res.deleted, 'Playbook deleted')
  assert(res.creditRefunded, 'creditRefunded is true')
  assert((await balance(userId)) === 10, 'Balance restored to 10')
  const refundRow = await prisma.userCredit.findFirst({
    where: { userId, reason: `errored_playbook_refund:${pbId}` },
  })
  assert(refundRow?.amount === 1, 'Refund ledger row written with +1')
}

async function test10_nonErroredDeleteDoesNotRefund() {
  console.log('\n[10] Deleting a COMPLETE growth playbook does NOT refund')
  const { playbookService } = await import('../playbooks/playbook-service')
  const userId = await makeGrowthUser()
  const pbId = await makeUserPlaybook(userId)
  await prisma.userCredit.create({ data: { userId, amount: -1, reason: `playbook_consumed:${pbId}` } })
  await playbookRepository.setComplete(pbId)

  const res = await playbookService.deletePlaybook(pbId)
  assert(res.deleted && !res.creditRefunded, 'Deleted but no refund for a complete playbook')
  assert((await balance(userId)) === 9, 'Balance stays at 9 (no refund)')
}

async function test11_oneOffErroredDeleteDoesNotRefund() {
  console.log('\n[11] one_off user deleting an errored playbook does NOT refund')
  const { playbookService } = await import('../playbooks/playbook-service')
  const user = await prisma.user.create({ data: { email: `refund_test_${crypto.randomUUID()}@example.com` } })
  createdUserIds.push(user.id)
  await prisma.userSubscription.create({ data: { userId: user.id, plan: 'one_off', status: 'active' } })
  await prisma.userCredit.create({ data: { userId: user.id, amount: 1, reason: 'mock_payment_one_off' } })
  const pbId = await makeUserPlaybook(user.id)
  await prisma.userCredit.create({ data: { userId: user.id, amount: -1, reason: `playbook_consumed:${pbId}` } })
  await playbookRepository.setFailed(pbId, 'boom')

  const res = await playbookService.deletePlaybook(pbId)
  assert(res.deleted && !res.creditRefunded, 'Deleted but no refund for one_off plan')
  assert((await balance(user.id)) === 0, 'one_off balance stays at 0')
}

async function test12_refundIsIdempotentAndConsumptionRequired() {
  console.log('\n[12] Refund needs a real consumption and is once-per-playbook')
  const { refundGrowthCreditForErroredPlaybook } = await import('../users/user-repository')
  const userId = await makeGrowthUser()

  const ghostId = `pb_never_consumed_${crypto.randomUUID()}`
  const r1 = await refundGrowthCreditForErroredPlaybook(userId, ghostId)
  assert(!r1.refunded, 'No refund when nothing was consumed for the playbook')

  const consumedId = `pb_consumed_${crypto.randomUUID()}`
  await prisma.userCredit.create({ data: { userId, amount: -1, reason: `playbook_consumed:${consumedId}` } })
  const r2 = await refundGrowthCreditForErroredPlaybook(userId, consumedId)
  assert(r2.refunded, 'First refund succeeds')
  const r3 = await refundGrowthCreditForErroredPlaybook(userId, consumedId)
  assert(!r3.refunded, 'Second refund for same playbook is a no-op (idempotent)')
  const refundRows = await prisma.userCredit.count({
    where: { userId, reason: `errored_playbook_refund:${consumedId}` },
  })
  assert(refundRows === 1, 'Exactly one refund row exists')
}

async function test13_priorCycleConsumptionNotRefunded() {
  console.log('\n[13] A credit spent in a prior (reset) cycle is not refunded')
  const { refundGrowthCreditForErroredPlaybook } = await import('../users/user-repository')
  const userId = await makeGrowthUser()
  const oldId = `pb_old_cycle_${crypto.randomUUID()}`
  await prisma.userCredit.create({
    data: {
      userId, amount: -1, reason: `playbook_consumed:${oldId}`,
      createdAt: new Date(Date.now() - 40 * 24 * 60 * 60 * 1000),
    },
  })
  const r = await refundGrowthCreditForErroredPlaybook(userId, oldId)
  assert(!r.refunded, 'No refund for a consumption from an already-reset prior cycle')
}

// ─── Growth cycle quota: strict 10/cycle under concurrent completions ───────

// Make a growth user whose credit balance is exactly `remaining` (out of the
// 10/cycle grant) by consuming (10 - remaining) credits for throwaway ids.
async function makeGrowthUserWithRemaining(remaining: number): Promise<string> {
  const userId = await makeGrowthUser()
  const toConsume = 10 - remaining
  for (let i = 0; i < toConsume; i++) {
    await prisma.userCredit.create({
      data: { userId, amount: -1, reason: `playbook_consumed:warmup_${crypto.randomUUID()}` },
    })
  }
  return userId
}

async function test16_concurrentCompletionsRespectQuota() {
  console.log('\n[16] Concurrent completions never overshoot the 10/cycle quota (regression)')
  const { tryGrowthAutoUnlock } = await import('../playbooks/playbook-access')

  // The reported bug: 2 credits left, queue 3 playbooks that finish together.
  // Exactly 2 must auto-unlock; the 3rd must stay locked for the $29 overage.
  const userId = await makeGrowthUserWithRemaining(2)
  assert((await balance(userId)) === 2, 'Starts with 2 cycle credits remaining')

  const ids = await Promise.all([makeUserPlaybook(userId), makeUserPlaybook(userId), makeUserPlaybook(userId)])
  for (const id of ids) await playbookRepository.setComplete(id)

  // Fire all three completions at once to exercise the race window.
  const results = await Promise.all(ids.map(id => tryGrowthAutoUnlock(id, userId)))
  const unlocked = results.filter(r => r.unlocked).length

  assert(unlocked === 2, `Exactly 2 of 3 concurrent completions unlocked (got ${unlocked})`)
  assert((await balance(userId)) === 0, 'Balance lands at exactly 0 — never negative')

  // The single locked playbook is the one left for the overage paywall.
  const paidStates = await Promise.all(
    ids.map(async id => (await prisma.playbook.findUnique({ where: { id }, select: { paymentStatus: true } }))?.paymentStatus),
  )
  assert(paidStates.filter(s => s === 'paid').length === 2, 'Exactly 2 playbooks marked paid')
  assert(paidStates.filter(s => s !== 'paid').length === 1, 'Exactly 1 playbook left pending for the $29 overage')
}

async function test17_autoUnlockIsIdempotent() {
  console.log('\n[17] Re-running auto-unlock for the same playbook never double-spends')
  const { tryGrowthAutoUnlock } = await import('../playbooks/playbook-access')
  const userId = await makeGrowthUserWithRemaining(5)
  const pbId = await makeUserPlaybook(userId)
  await playbookRepository.setComplete(pbId)

  const first = await tryGrowthAutoUnlock(pbId, userId)
  assert(first.unlocked, 'First call unlocks the playbook')
  // Second call short-circuits on the already-paid playbook — no unlock, no spend.
  const second = await tryGrowthAutoUnlock(pbId, userId)
  assert(!second.unlocked, 'Second call is a no-op (already paid)')
  assert((await balance(userId)) === 4, 'Only one credit spent across repeated calls')
  assert(
    (await prisma.userCredit.count({ where: { userId, reason: `playbook_consumed:${pbId}` } })) === 1,
    'Exactly one consumption row for the playbook',
  )

  // Partial-run idempotency: a consumption row exists but the playbook was never
  // flipped to paid. The next call must re-assert paid WITHOUT spending again.
  const partialId = await makeUserPlaybook(userId)
  await playbookRepository.setComplete(partialId)
  await prisma.userCredit.create({
    data: { userId, amount: -1, reason: `playbook_consumed:${partialId}` },
  })
  const balanceBefore = await balance(userId)
  const recovered = await tryGrowthAutoUnlock(partialId, userId)
  assert(recovered.unlocked, 'Partial-run playbook is recovered to unlocked')
  assert((await balance(userId)) === balanceBefore, 'No extra credit spent on recovery')
  const recoveredPb = await prisma.playbook.findUnique({ where: { id: partialId }, select: { paymentStatus: true } })
  assert(recoveredPb?.paymentStatus === 'paid', 'Partial-run playbook now marked paid')
}

// ─── Per-plan playbook retention (purge beyond the keep-window) ─────────────

// Create `n` playbooks for a user, oldest first, each with the given status and
// a createdAt spaced 1 minute apart so ordering is deterministic. Returns ids
// in creation order (index 0 = oldest).
async function makeAgedPlaybooks(userId: string, n: number, status = 'complete'): Promise<string[]> {
  const ids: string[] = []
  for (let i = 0; i < n; i++) {
    const pbId = await makeUserPlaybook(userId)
    await prisma.playbook.update({
      where: { id: pbId },
      data: { status, createdAt: new Date(Date.now() - (n - i) * 60_000) },
    })
    ids.push(pbId)
  }
  return ids
}

async function test18_growthRetentionKeeps20() {
  console.log('\n[18] Growth retention purges terminal playbooks beyond the 20 most recent')
  const { playbookService } = await import('../playbooks/playbook-service')
  const userId = await makeGrowthUser()
  const ids = await makeAgedPlaybooks(userId, 23) // 3 over the growth limit

  const { purged } = await playbookService.enforcePlaybookRetention(userId, 'growth')
  assert(purged === 3, `Purged the 3 oldest beyond 20 (got ${purged})`)

  const remaining = await prisma.playbook.count({ where: { userId } })
  assert(remaining === 20, 'Exactly 20 playbooks retained')
  // The 3 oldest are gone; the 20 newest survive.
  const oldestGone = await prisma.playbook.count({ where: { id: { in: ids.slice(0, 3) } } })
  assert(oldestGone === 0, 'The 3 oldest playbooks were deleted')
  const newestKept = await prisma.playbook.count({ where: { id: { in: ids.slice(3) } } })
  assert(newestKept === 20, 'The 20 newest playbooks were kept')
}

async function test19_oneOffRetentionKeeps5() {
  console.log('\n[19] One-off / free retention keeps only the 5 most recent')
  const { playbookService } = await import('../playbooks/playbook-service')
  const user = await prisma.user.create({ data: { email: `ret_test_${crypto.randomUUID()}@example.com` } })
  createdUserIds.push(user.id)
  await prisma.userSubscription.create({ data: { userId: user.id, plan: 'one_off', status: 'active' } })
  await makeAgedPlaybooks(user.id, 8)

  const { purged } = await playbookService.enforcePlaybookRetention(user.id, 'one_off')
  assert(purged === 3, `Purged 3 beyond the 5-keep window (got ${purged})`)
  assert((await prisma.playbook.count({ where: { userId: user.id } })) === 5, 'Exactly 5 retained for one_off')
}

async function test20_retentionNeverPurgesInFlightOrDrafts() {
  console.log('\n[20] Retention never purges drafts or in-flight playbooks, even when old')
  const { playbookService } = await import('../playbooks/playbook-service')
  const user = await prisma.user.create({ data: { email: `ret_test_${crypto.randomUUID()}@example.com` } })
  createdUserIds.push(user.id)
  await prisma.userSubscription.create({ data: { userId: user.id, plan: 'one_off', status: 'active' } })

  // 5 fresh complete playbooks fill the keep-window; 2 OLD protected playbooks
  // (a draft + an in-flight 'writing') sit beyond it and must survive.
  await makeAgedPlaybooks(user.id, 5, 'complete')
  const [draftId] = await makeAgedPlaybooks(user.id, 1, 'draft')
  const [writingId] = await makeAgedPlaybooks(user.id, 1, 'writing')
  // Re-age the two protected ones to be the OLDEST so they fall outside the window.
  await prisma.playbook.update({ where: { id: draftId }, data: { createdAt: new Date(Date.now() - 100 * 60_000) } })
  await prisma.playbook.update({ where: { id: writingId }, data: { createdAt: new Date(Date.now() - 99 * 60_000) } })

  const { purged } = await playbookService.enforcePlaybookRetention(user.id, 'one_off')
  assert(purged === 0, 'Nothing purged — the only over-limit playbooks are protected')
  assert((await prisma.playbook.count({ where: { id: draftId } })) === 1, 'Old draft survives')
  assert((await prisma.playbook.count({ where: { id: writingId } })) === 1, 'Old in-flight playbook survives')
}

async function cleanupUsers(ids: string[]) {
  for (const id of ids) {
    await prisma.userCredit.deleteMany({ where: { userId: id } })
    await prisma.userSubscription.deleteMany({ where: { userId: id } })
    await prisma.user.deleteMany({ where: { id } })
  }
}

async function main() {
  console.log('=== ABMSignal Backend Tests ===')

  try {
    const playbookId = await test1_createPlaybook()
    const runId = await test2_generateCreatesRun(playbookId)
    await test3_researchOutputParsing()
    await test3b_envelopeMultiPayloadExtraction()
    await test4_invalidResearchOutputFails()
    await test5_contactApprovalSavesAndQueuesWriting(playbookId)
    await test6_writingOutputSavesSections(playbookId)
    await test7_statusEndpointShape(playbookId)
    await test8_failedRunSetsPlaybookError(playbookId, runId)
    await test14_recordPlaybookFailureSplitsAudiences()
    await test15_userMessageCategorization()
    await test9_growthErroredDeleteRefundsCredit()
    await test10_nonErroredDeleteDoesNotRefund()
    await test11_oneOffErroredDeleteDoesNotRefund()
    await test12_refundIsIdempotentAndConsumptionRequired()
    await test13_priorCycleConsumptionNotRefunded()
    await test16_concurrentCompletionsRespectQuota()
    await test17_autoUnlockIsIdempotent()
    await test18_growthRetentionKeeps20()
    await test19_oneOffRetentionKeeps5()
    await test20_retentionNeverPurgesInFlightOrDrafts()
  } finally {
    console.log('\n[cleanup] Removing test data...')
    await cleanup(createdIds)
    await cleanupUsers(createdUserIds)
    await prisma.$disconnect()
  }

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error('Test runner crashed:', err)
  process.exit(1)
})
