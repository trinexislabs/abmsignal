# ABM Playbook Engine — Product Requirements Document

**Product:** ABM Playbook Engine (working name)  
**Company:** Trinexis Labs  
**Author:** Spark, Director of Operations  
**Date:** 2026-05-13  
**Version:** 1.1  
**Status:** Draft — updated with agent swarm architecture, generic ABM framework, AWS deployment model  

---

## First Principles View

### What people assume about ABM playbooks:
1. "ABM playbooks are just cold email templates with company names swapped in" — **False.** The SME review proved this is the #1 failure mode. Real ABM requires person-level personalization, not account-level mail merge.
2. "AI can just generate a playbook from a prompt" — **False.** Our experience shows 80% of the value is in the research (contact verification, signal analysis, cultural context), not the writing.
3. "One playbook fits all geographies" — **False.** Belgian banking ≠ American SaaS. Cultural adaptation is non-negotiable.
4. "The output is a document" — **False.** The output is a launch-ready campaign. Documents without verified contacts, content assets, and cultural context are worthless.
5. "Human review is optional" — **False.** Our SME review caught 5 critical errors that would have killed the campaign. Human-in-the-loop is a feature, not a cost.

### What's fundamentally true:
- ABM playbooks require **deep, iterative research** — not a single-pass generation
- Contact verification is the **highest-risk, highest-value** step — wrong contact = dead campaign
- Every bank/industry/geography has **cultural rules** that must be learned, not assumed
- The playbook is only as good as its **weakest section** — a great dossier with wrong contacts is still garbage
- **Research → Draft → Review → Correct** is the only reliable loop

### EL12 Explanation:
Imagine you're trying to write a really personal letter to someone you've never met at a company you don't know well. You can't just swap their name into a template — they'll know instantly. You have to: (1) learn about their company, (2) find the right person to write to, (3) understand what they care about, (4) figure out what's happening at their company right now that makes your product relevant, (5) write something that shows you did all that homework, and (6) make sure you didn't accidentally offend them by getting their job title wrong or bringing up something embarrassing. That's what this product does — it does all that homework automatically, then writes the letters.

---

## 1. Product Overview

### 1.1 Vision
ABM Playbook Engine is an AI-powered SaaS platform that generates production-ready, hyper-personalized Account-Based Marketing playbooks for B2B enterprise sales teams. Input your product and target account, get a launch-ready ABM campaign with verified contacts, culturally-adapted outreach, and a complete execution checklist.

### 1.2 Problem Statement
- Building a proper ABM playbook takes 40-80 hours of research per target account
- Most "ABM" playbooks are actually cold sales templates with company names swapped
- Contact verification is manual, error-prone, and often skipped entirely
- Cultural context (Belgian banking vs. American SaaS vs. APAC enterprise) is ignored
- No existing tool combines research depth + contact verification + cultural adaptation + quality assurance in one flow

### 1.3 Target Customers
| Segment | Description | Pain | Will Pay Because |
|---------|-------------|------|-----------------|
| **B2B SaaS companies** selling to banks/fintech | 10-500 employees, $1M-50M ARR | Sales teams lack bandwidth for deep account research; outreach conversion is <5% | One closed deal from a better playbook pays for the entire year |
| **AI/ML companies** selling to enterprise | 10-200 employees | Technical founders struggle with sales; generic outreach kills credibility | First impression with a bank is make-or-break; they can't afford to get it wrong |
| **Sales consultancies & agencies** | 5-50 employees | Manually building playbooks is their biggest time sink | Can serve 5x more clients with AI-generated playbooks |
| **Enterprise sales teams** at large companies | 500+ employees | ABM for strategic accounts is slow and expensive | Reduce cost-per-playbook from $15K+ (consultant) to $500-2K (platform) |

### 1.4 Unique Value Proposition
**"The only ABM tool that knows the difference between Head of Payments and Head of Payment OPS."**

We learned the hard way — through real SME feedback on real bank playbooks — that contact accuracy, cultural fit, and ABM-quality personalization are the difference between a playbook that books meetings and one that gets you blocked. Our engine encodes these lessons into every run.

---

## 2. Product Design

### 2.1 User Flow (Primary)

```
Step 1: Product Brief
  → URL input (product page) OR structured form
  → AI scrapes + extracts: positioning, value props, differentiators, target personas
  
Step 2: Target Account
  → URL input (company page) OR company name + industry
  → AI researches: financials, technology stack, regulatory status, strategic initiatives
  
Step 3: Contact Discovery
  → AI finds + verifies buying committee contacts
  → User reviews: confirm, correct, or add contacts
  → ⚠️ MANDATORY HUMAN CHECKPOINT — contacts are the highest-risk element
  
Step 4: Research Deep Dive
  → AI runs iterative research loops:
    - "Why Now" signal analysis
    - Competitive landscape at target account
    - Cultural/regulatory context
    - Technology displacement analysis
  → Progress bar + section-by-section delivery
  
Step 5: Playbook Generation
  → AI generates full ABM playbook:
    - Account intelligence dossier
    - Buying committee + org map
    - Hyper-personalized outreach sequences
    - Battle cards + objection handling
    - Content asset strategy
    - Measurement framework
    - Cultural adaptation notes
  → Delivered section-by-section (not all at once)
  
Step 6: Quality Review
  → Self-review checklist (16 items) auto-validated
  → Optional: Human SME review (in-app or export)
  → Revision loop: feedback → targeted re-generation → updated playbook
  
Step 7: Export & Launch
  → PDF download
  → CRM sync (HubSpot, Salesforce)
  → Email sequence export (ready to load into outreach tool)
  → Content asset creation briefs (for marketing team)
```

### 2.2 Key Screens

#### Screen 1: Dashboard
- Active playbooks (in-progress, completed)
- Quick-start: "New Playbook" button
- Templates by industry (Banking, Fintech, Healthcare, Manufacturing, etc.)
- Usage stats (playbooks generated, contacts verified, etc.)

#### Screen 2: Product Brief Input
- Two modes: **URL mode** (paste product page, AI scrapes) or **Form mode** (structured input)
- Form mode fields:
  - Product name
  - One-line description
  - 3-5 value propositions
  - Target personas (select from presets + custom)
  - Key differentiators
  - Competitors you know about
  - Deployment model (SaaS, on-prem, hybrid)
  - Typical deal size
  - Sales cycle length
- AI auto-fills from URL, user confirms/edits

#### Screen 3: Target Account Input
- Company name + URL
- Industry/vertical selector
- Geography selector (drives cultural adaptation)
- Priority level (Tier 1 = full depth, Tier 2 = lighter version)
- Any known contacts (optional — user can seed the process)

#### Screen 4: Research Progress
- Real-time progress with section-by-section status:
  - 🔄 Account Intelligence — researching...
  - ✅ "Why Now" Signals — 4 signals found
  - ⏳ Contact Discovery — searching LinkedIn...
  - ⏳ Cultural Context — pending
  - ⏳ Competitive Landscape — pending
- Expand any completed section to preview
- User can add notes/context at any point

#### Screen 5: Contact Verification Gate
- **THE CRITICAL CHECKPOINT**
- AI presents discovered contacts with:
  - Name, title, LinkedIn URL
  - Confidence score (high/medium/low)
  - Source (LinkedIn, The Org, Craft.co, etc.)
  - Verification status: ✅ verified, 🟡 needs review, ❌ outdated
- User can:
  - Confirm ✅
  - Edit title/name
  - Remove
  - Add missing contacts manually
- **Playbook CANNOT proceed to email generation until all contacts are reviewed**
- Rationale: Wrong contact = dead campaign. This gate prevents the #1 failure mode.

#### Screen 6: Playbook Preview
- Full playbook rendered in-app
- Section navigation sidebar
- Each section expandable/collapsible
- Inline editing capability
- "Export PDF" button
- "Export to CRM" button
- "Generate Email Sequence" button (creates importable CSV for outreach tools)

#### Screen 7: Quality Review
- Self-review checklist results (16 items)
- Red/yellow/green indicators
- "Request Human Review" button (if on plan that includes it)
- "Download for External Review" button
- Feedback input: paste SME feedback, AI maps to affected sections and re-generates

### 2.3 Agent Swarm Architecture

The engine is NOT a monolithic pipeline. It's a **multi-agent system** — replicating how a real ABM team operates, with specialized agents that have distinct roles, tools, and skills.

#### Agent Roster

| Agent | Role | Model | Analogy | Key Skills |
|-------|------|-------|---------|------------|
| **Orchestrator** | Decomposes requests, routes tasks, manages state, enforces gates, assembles final output | GPT-4o / Claude | Spark (Director) | Task decomposition, state management, quality gates, playbook assembly |
| **Researcher** | Deep account + contact research, signal detection, cultural context gathering | GPT-4o / Claude | Rexi (Research Lead) | UDR (Universal Deep Research), web scraping, search, source verification |
| **Writer** | Hyper-personalized outreach sequences, cultural tone adaptation, battle cards, objection handling | GPT-4o / Claude | Echo (Outreach Lead) | ABM writing frameworks, cultural adaptation templates, tone/style transfer |
| **Reviewer** | 16-point quality checklist, cross-validation, contradiction detection, accuracy scoring | GPT-4o-mini / local | Atlas (Quality Lead) | Quality rubrics, consistency checks, fact verification |

#### How Agents Collaborate

```
┌─────────────────────────────────────────────────────────┐
│                    SaaS Frontend                         │
│          (Next.js — user submits product + account)      │
└────────────────────────┬────────────────────────────────┘
                         │ API call
                         ▼
┌─────────────────────────────────────────────────────────┐
│              Orchestrator Agent (Director)               │
│                                                           │
│  1. Receives user input (product brief + target account)  │
│  2. Decomposes into research tasks                        │
│  3. Dispatches to specialized agents                      │
│  4. Manages state + enforces human gates                   │
│  5. Assembles final playbook from agent outputs            │
│  6. Routes to Reviewer for quality check                  │
│  7. Delivers to user                                       │
└───────┬─────────────┬──────────────┬──────────────────────┘
        │             │              │
        ▼             ▼              ▼
┌──────────┐  ┌──────────┐  ┌──────────┐
│Researcher│  │  Writer  │  │ Reviewer │
│          │  │          │  │          │
│ UDR skill│  │ ABM      │  │ 16-point │
│ Web      │  │ writing  │  │ checklist│
│ scrape   │  │ Cultural │  │ Fact     │
│ Search   │  │ adapt    │  │ verify   │
│ Verify   │  │ Tone     │  │ Score    │
└────┬─────┘  └────┬─────┘  └────┬─────┘
     │              │              │
     └──────────────┼──────────────┘
                    │
          Shared Knowledge Base
          ┌─────────────────────┐
          │ Cultural Rules DB   │
          │ Industry Templates  │
          │ Quality Rubrics     │
          │ Contact Sources      │
          └─────────────────────┘
```

#### Agent Flow (Playbook Generation)

```
1. USER INPUT
   → Product brief (URL or form) + Target account (URL or name)

2. ORCHESTRATOR: Decompose
   → Analyze product brief (extract value props, differentiators, personas)
   → Create research plan (what to research, in what order)
   → Assign tasks to Researcher

3. RESEARCHER: Deep Dive (iterative UDR loops)
   → Loop 1: Account intelligence (financials, tech stack, strategic initiatives)
   → Loop 2: Contact discovery (buying committee, titles, LinkedIn profiles)
   → Loop 3: "Why Now" signals (news, regulatory changes, leadership moves)
   → Loop 4: Cultural/regulatory context (geography + industry rules)
   → Loop 5: Competitive landscape (incumbent vendors, recent deals)
   → Each loop: search → extract → synthesize → verify

4. ⚠️ HUMAN GATE: Contact Verification
   → Orchestrator presents contacts to user
   → User confirms, corrects, or adds contacts
   → CANNOT proceed without human review

5. ORCHESTRATOR: Route to Writer
   → Pass all research + verified contacts to Writer
   → Include cultural rules from Knowledge Base

6. WRITER: Generate Playbook Sections
   → Account intelligence dossier
   → Buying committee + org map
   → Hyper-personalized outreach sequences (per persona)
   → Battle cards + objection handling
   → Content asset strategy
   → Measurement framework
   → Cultural adaptation notes

7. REVIEWER: Quality Gate
   → Run 16-point checklist
   → Score each section
   → Flag contradictions, inaccuracies, weak sections
   → If fail → route flagged sections back to Writer for revision

8. ORCHESTRATOR: Final Assembly
   → Compile all sections into structured playbook
   → Apply formatting + branding
   → Generate PDF
   → Deliver to user via SaaS frontend
```

#### Why Agent Swarm (Not Monolith)

1. **Specialization** — Each agent has its own system prompt, tools, and context window. A researcher thinks differently than a writer.
2. **Parallelism** — Researcher can run multiple UDR loops concurrently. Writer can generate sections in parallel after research completes.
3. **Quality** — Separate Reviewer agent prevents the writer from grading their own homework.
4. **Extensibility** — New agents can be added (e.g., a Contact Verification agent, a CRM Sync agent) without rewriting the whole system.
5. **Cost** — Use expensive models (GPT-4o, Claude) only for research and writing. Use cheap models (GPT-4o-mini, local) for classification, extraction, and review.
6. **Observability** — Each agent's output is inspectable. You can see exactly where a playbook went wrong.

#### Agent Skills & Tools

| Agent | Skills | Tools |
|-------|--------|-------|
| **Orchestrator** | Task decomposition, state management, quality gate enforcement, playbook assembly | State DB, job queue |
| **Researcher** | UDR (Universal Deep Research) — iterative search-extract-synthesize loops | Web scraping (CDP), search APIs (Bing, Tavily), LinkedIn/The Org/Craft.co extraction, PDF parsing |
| **Writer** | ABM Playbook Framework (generic, industry-adaptive), Cultural Adaptation Templates, Outreach Sequence Templates | Playbook template engine, cultural rules DB, tone/style guides |
| **Reviewer** | Quality Checklist (16-point rubric), Fact Verification, Consistency Scoring | Checklist engine, cross-reference validator |

### 2.4 Data Sources (Ranked by Priority)

| Source | Purpose | Access Method |
|--------|---------|---------------|
| **Product website** | Positioning, value props | Web scraping (browser-harness) |
| **Wikipedia** | Company overview, financials | Public API |
| **LinkedIn** | Contact discovery, career history | LinkedIn API or scraping (compliance TBD) |
| **The Org** | Org charts, reporting lines | Web scraping |
| **Craft.co** | Company data, funding | Web scraping |
| **Bing/DuckDuckGo** | News, regulatory events, press releases | Search API |
| **Annual reports** | Financial data, strategic direction | PDF download + extraction |
| **ECB/regulatory databases** | Banking-specific: sanctions, supervisory status | Public APIs |
| **Industry databases** | SWIFT participation, ISO 20022 status | Public data |
| **User-provided CRM data** | Known contacts, existing relationships | API integration |

### 2.5 Cultural Knowledge Base

The engine maintains a **Cultural Adaptation Database** that encodes rules by geography + industry:

| Geography | Rules Stored |
|-----------|-------------|
| Western Europe (BE, NL, DE, FR) | Formal address, in-person meetings, value-first CTAs, summer pause, GDPR |
| Nordics (SE, NO, DK, FI) | Direct but polite, first-name OK, efficiency-valued |
| UK | Professional, coffee meeting culture |
| North America (US, CA) | Direct, urgency OK, virtual first |
| APAC (SG, JP, HK, AU) | Formal, title + surname, relationship before business |
| MENA (AE, SA) | Formal, honorific, warm intros essential |

| Industry | Rules Stored |
|----------|-------------|
| Banking/Financial Services | Regulatory sensitivity, compliance-first messaging, ECB/Fed/OCC context |
| Healthcare | HIPAA awareness, clinical vs. administrative personas |
| Manufacturing | Operations-first, ROI-focused, plant-level contacts |
| Technology | Technical depth OK, faster pace, reference architectures |

**This is a moat.** Every playbook run + SME feedback loop improves the cultural database. The more playbooks generated, the better the engine gets.

### 2.6 Generic ABM Playbook Framework

The ABM Playbook Engine does NOT use a bank-specific or industry-specific template. Instead, it uses a **generic ABM framework** that dynamically adapts based on the user's product and target account inputs.

#### How It Works

When a user provides their **product brief** and **target account**, the engine:

1. **Analyzes the product** — extracts value propositions, differentiators, target personas, deployment model, deal size, sales cycle length
2. **Analyzes the target account** — identifies industry, geography, size, regulatory environment, technology stack, strategic priorities
3. **Selects + adapts the framework** — the generic structure remains constant, but each section's depth, tone, and content is driven by the specific inputs
4. **Loads cultural rules** — geography + industry rules from the Cultural Knowledge Base
5. **Generates** — each section of the playbook is written from scratch based on research, not filled into a template

#### Generic Playbook Structure (Always Present)

| # | Section | Purpose | Dynamically Adapted By |
|---|---------|---------|----------------------|
| 1 | Executive Summary | 1-page overview: why this account, why now, what we offer | Product positioning + account signals |
| 2 | Account Intelligence Dossier | Company overview, financials, strategic initiatives, tech stack | Account research (UDR loops 1-2) |
| 3 | Buying Committee & Org Map | Key decision-makers, influencers, champions, their roles & pain points | Contact discovery (UDR loop 3) + product personas |
| 4 | "Why Now" Signal Analysis | Timing triggers: news, regulatory changes, leadership moves, funding, M&A | Signal research (UDR loop 3) |
| 5 | Competitive Landscape | Incumbent vendors, recent deals, displacement opportunities | Competitive research (UDR loop 5) |
| 6 | Cultural & Regulatory Context | How to communicate in this geography/industry | Cultural KB + geography + industry rules |
| 7 | Outreach Strategy | Channel selection, sequence timing, multi-touch plan | Product type + account geography + industry norms |
| 8 | Hyper-Personalized Sequences | Per-persona emails, LinkedIn messages, call scripts | Contact personas + research findings + cultural rules |
| 9 | Battle Cards & Objection Handling | Competitive positioning, common objections, responses | Competitor analysis + product differentiators |
| 10 | Content Asset Strategy | What content to create/send at each stage | Product type + buyer journey stage |
| 11 | Measurement Framework | KPIs, success criteria, tracking plan | Product type + sales cycle length |
| 12 | Appendix | Sources, data confidence scores, research methodology | All research sources with confidence ratings |

#### Dynamic Adaptation Examples

| Input Combination | Framework Adaptation |
|-----------------|---------------------|
| **SaaS product → US tech company** | Faster pace, direct outreach OK, virtual-first, technical depth, shorter sequences |
| **Compliance tool → EU bank** | Regulatory-first messaging, formal tone, in-person meeting strategy, longer sequences, GDPR-aware |
| **Manufacturing platform → Japanese conglomerate** | Formal honorifics, relationship-before-business, indirect approach, warm intro requirement |
| **HealthTech → US hospital system** | HIPAA-aware, clinical vs. admin personas, proof-of-concept emphasis, ROI-focused |
| **Fintech → Middle Eastern bank** | Formal, honorific-heavy, warm intros essential, Sharia compliance awareness |

#### Key Principle: Research-Driven, Not Template-Driven

The framework provides **structure** (12 sections, logical flow, quality checkpoints). But the **content** of every section is generated from research, not filled into blanks.

- ❌ NOT: "Dear [FIRST_NAME], I noticed [COMPANY] is..." (template)
- ✅ YES: Researcher discovers Belfius appointed a new CTO who previously scaled digital banking at ING → Writer crafts an email that references this specific leadership change and connects it to the product's value proposition

The framework is the skeleton. The agents put meat on the bones through research + writing + review loops.

#### Quality Checklist (16-Point)

Every playbook is validated against this checklist before delivery:

| # | Check | Category |
|---|-------|----------|
| 1 | All contacts have verified names, titles, and LinkedIn URLs | Accuracy |
| 2 | No generic outreach — every sequence references specific account signals | Personalization |
| 3 | "Why Now" signals are recent (within 90 days) and specific | Relevance |
| 4 | Cultural adaptation matches target geography + industry | Cultural Fit |
| 5 | Competitive landscape identifies actual incumbents, not generic competitors | Accuracy |
| 6 | Battle cards address real objections, not straw-man arguments | Quality |
| 7 | Every email has a clear CTA appropriate to the persona and stage | Effectiveness |
| 8 | Tone matches the target's industry norms (formal vs. casual) | Cultural Fit |
| 9 | No fabricated data — all claims are sourced or marked [UNVERIFIED] | Integrity |
| 10 | Buying committee covers all key roles (economic buyer, technical buyer, champion, end user) | Completeness |
| 11 | Measurement framework has realistic KPIs for the sales cycle length | Practicality |
| 12 | Content assets are actionable (not "create a whitepaper" but "create a whitepaper on [specific topic]") | Specificity |
| 13 | Org chart reflects current reporting structure (not outdated) | Accuracy |
| 14 | Outreach strategy accounts for the target's preferred communication channels | Cultural Fit |
| 15 | No internal inconsistencies between sections (e.g., org chart matches outreach personas) | Consistency |
| 16 | All sources cited with confidence scores | Transparency |

---

## 3. Pricing Model

### 3.1 Tier Structure

| Tier | Price | Playbooks/Month | Includes |
|------|-------|----------------|----------|
| **Starter** | $299/mo | 2 | Full playbook generation, PDF export, 1 user |
| **Growth** | $799/mo | 5 | + Contact verification, CRM sync, 3 users |
| **Professional** | $1,999/mo | 15 | + Human SME review, email sequence export, custom templates, 10 users |
| **Agency** | $4,999/mo | Unlimited | + White-label, API access, custom cultural rules, priority support, unlimited users |

### 3.2 Add-Ons

| Add-On | Price | Description |
|--------|-------|-------------|
| Extra playbook | $149/playbook | One-time, no subscription |
| Human SME review | $499/review | Expert reviews your playbook, provides written feedback |
| Custom industry pack | $999/one-time | We build cultural + regulatory rules for your specific industry |
| CRM integration pack | $199/mo | Salesforce, HubSpot, Outreach, Salesloft |

### 3.3 Revenue Projections (Conservative)

| Month | Starter | Growth | Pro | Agency | MRR |
|-------|---------|--------|-----|--------|-----|
| M1 | 5 | 2 | 1 | 0 | $5,485 |
| M3 | 15 | 5 | 2 | 0 | $12,470 |
| M6 | 30 | 10 | 5 | 1 | $28,430 |
| M12 | 60 | 20 | 10 | 3 | $57,360 |

**Target: $50K MRR within 12 months.**

---

## 4. Technical Architecture

### 4.1 Deployment Model: OpenClaw Agent Swarm on AWS

The backend is **not a traditional API server**. It's a cluster of OpenClaw agent instances running on AWS, each configured as a specialized ABM engine agent. The SaaS frontend calls the backend via API.

```
┌──────────────────────────────────────────────────────────┐
│                    AWS (EC2 / ECS)                        │
│                                                            │
│  ┌──────────────────────────────────────────────────────┐ │
│  │              OpenClaw Agent Cluster                    │ │
│  │                                                        │ │
│  │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │ │
│  │  │ Orchestrator  │  │  Researcher   │  │  Writer    │ │ │
│  │  │ (OpenClaw)    │  │  (OpenClaw)   │  │ (OpenClaw) │ │ │
│  │  │              │  │              │  │            │ │ │
│  │  │ Skills:       │  │ Skills:       │  │ Skills:    │ │ │
│  │  │ - task decomp │  │ - UDR         │  │ - ABM      │ │ │
│  │  │ - state mgmt  │  │ - web scrape  │  │ framework │ │ │
│  │  │ - assembly    │  │ - search      │  │ - cultural │ │ │
│  │  │              │  │ - verify      │  │ adapt      │ │ │
│  │  └──────┬───────┘  └──────┬───────┘  └─────┬──────┘ │ │
│  │         │                 │                │        │ │
│  │  ┌──────┴─────────────────┴────────────────┘        │ │
│  │  │              Shared State (Redis + PostgreSQL)    │ │
│  │  └──────────────────────────────────────────────────┘ │
│  │                                                        │ │
│  │  ┌──────────────┐                                     │ │
│  │  │  Reviewer     │                                     │ │
│  │  │  (OpenClaw)   │                                     │ │
│  │  │              │                                     │ │
│  │  │ Skills:       │                                     │ │
│  │  │ - quality    │                                     │ │
│  │  │   checklist  │                                     │ │
│  │  │ - fact verify│                                     │ │
│  │  └──────────────┘                                     │ │
│  └──────────────────────────────────────────────────────┘ │
│                                                            │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │  Supabase  │  │   Redis    │  │  S3 (R2)   │           │
│  │  (DB/Auth) │  │  (Queue)   │  │ (Storage)  │           │
│  └────────────┘  └────────────┘  └────────────┘           │
└──────────────────────────────────────────────────────────┘
                         ▲
                         │ REST API / WebSocket
┌─────────────────────────┴────────────────────────────────┐
│                   SaaS Frontend (Next.js)                 │
│                   (Vercel or same AWS instance)            │
│                                                            │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐               │
│  │ Dashboard │  │ Playbook │  │ Billing  │               │
│  │           │  │ Builder  │  │ (Stripe) │               │
│  └──────────┘  └──────────┘  └──────────┘               │
└────────────────────────────────────────────────────────────┘
```

### 4.2 Why OpenClaw as Backend

| Advantage | Explanation |
|-----------|-------------|
| **Agent-native** | OpenClaw is built for multi-agent orchestration. Each ABM agent is an OpenClaw instance with custom SOUL.md, skills, and tools. |
| **Skills system** | UDR, web scraping, search — these are OpenClaw skills. No need to build research infrastructure from scratch. |
| **State management** | OpenClaw handles agent state, context, and session management natively. |
| **Human gates** | OpenClaw's session model supports pausing for human input (contact verification). |
| **Inter-agent communication** | Agents can message each other via OpenClaw's built-in channels. |
| **Scalable** | Each agent type can scale independently — more Researcher instances during peak, fewer Reviewers. |
| **Observable** | Every agent decision is logged. You can trace exactly what each agent did. |
| **Cost-flexible** | Route research/writing to expensive models (GPT-4o, Claude). Route review/classification to cheap models (GPT-4o-mini, local Qwen). |

### 4.3 Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| **Agent Runtime** | OpenClaw (Node.js) | Agent orchestration, skills, tools, inter-agent messaging |
| **Frontend** | Next.js + TypeScript + Tailwind | Trinexis team expertise; SSR for SEO; fast iteration |
| **Database** | Supabase (PostgreSQL) | Fast setup, real-time subscriptions, auth built-in |
| **Job Queue** | BullMQ + Redis | Long-running playbook generation jobs (30-120 min) |
| **LLM — Research/Writing** | OpenAI GPT-4o / Claude | Highest quality for research depth and writing quality |
| **LLM — Review/Classification** | GPT-4o-mini / local models | Cost-effective for routine tasks |
| **Web Scraping** | Browser-harness (CDP) | Already built as OpenClaw skill; handles JS-rendered pages |
| **Research** | UDR skill (OpenClaw) | Iterative search-extract-synthesize loops |
| **Search APIs** | Bing Search API + Tavily | Research queries |
| **Contact Data** | LinkedIn + The Org + Craft.co | Multi-source verification |
| **PDF Generation** | Puppeteer + custom CSS | High-quality output |
| **Auth** | Supabase Auth (magic link + OAuth) | Simple, secure |
| **Payments** | Stripe | Industry standard, subscription management |
| **Hosting** | AWS EC2 (agents) + Vercel (frontend) | Agents need persistent compute; frontend is serverless |
| **Storage** | S3 (R2) | Playbook PDFs, generated assets |

### 4.4 Agent Configuration

Each agent is an OpenClaw instance with:

- **SOUL.md** — defines the agent's role, personality, and decision framework
- **Skills** — UDR for Researcher, ABM Framework for Writer, Quality Checklist for Reviewer
- **Tools** — web scraping, search APIs, PDF generation (assigned per agent role)
- **Model routing** — which LLM to use for which tasks
- **Context limits** — how much history to retain per session

Example: Researcher agent SOUL.md excerpt:
```yaml
# SOUL.md — ABM Researcher Agent
You are the Research Agent for an ABM Playbook Engine.
Your job is to find, verify, and synthesize information about target accounts.
You use the UDR (Universal Deep Research) skill for iterative research.
You never fabricate data — if you can't verify it, flag it with [UNVERIFIED].
You run 3-5 research loops per account, going deeper each time.
You pass structured research findings to the Orchestrator for assembly.
```

Example: Writer agent SOUL.md excerpt:
```yaml
# SOUL.md — ABM Writer Agent
You are the Outreach Writer for an ABM Playbook Engine.
Your job is to craft hyper-personalized outreach sequences.
You receive structured research from the Researcher and cultural rules from the Knowledge Base.
You adapt tone, formality, and approach based on geography + industry.
You write for specific personas (C-suite, VP, Director) — never generic.
Every email must demonstrate research depth. No "I came across your company" openers.
```

### 4.5 API Design (Frontend ↔ Backend)

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/playbooks` | POST | Create new playbook (product + account input) |
| `/api/playbooks/:id` | GET | Get playbook status + content |
| `/api/playbooks/:id/review-contacts` | POST | Submit contact review (human gate) |
| `/api/playbooks/:id/feedback` | POST | Submit SME feedback for revision |
| `/api/playbooks/:id/export` | GET | Download PDF |
| `/api/playbooks/:id/sections/:section` | GET | Get individual section (for progress) |
| `/api/products/brief` | POST | Submit product brief (URL or form) |
| `/api/products/brief` | GET | Get parsed product brief |

WebSocket events for real-time progress:
- `playbook:started` — generation begun
- `playbook:section:complete` — individual section done
- `playbook:contacts:ready` — contacts ready for review (human gate)
- `playbook:review:complete` — quality check done
- `playbook:complete` — playbook ready for download

### 4.6 Data Sources (Ranked by Priority)

| Source | Purpose | Access Method |
|--------|---------|---------------|
| **Product website** | Positioning, value props | Web scraping (browser-harness) |
| **Target company website** | About, leadership, press releases | Web scraping |
| **Wikipedia** | Company overview, financials | Public API |
| **LinkedIn** | Contact discovery, career history | LinkedIn API or scraping (compliance TBD) |
| **The Org** | Org charts, reporting lines | Web scraping |
| **Craft.co** | Company data, funding | Web scraping |
| **Bing/Tavily** | News, regulatory events, press releases | Search API |
| **Annual reports** | Financial data, strategic direction | PDF download + extraction |
| **Industry databases** | Regulatory status, certifications | Public APIs + scraping |
| **User-provided CRM data** | Known contacts, existing relationships | API integration |

### 4.7 Key Technical Challenges

| Challenge | Solution |
|-----------|----------|
| **Long-running AI jobs** (30-120 min) | BullMQ job queue + worker processes; WebSocket updates to frontend |
| **LinkedIn TOS risk** | Start with user-provided contacts + public sources; LinkedIn Sales Navigator API for paid tiers; eventually proprietary contact DB |
| **LLM cost management** | GPT-4o for research + writing only; GPT-4o-mini for extraction/classification/review; cache common queries |
| **Contact accuracy** | Multi-source verification; confidence scoring; mandatory human gate before email generation |
| **Cultural knowledge scaling** | Start with what we know (banking, fintech, SaaS); expand by industry; user feedback improves rules |
| **Playbook consistency** | Template system + Reviewer agent's quality gate; 16-check self-review before delivery |
| **Agent coordination** | OpenClaw handles inter-agent messaging and state; Orchestrator manages task routing |
| **Horizontal scaling** | Each agent type scales independently; add more Researcher instances during peak demand |

---

## 5. MVP Scope (Phase 1 — 8 Weeks)

### 5.1 What's In

- [x] Product Brief input (URL + form mode)
- [x] Target Account input (URL + company name)
- [x] AI-powered Account Intelligence research
- [x] Contact discovery (single source: web scraping)
- [x] Contact verification gate (human reviews before proceeding)
- [x] "Why Now" signal analysis
- [x] Full ABM playbook generation (all 12 sections)
- [x] PDF export
- [x] Cultural adaptation (banking + Western Europe only for MVP)
- [x] Self-review quality gate (16 checks)
- [x] User auth (email/password)
- [x] Stripe billing (Starter + Growth tiers only)

### 5.2 What's NOT In (Phase 2+)

- CRM integrations (HubSpot, Salesforce)
- Email sequence export (CSV for outreach tools)
- Custom industry packs
- Agency/white-label tier
- LinkedIn API integration
- Multi-user workspaces
- Human SME review service
- Cultural database beyond banking/Western Europe

### 5.3 MVP Timeline

| Week | Deliverable |
|------|-------------|
| 1-2 | AWS setup: OpenClaw cluster (Orchestrator + Researcher agents); Product Brief + Account Input screens; scraping pipeline (browser-harness skill) |
| 3-4 | Researcher agent: UDR skill integration, account research loops, contact discovery; Contact Review Gate screen (human checkpoint) |
| 5-6 | Writer agent: ABM framework skill, cultural adaptation, outreach generation; Reviewer agent: 16-point quality checklist; Orchestrator: agent routing + state management |
| 7 | Full playbook assembly pipeline (all 4 agents working end-to-end); PDF export; auth + billing (Stripe) |
| 8 | Polish, testing, beta deployment on AWS |

**Total: 8 weeks to MVP launch.**

### 5.4 Agent Build Order

Agents are built in this sequence because each depends on the previous:

| Order | Agent | What to Build |
|-------|-------|---------------|
| 1 | **Orchestrator** | OpenClaw instance setup, SOUL.md, task decomposition logic, state management, API gateway to frontend |
| 2 | **Researcher** | UDR skill port to OpenClaw, web scraping tools, search API integration, structured research output format |
| 3 | **Writer** | ABM framework skill, cultural KB, outreach templates, persona-based writing logic |
| 4 | **Reviewer** | 16-point quality checklist, fact verification, consistency scoring, revision routing back to Writer |

---

## 6. Phase 2+ Roadmap

| Phase | Timeline | Features |
|-------|----------|----------|
| **Phase 2** | M3-M5 | CRM integrations, email sequence export, multi-user workspaces, LinkedIn API, additional geographies (Nordics, UK, APAC) |
| **Phase 3** | M5-M8 | Human SME review marketplace, custom industry packs, Agency tier, white-label, API access |
| **Phase 4** | M8-M12 | Cultural knowledge database (all industries + geographies), competitive monitoring dashboards, playbook performance tracking (integrate with CRM to measure playbook → meeting → deal conversion) |

---

## 7. Competitive Landscape

| Competitor | What They Do | What They DON'T Do | Our Advantage |
|-----------|-------------|-------------------|---------------|
| **Apollo.io** | Contact database + sequencing | No playbook research, no cultural adaptation, no quality gate | We generate the playbook content, not just contact lists |
| **6sense / Demandbase** | Intent data + ABM platform | No playbook generation, requires huge contract, no SME review | We produce the deliverable, they just show you who's interested |
| **Regie.ai / Lavender** | AI email writing | Cold sales emails, not ABM playbooks; no research, no contacts, no cultural context | We do the research that makes emails ABM-quality |
| **B2B sales consultants** | Manual playbook creation ($15K+, 4-8 weeks) | Expensive, slow, inconsistent | Same quality, 1/30th the cost, delivered in hours |
| **ChatGPT/Claude** | Generate text from prompts | No research loop, no contact verification, no quality gate, no cultural rules | We encode the hard-won lessons (like "Head of Payment OPS ≠ Head of Payments") |

### Our Moat
1. **Cultural Knowledge Database** — improves with every playbook and SME review. Competitors can't copy this; it's learned, not documented.
2. **Contact Verification Gate** — the human-in-the-loop checkpoint that prevents the #1 failure mode. No other tool has this.
3. **Industry-Specific Rules** — banking is just the start. Every industry has its own "Head of Payment OPS ≠ Head of Payments" traps.
4. **SME Feedback Loop** — every human review makes the engine smarter. This compounds over time.

---

## 8. Go-to-Market Strategy

### 8.1 Launch Channels

| Channel | Strategy | Cost |
|---------|----------|------|
| **LinkedIn** | Founder-led content: "I built an AI that knows the difference between Head of Payments and Head of Payment OPS" — tell the story of the SME feedback loop | Time only |
| **Product Hunt** | Launch with the "ABM playbooks that don't embarrass you" angle | Free |
| **Banking/Fintech communities** | Share free Belfius playbook as example; offer 1 free playbook to community members | Time + free tier cost |
| **Sales communities** | Revenue.io, Pavillion, Bravado — "Stop sending cold sales templates and calling them ABM" | Time |
| **Partner with sales agencies** | Agency tier: white-label our output as their service | Revenue share |

### 8.2 Content Marketing

- **Free example playbook** (Belfius Bank — our real work, anonymized if needed) — this IS the demo
- **Blog series:** "Why your ABM emails get ignored" — based on real SME feedback
- **LinkedIn carousels:** Before/after ABM emails — show the difference
- **YouTube:** 10-min walkthrough of generating a playbook from URL to PDF

### 8.3 Sales Motion

| Stage | Action |
|-------|--------|
| **Awareness** | LinkedIn content, Product Hunt, community posts |
| **Interest** | Free playbook example download (gated: email) |
| **Evaluation** | 1 free playbook trial (full output, no credit card) |
| **Purchase** | Starter tier ($299/mo) self-serve |
| **Expansion** | Growth/Pro as teams see results; Agency for consultancies |

---

## 9. Risk Analysis

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| **LinkedIn TOS issues** | High | High | Start with user-provided contacts + public sources; LinkedIn Sales Navigator API for paid tiers; eventually replace with proprietary contact database |
| **LLM cost exceeds pricing** | Medium | High | Use GPT-4o-mini for routine tasks; cache common research queries; tier-based usage limits |
| **Playbook quality inconsistency** | Medium | High | Quality gate (16-check); template enforcement; iterative generation with section-by-section review |
| **Competition from incumbents** | Low (short-term) | Medium | Our moat is cultural knowledge + SME feedback loop; incumbents are focused on intent data, not playbook generation |
| **User churn (tried once, didn't need again)** | Medium | Medium | Subscription = ongoing value (new accounts each quarter); expand to monitoring/updates; content asset creation |
| **Regulatory/compliance issues** | Low | High | GDPR-first design; opt-out in every generated email; legal review templates; terms of use clear on data sourcing |

---

## 10. Success Metrics

| Metric | M3 Target | M6 Target | M12 Target |
|--------|-----------|-----------|------------|
| MRR | $5K | $28K | $50K |
| Paying customers | 7 | 45 | 90+ |
| Playbooks generated | 30 | 200 | 800+ |
| Contact accuracy (post-human review) | >90% | >95% | >98% |
| User NPS | >40 | >50 | >60 |
| SME feedback loops completed | 10 | 50 | 200+ |
| Cultural database entries | 50 | 200 | 500+ |
| Time-to-playbook | <2 hours | <90 min | <60 min |

---

## 11. Team & Resources Needed

| Role | Phase 1 (MVP) | Phase 2 |
|------|---------------|---------|
| **Full-stack developer** | 1 (Dave or hire) | 1 |
| **AI/ML engineer** | Part-time (Spark orchestrates) | 1 |
| **Product designer** | Nilum (PM) + contractor for UI | 1 |
| **Sales/marketing** | Nilum (founder-led) | 1 SDR + content marketer |
| **Infrastructure** | ~$200/mo (Vercel + Supabase + LLM API) | ~$1K/mo |

**Phase 1 burn rate: ~$2K-5K/mo (infrastructure + contractor + LLM costs)**  
**Break-even: ~$15K MRR (~20 Growth customers)**

---

## Appendix A: Feature Prioritization (RICE Framework)

| Feature | Reach | Impact | Confidence | Effort | Score |
|---------|-------|--------|------------|-------|-------|
| Product Brief input (URL) | 10 | 8 | 9 | 3 | 240 |
| Account Research engine | 10 | 9 | 8 | 5 | 144 |
| Contact Discovery + Verification | 10 | 10 | 7 | 5 | 140 |
| Contact Review Gate (human) | 8 | 10 | 9 | 2 | 360 |
| Full Playbook Generation | 10 | 9 | 8 | 8 | 90 |
| PDF Export | 10 | 6 | 10 | 2 | 300 |
| Quality Gate (16-check) | 8 | 8 | 8 | 3 | 170 |
| Cultural Adaptation (banking) | 6 | 8 | 7 | 4 | 84 |
| Auth + Billing | 10 | 5 | 10 | 3 | 166 |
| CRM Sync | 4 | 7 | 6 | 8 | 21 |
| Human SME Review | 3 | 9 | 5 | 6 | 22 |
| Email Sequence Export | 5 | 6 | 7 | 4 | 52 |

**Build order (by score):** Contact Review Gate → PDF Export → Quality Gate → Auth/Billing → Product Brief → Account Research → Contact Discovery → Playbook Generation → Cultural Adaptation → Email Export → CRM Sync → SME Review

---

*This PRD is a living document. Update as we learn from MVP users and SME feedback.*

*Built on hard-won lessons from the TracEI Belfius Bank ABM Playbook — where an SME review caught 5 critical errors that would have killed a real campaign.*