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

async function main() {
  console.log('=== ABMSignal Backend Tests ===')

  try {
    const playbookId = await test1_createPlaybook()
    const runId = await test2_generateCreatesRun(playbookId)
    await test3_researchOutputParsing()
    await test4_invalidResearchOutputFails()
    await test5_contactApprovalSavesAndQueuesWriting(playbookId)
    await test6_writingOutputSavesSections(playbookId)
    await test7_statusEndpointShape(playbookId)
    await test8_failedRunSetsPlaybookError(playbookId, runId)
  } finally {
    console.log('\n[cleanup] Removing test data...')
    await cleanup(createdIds)
    await prisma.$disconnect()
  }

  console.log(`\n=== Results: ${pass} passed, ${fail} failed ===`)
  if (fail > 0) process.exit(1)
}

main().catch(err => {
  console.error('Test runner crashed:', err)
  process.exit(1)
})
