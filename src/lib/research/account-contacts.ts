/**
 * Account-specific contact generation for ABM playbooks.
 * Generates realistic contacts based on the target company's industry and geography.
 * For MVP demo — replaced by real agent research in production.
 */

import type { Contact, ContactConfidence, ContactVerificationStatus } from '@/types'

interface AccountContext {
  companyName: string
  industry: string
  geography: string
}

const INDUSTRY_CONTACTS: Record<string, { titles: string[]; departments: string[]; focus: string }[]> = {
  'Banking & Finance': [
    { titles: ['Chief Digital Officer', 'Chief Innovation Officer'], departments: ['C-Suite', 'Digital'], focus: 'Digital transformation and fintech partnerships' },
    { titles: ['Chief Technology Officer', 'VP of Engineering', 'Head of IT Infrastructure'], departments: ['Technology', 'IT'], focus: 'Core banking modernization and cloud migration' },
    { titles: ['Chief Financial Officer', 'VP of Treasury', 'Head of Financial Planning'], departments: ['Finance', 'Treasury'], focus: 'Cost optimization and financial reporting automation' },
    { titles: ['Chief Risk Officer', 'Head of Compliance', 'VP of Regulatory Affairs'], departments: ['Risk', 'Compliance'], focus: 'Regulatory compliance and risk management' },
    { titles: ['Head of Payments', 'VP of Payment Operations', 'Director of Payment Solutions'], departments: ['Payments', 'Operations'], focus: 'Payment processing and real-time settlement' },
    { titles: ['Head of Enterprise Architecture', 'Director of Application Development'], departments: ['Architecture', 'Engineering'], focus: 'System integration and API-first architecture' },
    { titles: ['Head of Data & Analytics', 'VP of Business Intelligence', 'Chief Data Officer'], departments: ['Data', 'Analytics'], focus: 'Data governance and analytics capabilities' },
  ],
  'Technology': [
    { titles: ['Chief Technology Officer', 'VP of Engineering', 'SVP of Technology'], departments: ['Engineering', 'Technology'], focus: 'Platform scalability and technical strategy' },
    { titles: ['Chief Product Officer', 'VP of Product', 'Head of Product Management'], departments: ['Product', 'Strategy'], focus: 'Product roadmap and market positioning' },
    { titles: ['Chief Information Security Officer', 'VP of Security', 'Head of InfoSec'], departments: ['Security', 'IT'], focus: 'Security posture and compliance' },
    { titles: ['VP of Sales', 'Head of Enterprise Sales', 'Chief Revenue Officer'], departments: ['Sales', 'Revenue'], focus: 'Enterprise sales and go-to-market strategy' },
    { titles: ['Head of DevOps', 'VP of Platform Engineering'], departments: ['DevOps', 'Infrastructure'], focus: 'CI/CD and cloud infrastructure' },
    { titles: ['Head of Data Science', 'VP of AI/ML', 'Chief Data Officer'], departments: ['Data', 'AI'], focus: 'Machine learning and data-driven decision making' },
  ],
  'Healthcare': [
    { titles: ['Chief Medical Information Officer', 'VP of Clinical Informatics'], departments: ['Clinical', 'Informatics'], focus: 'Clinical workflow digitization' },
    { titles: ['Chief Information Officer', 'VP of IT', 'Head of Health IT'], departments: ['IT', 'Technology'], focus: 'EHR integration and health data exchange' },
    { titles: ['Chief Operating Officer', 'VP of Operations'], departments: ['Operations', 'Administration'], focus: 'Operational efficiency and patient experience' },
    { titles: ['Chief Compliance Officer', 'VP of Regulatory Affairs'], departments: ['Compliance', 'Legal'], focus: 'HIPAA compliance and patient data privacy' },
    { titles: ['Head of Revenue Cycle', 'VP of Finance', 'CFO'], departments: ['Finance', 'Revenue'], focus: 'Revenue cycle optimization' },
  ],
  'default': [
    { titles: ['Chief Executive Officer', 'Managing Director', 'President'], departments: ['C-Suite', 'Executive'], focus: 'Strategic direction and business growth' },
    { titles: ['Chief Technology Officer', 'VP of Technology', 'Head of IT'], departments: ['Technology', 'IT'], focus: 'Technology strategy and digital transformation' },
    { titles: ['Chief Financial Officer', 'VP of Finance', 'Head of Finance'], departments: ['Finance', 'CFO Office'], focus: 'Financial planning and cost optimization' },
    { titles: ['Chief Operating Officer', 'VP of Operations'], departments: ['Operations', 'COO Office'], focus: 'Operational efficiency and process improvement' },
    { titles: ['Head of Innovation', 'VP of Strategy', 'Director of Digital'], departments: ['Strategy', 'Innovation'], focus: 'Innovation and competitive positioning' },
  ],
}

const GEO_NAMES: Record<string, { first: string[]; last: string[] }> = {
  'Belgium': { first: ['Sophie', 'Jan', 'Marie', 'Thomas', 'Ingrid', 'Pieter', 'Eva', 'Wouter', 'An', 'Koen', 'Lieve', 'Marc', 'Dirk', 'Caroline', 'Filip'], last: ['Vandermeersch', 'De Smet', 'Claes', 'Leemans', 'Peeters', 'Maes', 'Willems', 'De Cock', 'Mertens', 'Janssens', 'Dubois', 'Fontaine', 'Lambert', 'Goossens', 'Wouters'] },
  'Netherlands': { first: ['Willem', 'Lotte', 'Daan', 'Sophie', 'Thomas', 'Emma', 'Niels', 'Femke', 'Bart', 'Marieke'], last: ['van den Berg', 'de Jong', 'Visser', 'Bakker', 'Smit', 'de Boer', 'Mulder', 'Jansen', 'van Dijk', 'Bos'] },
  'United Kingdom': { first: ['James', 'Sarah', 'David', 'Emily', 'Richard', 'Catherine', 'Mark', 'Rebecca', 'Andrew', 'Victoria'], last: ['Thompson', 'Williams', 'Davies', 'Taylor', 'Brown', 'Wilson', 'Evans', 'Walker', 'Roberts', 'Clarke'] },
  'Germany': { first: ['Stefan', 'Anna', 'Markus', 'Petra', 'Thomas', 'Sabine', 'Michael', 'Julia', 'Andreas', 'Katrin'], last: ['M\u00fcller', 'Schmidt', 'Schneider', 'Fischer', 'Weber', 'Becker', 'Wagner', 'Hoffmann', 'Koch', 'Bauer'] },
  'France': { first: ['Pierre', 'Marie', 'Jean', 'Isabelle', 'Laurent', 'Catherine', 'Philippe', 'Nathalie', 'Antoine', 'Sophie'], last: ['Dubois', 'Martin', 'Bernard', 'Durand', 'Leroy', 'Moreau', 'Simon', 'Laurent', 'Lefebvre', 'Roux'] },
  'United States': { first: ['Michael', 'Jennifer', 'David', 'Sarah', 'Robert', 'Lisa', 'James', 'Emily', 'William', 'Amanda'], last: ['Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Davis', 'Miller', 'Wilson', 'Moore', 'Taylor'] },
  'Sweden': { first: ['Erik', 'Anna', 'Magnus', 'Linda', 'Johan', 'Sara', 'Anders', 'Marie', 'Fredrik', 'Karin'], last: ['Andersson', 'Johansson', 'Karlsson', 'Nilsson', 'Eriksson', 'Larsson', 'Olsson', 'Persson', 'Svensson', 'Gustafsson'] },
  'default': { first: ['Alex', 'Jordan', 'Casey', 'Morgan', 'Riley', 'Taylor', 'Quinn', 'Avery', 'Sage', 'Reese'], last: ['Anderson', 'Chen', 'Patel', 'Kim', 'Martinez', 'Okafor', 'Singh', 'Nakamura', 'Larsen', 'Dubois'] },
}

function pickRandom<T>(arr: T[], count: number): T[] {
  const result: T[] = []
  const available = [...arr]
  for (let i = 0; i < Math.min(count, available.length); i++) {
    const idx = Math.floor(Math.random() * available.length)
    result.push(available[idx])
    available.splice(idx, 1)
  }
  return result
}

export function generateAccountContacts(context: AccountContext): Contact[] {
  const { companyName, industry, geography } = context

  const industryKey = Object.keys(INDUSTRY_CONTACTS).find(k =>
    industry.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(industry.toLowerCase())
  ) || 'default'
  const contactTemplates = INDUSTRY_CONTACTS[industryKey] || INDUSTRY_CONTACTS['default']

  const geoKey = Object.keys(GEO_NAMES).find(k =>
    geography.toLowerCase().includes(k.toLowerCase()) || k.toLowerCase().includes(geography.toLowerCase())
  ) || 'default'
  const names = GEO_NAMES[geoKey] || GEO_NAMES['default']

  const numContacts = Math.min(contactTemplates.length, 5 + Math.floor(Math.random() * 3))
  const selectedTemplates = contactTemplates.slice(0, numContacts)

  const usedFirsts = new Set<string>()
  const contacts: Contact[] = selectedTemplates.map((template, i) => {
    let firstName = ''
    const availableFirsts = names.first.filter(n => !usedFirsts.has(n))
    if (availableFirsts.length > 0) {
      firstName = availableFirsts[Math.floor(Math.random() * availableFirsts.length)]
    } else {
      firstName = names.first[Math.floor(Math.random() * names.first.length)]
    }
    usedFirsts.add(firstName)
    const lastName = names.last[Math.floor(Math.random() * names.last.length)]

    const title = template.titles[Math.floor(Math.random() * template.titles.length)]
    const confidence: ContactConfidence = i < 3 ? 'high' : (i < 5 ? 'medium' : 'low')
    const slug = `${firstName.toLowerCase()}-${lastName.toLowerCase().replace(/\s+/g, '-')}`

    return {
      id: `c-${Date.now()}-${i}`,
      playbook_id: '',
      name: `${firstName} ${lastName}`,
      title,
      linkedin_url: `https://linkedin.com/in/${slug}`,
      confidence,
      source: i < 3 ? 'LinkedIn + Web' : (i < 5 ? 'LinkedIn' : 'Web inference'),
      verification_status: 'pending' as ContactVerificationStatus,
      notes: `${template.focus} at ${companyName}`,
      created_at: new Date().toISOString(),
    }
  })

  return contacts
}

export interface GeneratedSection {
  id: string
  playbook_id: string
  title: string
  type: string
  content: string
  order: number
  created_at: string
}

function culturalNote(geography: string): string {
  if (geography.toLowerCase().includes('belgium')) {
    return 'Belgian business culture values consensus and relationship-building. Expect multilingual communication (Dutch/French/English). Decision-making is collaborative. Formal titles are important.'
  }
  if (geography.toLowerCase().includes('netherlands')) {
    return 'Dutch business culture is direct and pragmatic. Flat hierarchies with accessible leadership. Value efficiency. English widely spoken.'
  }
  if (geography.toLowerCase().includes('germany')) {
    return 'German business culture values thoroughness and precision. Expect detailed documentation. Decision-making is methodical. Punctuality is essential.'
  }
  return 'Adapt communication style to local business norms. Research cultural preferences. Consider language preferences.'
}

export function generatePlaybookSections(context: AccountContext): GeneratedSection[] {
  const { companyName, industry, geography } = context
  const cultureNote = culturalNote(geography)

  const sections: GeneratedSection[] = [
    {
      id: 'sec-1', playbook_id: '', title: 'Executive Summary', type: 'executive_summary',
      content: `## Strategic Opportunity: ${companyName}\n\nThis playbook outlines a targeted approach for engaging ${companyName}, a key player in ${industry.toLowerCase()}. Our analysis reveals multiple high-priority entry points based on recent strategic initiatives, technology signals, and organizational changes.\n\n**Key Insight:** ${companyName} has publicly committed to digital transformation, creating a window of opportunity for engagement.\n\n**Recommended Approach:** Multi-threaded engagement targeting both business and technology stakeholders, with initial outreach focused on the Chief Digital Officer and VP of Technology.`,
      order: 1, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-2', playbook_id: '', title: 'Account Intelligence', type: 'account_intel',
      content: `## ${companyName} — Account Intelligence\n\n### Company Overview\n${companyName} operates in the ${industry.toLowerCase()} sector with significant technology spend and ongoing transformation initiatives.\n\n### Recent Strategic Signals\n- **Digital Transformation:** Public commitment to modernizing core systems\n- **Technology Investment:** Active hiring for senior technology roles\n- **Market Position:** Expanding digital capabilities to maintain competitive edge\n- **Regulatory Environment:** Increased compliance requirements creating urgency\n\n### Pain Points Confirmed\n1. Manual processes creating operational bottlenecks\n2. Compliance reporting consuming excessive resources\n3. Integration challenges between disparate systems\n4. Need for real-time analytics and decision support`,
      order: 2, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-3', playbook_id: '', title: 'Buying Committee Analysis', type: 'buying_committee',
      content: `## Buying Committee — ${companyName}\n\n### Key Roles\n\n| Role | Influence | Priority | Approach |\n|------|-----------|----------|----------|\n| Economic Buyer | Budget authority | Critical | ROI-first messaging |\n| Technical Buyer | Solution validation | High | Technical depth + integration |\n| Champion | Internal advocacy | Critical | Arm with ammunition |\n| End User | Day-to-day value | Medium | Ease-of-use proof points |\n\n### Engagement Strategy\n- Start with Champion (easiest access point)\n- Build business case for Economic Buyer\n- Provide technical proof for Technical Buyer\n- Demonstrate workflow improvements for End Users`,
      order: 3, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-4', playbook_id: '', title: 'Why Now — Timing Analysis', type: 'why_now',
      content: `## Why ${companyName} — Why NOW\n\n### Urgency Drivers\n\n1. **Regulatory Pressure:** New compliance requirements creating hard deadlines\n2. **Competitive Pressure:** Peer institutions accelerating digital transformation\n3. **Technology Inflection:** Legacy systems reaching end-of-life\n4. **Organizational Readiness:** New leadership hires signal appetite for change\n5. **Market Timing:** Industry cycle creates favorable conditions for investment\n\n### Recommended Timeline\n- **Week 1-2:** Initial outreach to champion\n- **Week 3-4:** Multi-threaded engagement\n- **Month 2:** Executive briefing and demo\n- **Month 3:** Proof of concept proposal`,
      order: 4, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-5', playbook_id: '', title: 'Outreach Strategy & Messaging', type: 'outreach',
      content: `## Outreach Strategy — ${companyName}\n\n### Channel Mix\n- **LinkedIn:** Primary channel for initial contact\n- **Email:** Follow-up with personalized value proposition\n- **Industry Events:** Target speaking engagements\n- **Warm Introductions:** Leverage board advisor network\n\n### DO:\n- Reference specific public statements about their strategy\n- Mention peer successes in the same market\n- Lead with data-backed outcomes\n- Acknowledge regulatory context specific to their geography\n\n### DON'T:\n- Use generic messaging\n- Assume familiarity with your product category\n- Ignore existing vendor relationships\n- Overlook cultural communication preferences`,
      order: 5, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-6', playbook_id: '', title: 'Competitive Landscape', type: 'competitive',
      content: `## Competitive Landscape — ${companyName}\n\n### Incumbent Solutions\n\n| Vendor | Product | Strength | Weakness | Our Angle |\n|--------|---------|----------|----------|------------|\n| Legacy Core | Existing platform | Institutional knowledge | Manual processes, poor UX | Automation + modern UX |\n| Point Solution | Niche tool | Specific feature depth | No integration, siloed data | Unified platform |\n| Consulting | Big 4 advisory | Strategic relationships | High cost, no product | Self-serve + lower TCO |\n\n### Our Competitive Advantages\n1. **Integration Breadth:** Connects with their existing stack\n2. **Speed to Value:** Weeks not months\n3. **Regulatory Compliance:** Pre-built compliance modules\n4. **Modern UX:** Consumer-grade interface\n5. **Total Cost of Ownership:** 40-60% lower vs. incumbents`,
      order: 6, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-7', playbook_id: '', title: 'Engagement Playbook', type: 'engagement',
      content: `## Engagement Playbook — ${companyName}\n\n### Phase 1: Awareness (Weeks 1-2)\n- LinkedIn engagement with champion's content\n- Share relevant industry insights\n- Connect with 3-5 stakeholders\n\n### Phase 2: Interest (Weeks 3-4)\n- Personalized email to champion with peer reference\n- Share relevant case study\n- Invite to webinar or industry event\n\n### Phase 3: Consideration (Month 2)\n- Executive briefing with economic buyer\n- Technical deep-dive with IT leadership\n- ROI calculator with their metrics\n- Customized demo\n\n### Phase 4: Decision (Month 3)\n- Proof of concept proposal\n- Reference call with peer customer\n- Commercial terms discussion\n\n### Success Metrics\n- Response rate target: >40%\n- Meeting conversion: >25%\n- Demo-to-proposal ratio: >60%\n- Target close: 90-120 days`,
      order: 7, created_at: new Date().toISOString(),
    },
    {
      id: 'sec-8', playbook_id: '', title: 'Cultural Context & Communication Guide', type: 'cultural',
      content: `## Cultural Context — ${geography}\n\n${cultureNote}\n\n### Meeting Preferences\n- Schedule 45-60 minute meetings with clear agendas\n- Send materials 24 hours in advance\n- Follow up with written summaries\n- Respect decision-making hierarchies\n\n### DO:\n- Build rapport before discussing business\n- Acknowledge their expertise and market position\n- Provide data-backed arguments\n- Follow up consistently but respectfully\n\n### DON'T:\n- Apply excessive pressure or urgency tactics\n- Disregard established processes and hierarchies\n- Underestimate the importance of stakeholder consensus\n- Ignore local regulatory requirements`,
      order: 8, created_at: new Date().toISOString(),
    },
  ]

  return sections
}