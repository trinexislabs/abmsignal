import type { Playbook, Contact, QualityCheck, PlaybookSection } from '@/types'

export const MOCK_PLAYBOOKS: Playbook[] = [
  {
    id: 'pb-001',
    user_id: 'user-001',
    product_name: 'TracEI Compliance Suite',
    product_url: 'https://tracei.io',
    product_brief: {
      product_name: 'TracEI Compliance Suite',
      description: 'AI-powered regulatory compliance automation for European financial institutions',
      value_propositions: [
        'Reduce compliance reporting time by 70%',
        'Real-time ECB regulation monitoring and alerts',
        'Automated audit trail with full traceability',
        'Native SWIFT integration and ISO 20022 support',
      ],
      target_personas: ['Chief Compliance Officer', 'Head of Regulatory Affairs', 'CTO', 'Head of Payments'],
      differentiators: [
        'Only solution with real-time ECB supervisory database integration',
        'Built specifically for European banking compliance',
        'Human-in-the-loop review workflow for critical decisions',
      ],
      competitors: ['Wolters Kluwer', 'Temenos', 'Finastra'],
      deployment_model: 'saas',
      deal_size: '€180K-€400K ARR',
      sales_cycle: '6-9 months',
    },
    target_company: 'Meridian Financial Group',
    target_url: 'https://meridian-fg.com',
    industry: 'Banking & Financial Services',
    geography: 'Switzerland (Western Europe)',
    priority_tier: 'tier1',
    status: 'complete',
    progress_pct: 100,
    agent_status: [
      { agent: 'orchestrator', task: 'Playbook assembly', status: 'complete', detail: 'All sections compiled', completed_at: '2026-05-12T14:30:00Z' },
      { agent: 'researcher', task: 'Account intelligence', status: 'complete', detail: '47 sources analyzed', completed_at: '2026-05-12T11:15:00Z' },
      { agent: 'writer', task: 'Outreach sequences', status: 'complete', detail: '8 personalized sequences generated', completed_at: '2026-05-12T13:45:00Z' },
      { agent: 'reviewer', task: '16-point quality check', status: 'complete', detail: '14/16 pass, 2 warnings', completed_at: '2026-05-12T14:20:00Z' },
    ],
    created_at: '2026-05-12T09:00:00Z',
    updated_at: '2026-05-12T14:30:00Z',
  },
  {
    id: 'pb-002',
    user_id: 'user-001',
    product_name: 'TracEI Compliance Suite',
    product_url: 'https://tracei.io',
    product_brief: {
      product_name: 'TracEI Compliance Suite',
      description: 'AI-powered regulatory compliance automation for European financial institutions',
      value_propositions: ['Reduce compliance reporting time by 70%', 'Real-time ECB regulation monitoring'],
      target_personas: ['Chief Compliance Officer', 'Head of Regulatory Affairs'],
      differentiators: ['Only solution with real-time ECB supervisory database integration'],
      competitors: ['Wolters Kluwer', 'Temenos'],
      deployment_model: 'saas',
      deal_size: '€120K-€280K ARR',
      sales_cycle: '5-8 months',
    },
    target_company: 'Arcadia Capital Switzerland',
    target_url: 'https://ing.be',
    industry: 'Banking & Financial Services',
    geography: 'Switzerland (Western Europe)',
    priority_tier: 'tier1',
    status: 'reviewing',
    progress_pct: 82,
    agent_status: [
      { agent: 'orchestrator', task: 'Quality gate', status: 'running', detail: 'Assembling final playbook' },
      { agent: 'researcher', task: 'Account intelligence', status: 'complete', detail: '38 sources analyzed' },
      { agent: 'writer', task: 'Outreach sequences', status: 'complete', detail: '6 sequences generated' },
      { agent: 'reviewer', task: '16-point quality check', status: 'running', detail: 'Checking section consistency' },
    ],
    created_at: '2026-05-13T08:00:00Z',
    updated_at: '2026-05-13T16:45:00Z',
  },
  {
    id: 'pb-003',
    user_id: 'user-001',
    product_name: 'TracEI Compliance Suite',
    product_url: 'https://tracei.io',
    product_brief: {
      product_name: 'TracEI Compliance Suite',
      description: 'AI-powered regulatory compliance automation',
      value_propositions: ['Reduce compliance time', 'Automated audit trails'],
      target_personas: ['CTO', 'Head of Payments'],
      differentiators: ['ECB integration'],
      competitors: ['Finastra'],
      deployment_model: 'saas',
      deal_size: '€90K-€200K ARR',
      sales_cycle: '4-6 months',
    },
    target_company: 'Talentis Group',
    target_url: 'https://kbc.be',
    industry: 'Banking & Financial Services',
    geography: 'Switzerland (Western Europe)',
    priority_tier: 'tier2',
    status: 'contact_review',
    progress_pct: 35,
    agent_status: [
      { agent: 'orchestrator', task: 'Contact verification gate', status: 'running', detail: 'Awaiting human review' },
      { agent: 'researcher', task: 'Contact discovery', status: 'complete', detail: '12 contacts found' },
      { agent: 'writer', task: 'Outreach sequences', status: 'pending' },
      { agent: 'reviewer', task: '16-point quality check', status: 'pending' },
    ],
    created_at: '2026-05-13T14:00:00Z',
    updated_at: '2026-05-13T17:30:00Z',
  },
]

export const MOCK_CONTACTS: Contact[] = [
  {
    id: 'c-001',
    playbook_id: 'pb-001',
    name: 'Marc Raisière',
    title: 'Chief Executive Officer',
    linkedin_url: 'https://linkedin.com/in/marcraisiere',
    confidence: 'high',
    source: 'LinkedIn + Meridian IR page',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'c-002',
    playbook_id: 'pb-001',
    name: 'Dirk Wouters',
    title: 'Chief Financial Officer',
    linkedin_url: 'https://linkedin.com/in/dirkwouters',
    confidence: 'high',
    source: 'LinkedIn + Annual Report 2025',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'c-003',
    playbook_id: 'pb-001',
    name: 'Inge Ampe',
    title: 'Chief Risk & Compliance Officer',
    linkedin_url: 'https://linkedin.com/in/ingeampe',
    confidence: 'high',
    source: 'LinkedIn + ECB supervisory data',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'c-004',
    playbook_id: 'pb-001',
    name: 'Johan Vanden Eynde',
    title: 'Head of Payment Operations',
    linkedin_url: 'https://linkedin.com/in/johanvandeneynde',
    confidence: 'medium',
    source: 'The Org + LinkedIn',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'c-005',
    playbook_id: 'pb-001',
    name: 'Sophie Claes',
    title: 'Head of Regulatory Affairs',
    linkedin_url: 'https://linkedin.com/in/sophieclaes',
    confidence: 'medium',
    source: 'LinkedIn',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  {
    id: 'c-006',
    playbook_id: 'pb-001',
    name: 'Thomas Verheyden',
    title: 'Head of Digital Banking & Technology',
    linkedin_url: 'https://linkedin.com/in/thomasverheyden',
    confidence: 'medium',
    source: 'LinkedIn + Meridian press releases',
    verification_status: 'confirmed',
    created_at: '2026-05-12T10:00:00Z',
  },
  // Talentis contacts for pb-003 (contact review)
  {
    id: 'c-007',
    playbook_id: 'pb-003',
    name: 'Johan Thijs',
    title: 'Group Chief Executive Officer',
    linkedin_url: 'https://linkedin.com/in/johanthijs',
    confidence: 'high',
    source: 'LinkedIn + Talentis annual report',
    verification_status: 'pending',
    created_at: '2026-05-13T15:00:00Z',
  },
  {
    id: 'c-008',
    playbook_id: 'pb-003',
    name: 'Luc Popelier',
    title: 'Chief Financial Officer',
    linkedin_url: 'https://linkedin.com/in/lucpopelier',
    confidence: 'high',
    source: 'LinkedIn + Talentis investor page',
    verification_status: 'pending',
    created_at: '2026-05-13T15:00:00Z',
  },
  {
    id: 'c-009',
    playbook_id: 'pb-003',
    name: 'Erik Luts',
    title: 'Chief Innovation & Technology Officer',
    linkedin_url: 'https://linkedin.com/in/erikluts',
    confidence: 'high',
    source: 'LinkedIn',
    verification_status: 'pending',
    created_at: '2026-05-13T15:00:00Z',
  },
  {
    id: 'c-010',
    playbook_id: 'pb-003',
    name: 'Peter Michiels',
    title: 'Head of Compliance & Regulatory',
    linkedin_url: 'https://linkedin.com/in/petermichiels',
    confidence: 'medium',
    source: 'The Org + LinkedIn',
    verification_status: 'needs_review',
    created_at: '2026-05-13T15:00:00Z',
  },
  {
    id: 'c-011',
    playbook_id: 'pb-003',
    name: 'An Verbeke',
    title: 'Head of Payment Solutions',
    linkedin_url: 'https://linkedin.com/in/anverbeke',
    confidence: 'low',
    source: 'LinkedIn (unverified)',
    verification_status: 'needs_review',
    created_at: '2026-05-13T15:00:00Z',
  },
]

export const MOCK_QUALITY_CHECKS: QualityCheck[] = [
  { id: 'qc-001', playbook_id: 'pb-001', check_number: 1, check_name: 'All contacts have verified names, titles, and LinkedIn URLs', category: 'Accuracy', status: 'pass', details: '6 contacts verified, all with LinkedIn URLs and confirmed titles via multiple sources.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-002', playbook_id: 'pb-001', check_number: 2, check_name: 'No generic outreach — every sequence references specific account signals', category: 'Personalization', status: 'pass', details: 'All 8 email sequences reference Meridian-specific signals: FINMA Digital Finance Strategy 2024, Meridian Digital relaunch, March 2026 leadership announcement.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-003', playbook_id: 'pb-001', check_number: 3, check_name: '"Why Now" signals are recent (within 90 days) and specific', category: 'Relevance', status: 'pass', details: '4 signals found, all within 60 days: FINMA AI governance framework (Feb 2026), Meridian Q4 2025 results with compliance cost mention, ECB DORA enforcement date (Jan 2026), new CTO appointment (March 2026).', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-004', playbook_id: 'pb-001', check_number: 4, check_name: 'Cultural adaptation matches target geography + industry', category: 'Cultural Fit', status: 'pass', details: 'Swiss banking cultural rules applied: formal Dutch/French address, GDPR-first messaging, FINMA/ECB regulatory framing, in-person meeting preference noted.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-005', playbook_id: 'pb-001', check_number: 5, check_name: 'Competitive landscape identifies actual incumbents, not generic competitors', category: 'Accuracy', status: 'pass', details: 'Identified actual Meridian vendors: Wolters Kluwer FRR (confirmed by LinkedIn job postings), potential Temenos exposure, and FNZ for wealth management. No generic competitors listed.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-006', playbook_id: 'pb-001', check_number: 6, check_name: 'Battle cards address real objections, not straw-man arguments', category: 'Quality', status: 'pass', details: 'Objections sourced from actual banking compliance RFP documents and LinkedIn posts from target persona network.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-007', playbook_id: 'pb-001', check_number: 7, check_name: 'Every email has a clear CTA appropriate to the persona and stage', category: 'Effectiveness', status: 'pass', details: 'C-suite CTAs: 30-min strategy call. Director-level CTAs: technical deep-dive + pilot proposal. All CTAs stage-appropriate (awareness → consideration → decision).', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-008', playbook_id: 'pb-001', check_number: 8, check_name: "Tone matches the target's industry norms (formal vs. casual)", category: 'Cultural Fit', status: 'pass', details: 'Formal tone throughout. Dutch: "Geachte heer/mevrouw". French: "Monsieur/Madame". English backup for international-facing contacts. No first-name opener in initial outreach.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-009', playbook_id: 'pb-001', check_number: 9, check_name: 'No fabricated data — all claims are sourced or marked [UNVERIFIED]', category: 'Integrity', status: 'pass', details: '47 sources cited. 2 data points marked [UNVERIFIED]: exact Wolters Kluwer contract value and specific FINMA audit findings. All other claims sourced.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-010', playbook_id: 'pb-001', check_number: 10, check_name: 'Buying committee covers all key roles', category: 'Completeness', status: 'pass', details: 'Economic buyer (CFO), Technical buyer (CTO/Head of Digital), Champion (CCO), End user (Head of Payment Ops), Influencer (Head of Regulatory Affairs). All 5 archetypes covered.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-011', playbook_id: 'pb-001', check_number: 11, check_name: 'Measurement framework has realistic KPIs for the sales cycle length', category: 'Practicality', status: 'pass', details: 'KPIs calibrated to 6-9 month enterprise Swiss banking cycle: Month 1-2 (awareness), Month 3-4 (evaluation), Month 5-6 (proof of concept), Month 7-9 (procurement). Realistic conversion assumptions used.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-012', playbook_id: 'pb-001', check_number: 12, check_name: 'Content assets are actionable with specific topics', category: 'Specificity', status: 'warn', details: 'WARNING: Content brief for "ECB DORA compliance guide" lacks specific sub-topics. Recommend: "DORA Article 17 Incident Reporting for Swiss Banks — 3 gaps most are missing." Update suggested.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-013', playbook_id: 'pb-001', check_number: 13, check_name: 'Org chart reflects current reporting structure', category: 'Accuracy', status: 'pass', details: 'Org chart validated against Meridian 2025 Annual Report (March 2026 publication) and confirmed against 3 recent LinkedIn job postings. CEO change reflected (Marc Raisière confirmed March 2025).', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-014', playbook_id: 'pb-001', check_number: 14, check_name: "Outreach strategy accounts for target's preferred communication channels", category: 'Cultural Fit', status: 'pass', details: 'Swiss banking: LinkedIn outreach → email follow-up → warm introduction via network. In-person meeting as accelerator. Phone de-emphasized (GDPR sensitivity). Summer pause (July-Aug) noted in sequence timing.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-015', playbook_id: 'pb-001', check_number: 15, check_name: 'No internal inconsistencies between sections', category: 'Consistency', status: 'warn', details: 'WARNING: Section 3 (Buying Committee) lists "Head of Digital Payments" as key contact, but Section 8 (Sequences) addresses "Head of Payment Operations". These may be the same person — confirm Johan Vanden Eynde\'s exact title.', created_at: '2026-05-12T14:20:00Z' },
  { id: 'qc-016', playbook_id: 'pb-001', check_number: 16, check_name: 'All sources cited with confidence scores', category: 'Transparency', status: 'pass', details: 'Appendix lists 47 sources with confidence scores (High: 31, Medium: 12, Low/Unverified: 4). Source methodology documented.', created_at: '2026-05-12T14:20:00Z' },
]

export const MOCK_SECTIONS: PlaybookSection[] = [
  {
    id: 's-001',
    playbook_id: 'pb-001',
    section_type: 'executive_summary',
    title: 'Executive Summary',
    content: `# Executive Summary — Meridian Financial Group × TracEI Compliance Suite

## Why Meridian, Why Now, Why TracEI

**The Opportunity:** Meridian faces a convergent compliance challenge in 2026: simultaneous enforcement of DORA (Digital Operational Resilience Act), updated FINMA expectations on AI governance, and an internal transformation towards a "Meridian Digital" model that requires compliance infrastructure to keep pace with technology.

**The Signal:** In Q4 2025 earnings, CFO Dirk Wouters explicitly flagged "regulatory compliance overhead" as a key cost driver (+18% YoY). The Board has mandated a 25% reduction in compliance operational costs by 2027. TracEI directly addresses this mandate.

**The Entry Point:** The appointment of a new CTO (Thomas Verheyden, March 2026) represents a rare window — a technology leader open to new vendors, evaluating the compliance infrastructure he inherited, and accountable for delivering the "Meridian Digital" transformation.

**TracEI's Fit:**
- **DORA compliance automation** — Meridian must prove digital operational resilience to FINMA by Q2 2026
- **ECB supervisory integration** — Real-time monitoring eliminates the 2-week lag in their current Wolters Kluwer setup
- **Audit trail automation** — Directly addresses the "compliance overhead" cost driver identified by CFO

**Recommended Approach:** Enter through the Chief Risk & Compliance Officer (Inge Ampe) with a DORA readiness assessment framing. Expand to CFO with cost reduction metrics. Close with CTO on the technical integration roadmap.

**Target Timeline:** 6-month sales cycle. POC by September 2026, contract by Q4 2026.

**Deal Value:** €220K-€380K ARR (Tier 1 Swiss bank profile, based on comparable Arcadia Capital Switzerland + Talentis deal sizes).`,
    status: 'reviewed',
    created_at: '2026-05-12T13:00:00Z',
  },
  {
    id: 's-002',
    playbook_id: 'pb-001',
    section_type: 'account_snapshot',
    title: 'Account Snapshot',
    content: `# Account Intelligence Dossier — Meridian Financial Group

## Company Overview
**Meridian Financial Group & Insurance NV** is a Swiss financial institution wholly owned by the Swiss Federal State. Headquartered in Zurich, it operates across retail banking, insurance, public & social banking, and corporate banking.

**Key Stats (2025 Annual Report):**
- Total assets: €157.2 billion
- Net profit 2025: €842 million (+7% YoY)
- Employees: ~7,800 FTE
- Market position: #3 Swiss bank (behind BNP Paribas Fortis and Talentis)
- Rating: Moody's A2, S&P A

## Strategic Initiatives (2026)
1. **"Meridian Digital" Transformation** — €400M+ multi-year investment in digital infrastructure. New CTO Thomas Verheyden (appointed March 2026) is accountable for delivery.
2. **Cost Optimization Program** — Board mandate: 25% reduction in operational overhead by 2027. Compliance infrastructure explicitly cited.
3. **DORA Compliance Roadmap** — FINMA-mandated readiness assessment by Q2 2026. Current infrastructure is partially compliant.
4. **AI Governance Framework** — Responding to FINMA circular on AI use in financial services (Feb 2026). Compliance team building new oversight processes.

## Technology Stack (Verified)
- **Core Banking:** In-house legacy + Temenos T24 (partial)
- **Compliance Platform:** Wolters Kluwer FRR (confirmed via 3 LinkedIn job postings requiring "FRR experience")
- **Risk Management:** SAS Risk Management
- **Payments:** Internal SWIFT gateway + Finastra Fusion
- **Cloud:** AWS (partial migration, confirmed by job postings)

## Regulatory Environment
- **Supervisor:** National Bank of Switzerland (FINMA) + ECB (SSM — Meridian is a significant institution)
- **Active Frameworks:** DORA (deadline: Jan 2025 — in remediation), CRR3, BRRD2
- **Upcoming:** AI Act compliance obligations (2026), Basel 4 (2025-2028 phased)

## Financial Context
- Compliance costs grew 18% YoY in 2025 (per CFO commentary in Q4 earnings)
- IT operational spend: ~€450M/year (estimated from public disclosures)
- Procurement cycle: Budget finalization November, procurement decisions Q1/Q2`,
    status: 'reviewed',
    created_at: '2026-05-12T13:05:00Z',
  },
  {
    id: 's-003',
    playbook_id: 'pb-001',
    section_type: 'buying_committee',
    title: 'Buying Committee & Org Map',
    content: `# Buying Committee & Org Map

## Decision-Making Structure

\`\`\`
Marc Raisière (CEO)
├── Dirk Wouters (CFO) ← Economic Buyer
│   └── [Finance & Risk oversight]
├── Inge Ampe (Chief Risk & Compliance Officer) ← Champion
│   ├── Sophie Claes (Head of Regulatory Affairs) ← End User Lead
│   └── [Compliance operations team, ~45 FTE]
├── Thomas Verheyden (CTO, new March 2026) ← Technical Buyer
│   ├── Johan Vanden Eynde (Head of Payment Operations) ← End User
│   └── [Digital & Technology, ~180 FTE]
\`\`\`

## Persona Profiles

### Inge Ampe — Chief Risk & Compliance Officer (CHAMPION)
**Pain:** "We're running on 5 different systems for compliance reporting. DORA readiness is being done in spreadsheets."
**Goal:** Demonstrate FINMA readiness for DORA by Q2 2026. Reduce compliance team's operational burden.
**Buying trigger:** DORA audit scheduled for Q3 2026. Needs a solution before then.
**Message:** Frame TracEI as the "DORA readiness platform" — specifically address Article 17 incident reporting requirements.

### Dirk Wouters — CFO (ECONOMIC BUYER)
**Pain:** Compliance costs +18% YoY. Board has set 25% reduction mandate for 2027.
**Goal:** Justify compliance tech investment with hard ROI metrics. Avoid surprises from regulators.
**Buying trigger:** Annual budget review (November). Cost reduction initiatives in flight.
**Message:** Lead with ROI: "TracEI customers reduce compliance reporting time by 70% — at Meridian scale, that's approximately €2.8M in operational savings annually."

### Thomas Verheyden — CTO (TECHNICAL BUYER)
**Pain:** Inherited a fragmented compliance infrastructure. Needs to rationalize vendor stack as part of "Meridian Digital."
**Goal:** Modernize technology stack, reduce vendor count, improve API connectivity.
**Buying trigger:** New in role (March 2026). Evaluating inherited vendor relationships. First 90 days = window of opportunity.
**Message:** Lead with integration story: "One API, real-time ECB data, replaces 3 legacy compliance data feeds."

### Johan Vanden Eynde — Head of Payment Operations (END USER)
**Pain:** Manual ISO 20022 compliance checks. SWIFT reporting is semi-manual.
**Goal:** Automate payment compliance monitoring. Reduce errors in cross-border payment reporting.
**Message:** Technical demo of SWIFT and ISO 20022 modules. Reduction in manual exceptions.`,
    status: 'complete',
    created_at: '2026-05-12T13:10:00Z',
  },
  {
    id: 's-004',
    playbook_id: 'pb-001',
    section_type: 'why_now',
    title: '"Why Now" Signal Analysis',
    content: `# "Why Now" Signal Analysis

## Tier 1 Signals (High Urgency)

### Signal 1: DORA Enforcement + Meridian Gap
**Date:** January 17, 2025 (DORA enforcement date) — ongoing FINMA remediation through 2026
**Source:** FINMA supervisory circular + ECB SSM Q1 2026 assessment notes
**Detail:** Meridian received a supervisory observation on digital operational resilience in Q1 2026. The observation specifically notes "inadequate automated incident reporting and detection capabilities." FINMA expects a remediation plan with a working system by Q3 2026.
**TracEI relevance:** TracEI's DORA incident reporting module (Article 17) is the direct solution.
**Urgency level:** CRITICAL — deadline is a regulatory requirement, not optional.

### Signal 2: New CTO Appointment — Window of Opportunity
**Date:** March 14, 2026
**Source:** Meridian press release + LinkedIn announcement (2,847 likes — high visibility)
**Detail:** Thomas Verheyden appointed as Chief Technology Officer. Previously VP Digital at Arcadia Capital Switzerland where he led the migration off Wolters Kluwer FRR to a modern compliance stack. He has public statements on "vendor rationalization" in enterprise banking.
**TracEI relevance:** New CTO who has previously replaced the exact incumbent (Wolters Kluwer) we're displacing. Will be evaluating compliance infrastructure in first 90 days.
**Urgency level:** HIGH — new CTO window closes in 3-4 months.

## Tier 2 Signals (Strategic Relevance)

### Signal 3: Q4 2025 Earnings — Compliance Cost Call-Out
**Date:** February 28, 2026
**Source:** Meridian 2025 Full Year Results (public)
**Detail:** CFO Dirk Wouters: "We are not satisfied with the trajectory of regulatory compliance costs. We will invest in automation to bring this line back under control." Compliance cost grew from €84M to €99M (+18%).
**TracEI relevance:** The CFO has publicly acknowledged the pain we solve.

### Signal 4: FINMA AI Governance Circular
**Date:** February 3, 2026
**Source:** FINMA Circular 2026-02 on AI in financial services
**Detail:** FINMA requires Swiss banks to have documented AI governance frameworks in place by December 2026. Meridian has significant AI usage in credit scoring and fraud detection — all requires new compliance oversight.
**TracEI relevance:** TracEI's AI compliance module directly addresses FINMA circular requirements.`,
    status: 'complete',
    created_at: '2026-05-12T13:15:00Z',
  },
  {
    id: 's-005',
    playbook_id: 'pb-001',
    section_type: 'competitive_landscape',
    title: 'Competitive Landscape',
    content: `# Competitive Landscape at Meridian

## Current Vendor Landscape (Confirmed)

### Wolters Kluwer FRR — PRIMARY INCUMBENT
**Confirmed by:** 7 LinkedIn job postings requiring "Wolters Kluwer FRR" experience (2024-2026)
**Contract value estimate:** €800K-€1.2M/year (based on Meridian size and typical WK FRR licensing)
**Weakness at Meridian:**
- Legacy architecture — no real-time ECB data integration
- 2-week regulatory update lag (confirmed by ex-employee LinkedIn post)
- Contract renewal window: Estimated Q1 2027 (3-year cycle, last renewal 2024)
- New CTO Thomas Verheyden replaced WK FRR at Arcadia Capital Switzerland — has first-hand experience of its limitations

**TracEI displacement strategy:** Don't attack WK FRR head-on. Instead, position as "the DORA gap filler" — WK FRR doesn't cover DORA's new requirements adequately, and Meridian needs to either buy an add-on or switch. Our module is a clean DORA solution that can eventually consolidate.

### Temenos T24 Compliance Module — PARTIAL
**Scope:** Core banking compliance only (not regulatory reporting)
**Risk:** Temenos may pitch expanding its compliance module
**Counter:** Temenos compliance module is generalist; TracEI is European bank specialist with ECB-native integration.

## Competitive Differentiation Summary

| Capability | TracEI | Wolters Kluwer FRR | Temenos |
|-----------|--------|-------------------|---------|
| Real-time ECB data | ✅ Yes | ❌ 2-week lag | ❌ No |
| DORA Article 17 | ✅ Native | ⚠️ Add-on (extra cost) | ❌ No |
| ISO 20022 native | ✅ Yes | ⚠️ Partial | ⚠️ Partial |
| Swiss regulatory rules | ✅ FINMA-specific | ✅ Yes | ❌ Generic |
| AI compliance (FINMA circular) | ✅ Yes | ❌ No | ❌ No |
| Implementation time | 8-12 weeks | 6-9 months | 12-18 months |`,
    status: 'complete',
    created_at: '2026-05-12T13:20:00Z',
  },
  {
    id: 's-006',
    playbook_id: 'pb-001',
    section_type: 'cultural_context',
    title: 'Cultural & Regulatory Context',
    content: `# Cultural & Regulatory Context — Swiss Banking

## Communication Rules (Switzerland — Financial Services)

### Formality
- **Address:** "Geachte heer/mevrouw [Surname]" (Dutch) / "Monsieur/Madame [Surname]" (French) for initial outreach
- **First names:** Only after relationship is established (typically 2nd or 3rd meeting)
- **Titles:** Always use professional titles (Dr., Drs., Ir.) if known. "Chief Risk Officer Ampe" not "Inge" in initial email.

### Communication Preferences
- **Channel priority:** LinkedIn InMail → professional email → phone (in that order)
- **Response expectations:** Swiss bankers respond within 3-5 business days to relevant outreach. Don't follow up in under 72 hours.
- **Meeting format:** Virtual acceptable for initial intro; in-person strongly preferred for substantive discussions. Zurich office meetings, not video calls, close deals.
- **Language:** Dutch for Flemish contacts (Meridian HQ is Zurich — bilingual). Default to English for written follow-up; it's the working language of Swiss banking compliance teams.

### Seasonal Rules
- **July-August:** Full summer pause. Do not initiate new conversations. Only follow-up on active deals.
- **December 15 - January 7:** Holiday pause.
- **Best outreach windows:** March-June, September-November.

## Regulatory Framing Rules
- **Always lead with regulatory context:** Swiss banking buyers respond to "your regulator requires X" before they respond to "our product does Y."
- **FINMA references:** The National Bank of Switzerland is more trusted than vendor claims. Use "FINMA circular 2026-02 requires..." framing.
- **GDPR sensitivity:** Never mention collecting personal data in outreach emails. Swiss banking compliance teams are GDPR-trained and will immediately flag any data privacy concerns.
- **Avoid:** "AI-powered" as a lead — Swiss banking has complex AI governance requirements and the term triggers caution. Use "automated" or "rules-based with AI assistance" instead.

## Cultural Don'ts (Swiss Banking)
- ❌ "I came across your company" — they know you did research
- ❌ "Are you the right person to speak to?" — implies you didn't do your homework
- ❌ Urgency language ("limited time offer", "act now") — kills credibility in formal banking relationships
- ❌ Referencing publicly-known difficulties without being invited to (e.g., don't mention the 2011 bailout)
- ❌ American informality — "Hey Inge!" in an email to a C-suite Swiss banker is an immediate disqualifier`,
    status: 'complete',
    created_at: '2026-05-12T13:25:00Z',
  },
  {
    id: 's-007',
    playbook_id: 'pb-001',
    section_type: 'deal_motion',
    title: 'Deal Motion & Channel Strategy',
    content: `# Outreach Strategy

## Multi-Touch Sequence Design

### Phase 1: Warm Entry (Weeks 1-4)
**Objective:** Establish credibility before asking for a meeting

1. **LinkedIn connection request** (Day 1) — to Inge Ampe (CCO) and Thomas Verheyden (CTO)
   - No sales pitch in connection request. "Following your work on [specific topic]."

2. **Engagement** (Day 3-7) — Like/comment on a relevant post from each contact. Comment must add value, not be promotional.

3. **LinkedIn InMail — CCO** (Day 8) — DORA readiness angle (see sequence in Section 8)

4. **LinkedIn InMail — CTO** (Day 10) — Vendor rationalization + ECB integration angle

### Phase 2: Email Follow-Up (Weeks 5-8)
5. **Email — CCO** (Day 35) — Follow up InMail with formal email. Include 1-page DORA gap assessment for Swiss banks.

6. **Email — CFO** (Day 38) — Cost reduction angle. Include ROI calculator link.

7. **Reference intro** (Day 42) — If network connection available, warm introduction to either CCO or CTO.

### Phase 3: Meeting Request (Weeks 9-12)
8. **Formal meeting request** (Day 60) — After engagement signals detected. Request "30-minute DORA readiness briefing" — not a sales call.

## Channel Prioritization
| Contact | Primary Channel | Secondary | Notes |
|---------|---------------|-----------|-------|
| Inge Ampe (CCO) | LinkedIn InMail | Email | Most active on LinkedIn (3-4 posts/month) |
| Dirk Wouters (CFO) | Email | LinkedIn | Not active on LinkedIn publicly |
| Thomas Verheyden (CTO) | LinkedIn | Email | Just joined — high LinkedIn activity post-announcement |
| Johan Vanden Eynde | Email | LinkedIn | Technical contact — email more appropriate |

## Trigger Events (Accelerators)
- FINMA inspection announcement → Immediate "DORA support" message to CCO
- Meridian press release or earnings → Relevant content response within 24 hours
- Thomas Verheyden LinkedIn post → Strategic engagement opportunity`,
    status: 'complete',
    created_at: '2026-05-12T13:30:00Z',
  },
  {
    id: 's-008',
    playbook_id: 'pb-001',
    section_type: 'personalized_sequences',
    title: 'Hyper-Personalized Sequences',
    content: `# Hyper-Personalized Outreach Sequences

## Sequence 1: Inge Ampe — Chief Risk & Compliance Officer

### Touch 1: LinkedIn InMail (Day 8)
**Subject:** DORA Article 17 — What Meridian needs by Q3

Geachte mevrouw Ampe,

Uw team staat voor een specifieke uitdaging in 2026: de FINMA verwacht vóór Q3 een aantoonbare automatisering van DORA-incidentmelding (Artikel 17). Volgens onze analyse van de supervisory observations die Belgische significante instellingen hebben ontvangen, is geautomatiseerde detectie het meest voorkomende aandachtspunt.

Bij TracEI hebben we dit specifieke DORA-probleem opgelost voor twee Europese banken van vergelijkbare omvang. De implementatie duurde 10 weken en de FINMA-review verliep zonder aandachtspunten.

Zou u 20 minuten beschikbaar hebben voor een technische briefing? Geen verkooppitch — gewoon een concrete bespreking van hoe Meridian aan Artikel 17 kan voldoen vóór uw volgende supervisory review.

Met vriendelijke groet,
[Your name]
TracEI | European Banking Compliance

---

### Touch 2: Email Follow-Up (Day 35)
**Subject:** Re: DORA Artikel 17 — Belgisch bankassessment

Geachte mevrouw Ampe,

Ik had u eerder een bericht gestuurd over DORA Artikel 17-vereisten. Bijgevoegd vindt u ons assessment van de vijf meest voorkomende compliance-gaps bij Belgische banken van uw omvang — specifiek gericht op de FINMA supervisory observations uit Q1 2026.

Pagina 3 is bijzonder relevant voor uw situatie: de uitdaging van geautomatiseerde incidentdetectie bij gedistribueerde IT-infrastructuur.

Mocht u interesse hebben: ik sta graag klaar voor een briefing van 30 minuten.

---

## Sequence 2: Thomas Verheyden — CTO (English)

### Touch 1: LinkedIn InMail (Day 10)
**Subject:** Vendor rationalization in Swiss banking compliance

Dear Thomas,

Congratulations on the CTO appointment — following your work at Arcadia Capital Switzerland has been insightful.

You're likely doing exactly what you did at ING: assessing the compliance infrastructure you inherited and evaluating whether it serves where Meridian Digital is heading.

The specific challenge at a bank of Meridian's profile: DORA's new incident reporting requirements aren't well-served by legacy compliance platforms that were designed for Basel III, not for digital operational resilience.

I know your team is busy. Happy to send a 2-page technical brief on how TracEI addresses this specific gap — no meeting required, just useful context for the evaluation you're presumably doing.

Best,
[Your name]

---

## Sequence 3: Dirk Wouters — CFO (Cost Angle)

### Touch 1: Email (Day 38)
**Subject:** Compliance cost trajectory — one data point

Dear Mr. Wouters,

In the Q4 2025 results, you noted that compliance costs grew 18% YoY and set a target of returning them to a more manageable trajectory.

One data point that may be relevant: the 70% reduction in compliance reporting time our clients achieve translates to approximately €2.4M-€3.1M in annual operational savings at a bank of Meridian's scale (based on your disclosed compliance headcount and the FINMA-mandated reporting workload).

I'm not in a position to promise those exact numbers — every institution is different. But I'd be glad to walk your team through the methodology behind that estimate, and let you assess whether it applies to Meridian's situation.

Would a 30-minute call make sense?`,
    status: 'complete',
    created_at: '2026-05-12T13:35:00Z',
  },
  {
    id: 's-009',
    playbook_id: 'pb-001',
    section_type: 'battle_cards',
    title: 'Battle Cards & Objection Handling',
    content: `# Battle Cards & Objection Handling

## Objection 1: "We're already using Wolters Kluwer FRR"
**Frequency:** Very high (confirmed incumbent)
**Source:** Sourced from banking compliance LinkedIn group discussions, not assumed

**Response:**
"Wolters Kluwer FRR is an excellent platform for Basel-era compliance reporting — and we know it well. The challenge is that FRR was designed before DORA, the AI Act, and the FINMA's new operational resilience requirements. Swiss banks are discovering they need to either buy WK's DORA add-on (which adds cost and complexity) or find a purpose-built solution.

We're not here to replace FRR on day one. Many of our clients run TracEI alongside FRR for the new regulatory requirements, and eventually consolidate. The starting point for Meridian would be DORA Article 17 automation — which FRR doesn't currently cover."

**Key proof point:** Flemish bank case study (available on request) where TracEI DORA module was deployed alongside WK FRR in 10 weeks, without disrupting existing WK workflows.

---

## Objection 2: "We don't have bandwidth for a new vendor implementation"
**Frequency:** High (Swiss banking IT teams are stretched)
**Response:**
"That's the right concern. Implementation complexity is the #1 reason compliance tech projects get killed internally. TracEI is designed for exactly this constraint: API-first, connects to your existing data sources without replacing them, and our Swiss banking implementation team handles all FINMA configuration.

The Flemish bank we referenced was live in 10 weeks with 2 FTE from their compliance team — no infrastructure project, no integration marathon."

---

## Objection 3: "We need to go through procurement — this takes 12-18 months"
**Frequency:** Medium
**Response:**
"We understand Swiss banking procurement cycles. For DORA compliance specifically, there's a regulatory urgency argument that can accelerate procurement — the FINMA observation letter creates a compliance risk that procurement committees treat differently from discretionary purchases.

We've helped two Swiss financial institutions use a 'regulatory urgency' pathway through their procurement process. Happy to share how that was structured."

---

## Objection 4: "Can you guarantee data stays in Switzerland/EU?"
**Frequency:** High (GDPR + regulatory data sensitivity)
**Response:**
"All data processed by TracEI is hosted in AWS eu-central-1 (Frankfurt) — EU residency guaranteed. We're happy to provide our Data Processing Agreement, which includes specific clauses on sub-processor locations and the prohibition on any data transfer outside the EU. Our DPA has been reviewed and approved by the legal teams of 4 Swiss financial institutions."`,
    status: 'complete',
    created_at: '2026-05-12T13:40:00Z',
  },
  {
    id: 's-010',
    playbook_id: 'pb-001',
    section_type: 'value_proposition',
    title: 'Value Proposition Map',
    content: `# Content Asset Strategy

## Recommended Content Assets (Priority Order)

### Asset 1: "Meridian-Specific DORA Gap Assessment" (1-pager)
**Purpose:** Door opener for CCO outreach
**Format:** PDF, 2 pages maximum
**Content:** Specific Article 17 (incident reporting) and Article 23 (ICT risk management) gap analysis relevant to a Swiss significant institution with Meridian's IT profile
**Production:** 3 hours with TracEI DORA knowledge base
**Gating:** Ungated — attached directly to outreach email

### Asset 2: "ROI Calculator — Compliance Automation for Swiss Banks"
**Purpose:** CFO engagement
**Format:** Interactive Google Sheet or simple web tool
**Content:** Inputs: compliance headcount, reporting frequency, average hours per report. Output: annual hours saved, cost reduction estimate, time-to-ROI.
**Key:** Pre-populate with Swiss banking industry benchmarks so CFO can see relevant estimates immediately
**Production:** 8 hours

### Asset 3: "DORA Article 17 Implementation Guide for Swiss Banks" (5-page white paper)
**Purpose:** Nurture CCO and regulatory team
**Topic (specific):** "DORA Article 17 Incident Reporting: The 5 gaps most Swiss banks are missing — and how to close them before your FINMA supervisory review"
**Differentiation from generic DORA guides:** Swiss-specific — references FINMA supervisory observations, Meridian-relevant technology profile
**Production:** 12 hours

### Asset 4: "Flemish Bank Case Study" (with metrics)
**Purpose:** Late-stage proof for C-suite
**Content:** 10-week implementation, DORA Article 17 compliance achieved, FINMA review outcome, cost savings
**Note:** Anonymize client if needed, but include real metrics
**Timing:** Deploy at meeting stage, not cold outreach

## Content Sequencing
| Stage | Asset | Channel |
|-------|-------|---------|
| Cold outreach | 1-pager DORA gap assessment | Attached to LinkedIn InMail / email |
| Early nurture | Blog post on DORA Article 17 | LinkedIn share + email newsletter |
| Mid-funnel | ROI calculator | Direct email to CFO, linked from website |
| Meeting prep | Full white paper | Sent 48h before first meeting |
| Decision stage | Case study + technical brief | Shared in meeting + follow-up |`,
    status: 'complete',
    created_at: '2026-05-12T13:45:00Z',
  },
  {
    id: 's-011',
    playbook_id: 'pb-001',
    section_type: 'roi_model',
    title: 'ROI Model',
    content: `# Measurement Framework

## Campaign KPIs by Stage

### Stage 1: Awareness (Month 1-2)
| KPI | Target | Method |
|-----|--------|--------|
| LinkedIn connection acceptance rate | >40% | LinkedIn analytics |
| InMail open rate | >60% | LinkedIn InMail analytics |
| InMail response rate | >15% | LinkedIn InMail analytics |
| Email open rate | >45% | Email tracking |
| Content asset downloads (1-pager) | 3+ from Meridian domain | Gating + UTM tracking |

### Stage 2: Evaluation (Month 3-4)
| KPI | Target | Method |
|-----|--------|--------|
| Meeting secured | 1 with CCO or CTO | CRM |
| Stakeholders engaged | 3+ buying committee members | CRM contact tracking |
| ROI calculator usage | 1+ from Meridian domain | Analytics |
| Follow-up response rate | >50% | CRM |

### Stage 3: Proof of Concept (Month 5-6)
| KPI | Target | Method |
|-----|--------|--------|
| POC proposal submitted | Yes | CRM milestone |
| POC scope agreed | DORA Article 17 module | CRM |
| Internal champion confirmed | Yes (CCO) | CRM |
| Procurement process started | Yes | CRM |

### Stage 4: Procurement & Close (Month 7-9)
| KPI | Target | Method |
|-----|--------|--------|
| Contract value | €220K-€380K ARR | CRM |
| Contract signed | Q4 2026 | CRM |
| Implementation start | Q4 2026 | Project tracking |

## Leading Indicators (Early Warning System)
- ✅ CCO responds to InMail within 5 days → On track
- ✅ CTO accepts LinkedIn connection within 2 weeks → On track
- ⚠️ No response from any contact after 3 touches → Adjust entry point or message
- ❌ Meeting declined with "not a priority" → Investigate timing; consider waiting for FINMA announcement

## Campaign Health Dashboard
Track weekly: total touches, responses, meetings, pipeline value generated, days to next milestone.`,
    status: 'complete',
    created_at: '2026-05-12T13:50:00Z',
  },
  {
    id: 's-012',
    playbook_id: 'pb-001',
    section_type: 'appendix',
    title: 'Appendix',
    content: `# Appendix — Sources & Research Methodology

## Research Methodology
This playbook was generated using TracEI's AI research engine (Researcher agent), which ran 5 iterative UDR (Universal Deep Research) loops:
1. Account intelligence loop — 18 sources, 3h
2. Contact discovery loop — 12 sources, 1.5h
3. "Why Now" signal loop — 9 sources, 1h
4. Cultural/regulatory loop — 8 sources, 1h
5. Competitive landscape loop — 7 sources, 45min

**Total research time:** 7.25 hours automated research
**Sources analyzed:** 47 (after deduplication)
**Data points extracted:** 312

## Source List (Selected)

### High Confidence Sources (31)
| Source | Type | Date | Confidence |
|--------|------|------|------------|
| Meridian 2025 Annual Report | Official | March 2026 | High |
| Meridian Q4 2025 Earnings Transcript | Official | Feb 2026 | High |
| FINMA Circular 2026-02 (AI Governance) | Regulatory | Feb 2026 | High |
| ECB SSM Q1 2026 Assessment Report | Regulatory | Q1 2026 | High |
| Thomas Verheyden LinkedIn Profile | Social/Public | March 2026 | High |
| Inge Ampe LinkedIn Profile | Social/Public | 2026 | High |
| Meridian CTO announcement (press release) | Official | March 14, 2026 | High |
| DORA Official Journal (EU) | Regulatory | Jan 2025 | High |

### Medium Confidence Sources (12)
| Source | Type | Notes |
|--------|------|-------|
| The Org — Meridian org chart | Third-party | May be 3-6 months outdated |
| LinkedIn job postings x7 | Inferred data | Good proxy for tech stack |
| Craft.co company data | Third-party | Financial estimates, not audited |
| Swiss banking compliance forum posts | Community | Anecdotal but directionally useful |

### Unverified Data Points (4)
| Data Point | Status | Action Required |
|------------|--------|----------------|
| Wolters Kluwer FRR contract value (€800K-1.2M) | [UNVERIFIED] | Estimate only — verify via discovery call |
| Johan Vanden Eynde exact title | [UNVERIFIED] | LinkedIn shows "Head of Payments" — confirm Head of Payment Ops vs. Payments |
| FINMA DORA observation details | [UNVERIFIED] | Inferred from supervisory pattern, not confirmed |
| Temenos T24 contract scope | [UNVERIFIED] | Inferred from job postings |`,
    status: 'complete',
    created_at: '2026-05-12T13:55:00Z',
  },
]

export function getMockPlaybook(id: string): Playbook | undefined {
  return MOCK_PLAYBOOKS.find(p => p.id === id)
}

export function getMockContacts(playbookId: string): Contact[] {
  return MOCK_CONTACTS.filter(c => c.playbook_id === playbookId)
}

export function getMockQualityChecks(playbookId: string): QualityCheck[] {
  return MOCK_QUALITY_CHECKS.filter(c => c.playbook_id === playbookId)
}

export function getMockSections(playbookId: string): PlaybookSection[] {
  return MOCK_SECTIONS.filter(s => s.playbook_id === playbookId)
}
