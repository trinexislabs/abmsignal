export interface PlaybookContext {
  playbookId: string
  productName: string
  productDescription: string
  valuePropositions: string[]
  targetCompany: string
  industry: string
  geography: string
  priorityTier: string
  productUrl?: string
  competitors?: string[]
  deploymentModel?: string
  dealSize?: string
  salesCycle?: string
}

export interface WritingContext extends PlaybookContext {
  approvedContacts: {
    name: string
    title: string
    company: string
    linkedin_url?: string
    confidence: string
    rationale?: string
  }[]
}

export function buildResearchPrompt(ctx: PlaybookContext): string {
  return [
    `# ABM PLAYBOOK RESEARCH — Phase 1`,
    ``,
    `## Your Task`,
    `Research the target account and identify key buying committee contacts.`,
    ``,
    `## CRITICAL RULES — READ CAREFULLY`,
    `- DO NOT call any external APIs or HTTP endpoints.`,
    `- DO NOT use curl, fetch, or any network tools to update application state.`,
    `- DO NOT write to any files or databases directly.`,
    `- Your ONLY output must be a single JSON block at the end of your response.`,
    `- The JSON must match the exact schema defined below.`,
    ``,
    `## Product`,
    `Name: ${ctx.productName}`,
    `URL: ${ctx.productUrl ?? 'N/A'}`,
    `Description: ${ctx.productDescription}`,
    `Value Propositions:`,
    ...ctx.valuePropositions.map(v => `  - ${v}`),
    `Competitors: ${ctx.competitors?.join(', ') ?? 'N/A'}`,
    `Deployment: ${ctx.deploymentModel ?? 'SaaS'}`,
    `Deal Size: ${ctx.dealSize ?? 'N/A'}`,
    `Sales Cycle: ${ctx.salesCycle ?? 'N/A'}`,
    ``,
    `## Target Account`,
    `Company: ${ctx.targetCompany}`,
    `Industry: ${ctx.industry}`,
    `Geography: ${ctx.geography}`,
    `Priority: ${ctx.priorityTier}`,
    ``,
    `## Research Instructions`,
    `1. Research ${ctx.targetCompany} thoroughly using web search and available sources.`,
    `2. Identify 5-8 key buying committee contacts relevant to ${ctx.productName}.`,
    `3. For each contact: find their name, title, LinkedIn URL, and why they matter.`,
    `4. Gather company intelligence: recent news, signals, technology stack, strategic priorities.`,
    `5. Compile source URLs for all factual claims.`,
    ``,
    `## Required Output Format`,
    `End your response with a JSON block using EXACTLY this schema:`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "phase": "research",`,
    `  "status": "contact_review",`,
    `  "progress_pct": 60,`,
    `  "agent_status": "Contacts ready for review",`,
    `  "contacts": [`,
    `    {`,
    `      "name": "Full Name",`,
    `      "title": "Job Title",`,
    `      "company": "${ctx.targetCompany}",`,
    `      "linkedin_url": "https://linkedin.com/in/...",`,
    `      "email": null,`,
    `      "rationale": "Why this person matters for the deal",`,
    `      "source_urls": ["https://..."],`,
    `      "confidence": "high"`,
    `    }`,
    `  ],`,
    `  "sources": [`,
    `    {`,
    `      "url": "https://...",`,
    `      "title": "Source Title",`,
    `      "publisher": "Publisher Name",`,
    `      "note": "What this source tells us",`,
    `      "confidence": "high"`,
    `    }`,
    `  ]`,
    `}`,
    `\`\`\``,
    ``,
    `All data must be real and specific to ${ctx.targetCompany}. No placeholder data.`,
  ].join('\n')
}

export function buildWritingPrompt(ctx: WritingContext): string {
  const contactsSummary = ctx.approvedContacts
    .map(c => `- ${c.name} (${c.title}) — ${c.rationale ?? 'Key decision maker'}`)
    .join('\n')

  return [
    `# ABM PLAYBOOK WRITING — Phase 2`,
    ``,
    `## Your Task`,
    `Write all 12 sections of a hyper-personalized ABM playbook for ${ctx.targetCompany}.`,
    ``,
    `## CRITICAL RULES — READ CAREFULLY`,
    `- DO NOT call any external APIs or HTTP endpoints.`,
    `- DO NOT use curl, fetch, or any network tools to update application state.`,
    `- DO NOT write to any files or databases directly.`,
    `- Your ONLY output must be a single JSON block at the end of your response.`,
    `- The JSON must match the exact schema defined below.`,
    ``,
    `## Context`,
    `### Product: ${ctx.productName}`,
    `Description: ${ctx.productDescription}`,
    `Value Props: ${ctx.valuePropositions.join('; ')}`,
    `Competitors: ${ctx.competitors?.join(', ') ?? 'N/A'}`,
    ``,
    `### Target Account: ${ctx.targetCompany}`,
    `Industry: ${ctx.industry} | Geography: ${ctx.geography} | Priority: ${ctx.priorityTier}`,
    ``,
    `### Approved Contacts`,
    contactsSummary,
    ``,
    `## Section Keys (must include all 12)`,
    `1. executive_summary`,
    `2. account_intelligence`,
    `3. buying_committee`,
    `4. why_now`,
    `5. competitive_landscape`,
    `6. cultural_context`,
    `7. outreach_strategy`,
    `8. personalized_sequences`,
    `9. battle_cards`,
    `10. content_strategy`,
    `11. measurement_framework`,
    `12. appendix`,
    ``,
    `## Writing Instructions`,
    `- Every section must be specific to ${ctx.targetCompany}, NOT generic.`,
    `- Reference the approved contacts in personalized outreach sections.`,
    `- Use markdown formatting within content_markdown fields.`,
    `- For each claim, include a (source: URL) citation inline where possible.`,
    `- Cultural context must match ${ctx.geography} norms.`,
    `- Personalized sequences must reference specific account signals and contact details.`,
    ``,
    `## Required Output Format`,
    `End your response with a JSON block using EXACTLY this schema:`,
    ``,
    `\`\`\`json`,
    `{`,
    `  "phase": "writing",`,
    `  "status": "complete",`,
    `  "progress_pct": 100,`,
    `  "agent_status": "Playbook complete",`,
    `  "sections": [`,
    `    {`,
    `      "section_key": "executive_summary",`,
    `      "title": "Executive Summary",`,
    `      "content_markdown": "## Overview\\n\\n...",`,
    `      "order_index": 1,`,
    `      "sources": [`,
    `        {`,
    `          "url": "https://...",`,
    `          "title": "Source",`,
    `          "publisher": "Publisher",`,
    `          "claim": "The specific claim this supports",`,
    `          "confidence": "high"`,
    `        }`,
    `      ]`,
    `    }`,
    `  ]`,
    `}`,
    `\`\`\``,
    ``,
    `All 12 sections must be present. Content must be specific to ${ctx.targetCompany}.`,
  ].join('\n')
}
