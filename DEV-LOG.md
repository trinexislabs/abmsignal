# ABMSignal — Development Log

> Single source of truth for all ABMSignal product development decisions, progress, and context.
> Synced to trinexis-brain regularly. When in doubt, check here.

**Product:** ABMSignal (abmsignal.com)
**GitHub:** https://github.com/trinexislabs/abmsignal
**Local:** /home/trinexis-dgx-spark/Apps/abmsignal/
**Dev URL:** http://192.168.1.11:3738
**Stack:** Next.js 16 + TypeScript + Tailwind + shadcn/ui + Supabase + BullMQ + Redis

---

## Architecture Decisions

### 2026-05-14: Agent Cluster Architecture

**Decision:** 4 OpenClaw agents, not 3. Orchestrator IS a separate agent.

| Agent | Role | Model | Workspace |
|-------|------|-------|-----------|
| abmsignal-orchestrator | Receives requests, decomposes tasks, manages state, enforces human gates, assembles final playbook | Best available (GPT-4o / Claude) | ~/.openclaw/workspace-abmsignal-orchestrator |
| abm-researcher | Deep research via UDR loops (3-5 iterations per account), contact discovery, signal detection | Best available | ~/.openclaw/workspace-abm-researcher |
| abm-writer | Writes all 12 playbook sections, cultural adaptation, personalized outreach | Best available | ~/.openclaw/workspace-abm-writer |
| abm-reviewer | 16-point quality checklist, fact verification, consistency scoring | Fast/cheap model (GPT-4o-mini) | ~/.openclaw/workspace-abm-reviewer |

**Flow:**
```
Orchestrator → spawns Researcher → collects research
→ Human Gate (contact review) → spawns Writer → collects playbook
→ spawns Reviewer → collects review → if fail, re-spawn Writer for flagged sections
→ assembles final playbook → delivers
```

**Key decisions:**
- Orchestrator uses `sessions_spawn` to dispatch to sub-agents (OpenClaw native)
- Each agent returns structured JSON (defined schemas per agent)
- Human gate pauses BullMQ job, resumes when user approves contacts via API
- Dev: DGX Spark (separate OpenClaw instance). Production: AWS EC2
- Orchestrator is an agent, NOT just API logic — it makes decisions about routing, retry, and revision loops

### 2026-05-13: Product Naming & Repo Setup

**Decision:** Product name = ABMSignal (abmsignal.com)
- Domain likely available (no DNS records)
- PRD updated to v1.1 with agent swarm architecture, generic ABM framework, AWS deployment model
- GitHub repo: trinexislabs/abmsignal (public)
- Local: /home/trinexis-dgx-spark/Apps/abmsignal/

### 2026-05-13: No Auth/Payments in MVP

**Decision:** Skip Stripe integration and Supabase Auth for now. Focus on core engine.
- Middleware disabled for prototype
- No billing pages
- No real auth — just UI screens for demo
- Priority: Make the agent loop work end-to-end before adding business infrastructure

### 2026-05-13: Frontend Prototype Built

**Status:** v0.1 built and running at http://192.168.1.11:3738
- Landing page, auth screens, dashboard, new playbook flow (product brief + target account)
- Playbook detail view (12 sections), contact review gate, quality review page
- Dark theme, navy + electric blue
- Mock data (Belfius Bank example)
- Build passes, production server running
- Claude Code hit rate limit before completing: settings page, processing animation page, richer mock data

---

## Current Priority: Build the Engine

**Phase 1 (Current): Agent Configs + Test Loop** ✅ IN PROGRESS
1. ✅ Create 4 agent configs (SOUL.md, workspaces) on DGX Spark
2. ✅ Add agents to OpenClaw config
3. ✅ Create ABM Framework skill
4. ⏳ Test orchestration: Orchestrator dispatches to Researcher
5. ⏳ Test full loop: Researcher → Writer → Reviewer → assembled playbook
6. ⏳ Validate output quality with real target account

**Phase 2: API Layer + Job Queue**
- REST API: POST /api/playbooks, GET status, POST contact review
- BullMQ + Redis for async job management
- SSE for real-time progress to frontend
- State machine: idle → researching → contacts_ready → writing → reviewing → complete

**Phase 3: Wire Frontend to Engine**
- Replace mock data with real agent output
- Processing page shows real agent progress
- Contact review gate uses real contacts from Researcher
- Playbook view renders real agent JSON

**Phase 4: Production Deploy**
- AWS EC2 for OpenClaw agent cluster
- Vercel for Next.js frontend
- abmsignal.com domain + SSL
- Monitoring, logging, error handling

---

## Agent Schemas (Work In Progress)

### Researcher Output Schema
```json
{
  "account_intel": {
    "company_name": "",
    "overview": "",
    "financials": "",
    "tech_stack": [],
    "strategic_initiatives": [],
    "recent_news": []
  },
  "contacts": [
    {
      "name": "",
      "title": "",
      "role": "",
      "linkedin_url": "",
      "confidence": "high|medium|low",
      "source": "",
      "verification_status": "verified|needs_review|outdated"
    }
  ],
  "why_now_signals": [
    {
      "signal": "",
      "type": "news|regulatory|leadership|funding|technology",
      "date": "",
      "relevance": "",
      "source": ""
    }
  ],
  "cultural_context": {
    "geography": "",
    "industry": "",
    "communication_style": "",
    "meeting_preferences": "",
    "cta_style": "",
    "seasonal_considerations": "",
    "regulatory_notes": ""
  },
  "competitive_landscape": [
    {
      "vendor": "",
      "product": "",
      "relationship": "incumbent|challenger|emerging",
      "strength": "",
      "weakness": "",
      "displacement_opportunity": ""
    }
  ]
}
```

### Writer Output Schema
```json
{
  "sections": {
    "executive_summary": { "content": "", "status": "draft|complete|reviewed" },
    "account_intelligence": { "content": "", "status": "" },
    "buying_committee": { "content": "", "status": "" },
    "why_now_signals": { "content": "", "status": "" },
    "competitive_landscape": { "content": "", "status": "" },
    "cultural_context": { "content": "", "status": "" },
    "outreach_strategy": { "content": "", "status": "" },
    "outreach_sequences": { "content": "", "status": "" },
    "battle_cards": { "content": "", "status": "" },
    "content_strategy": { "content": "", "status": "" },
    "measurement_framework": { "content": "", "status": "" },
    "appendix": { "content": "", "status": "" }
  }
}
```

### Reviewer Output Schema
```json
{
  "overall_score": 0,
  "checks": [
    {
      "number": 1,
      "name": "Contact verification",
      "category": "Accuracy",
      "status": "pass|fail|warning",
      "details": ""
    }
  ],
  "flagged_sections": [],
  "revision_needed": false
}
```

---

## Open Questions

- [ ] Which LLM provider for each agent? (OpenAI, Anthropic, local?)
- [ ] Cost per playbook estimate (LLM tokens per run)
- [ ] Contact data sources — LinkedIn API vs scraping vs user-provided only for MVP?
- [ ] AWS instance type for production (GPU needed? Probably not — LLM calls are API-based)
- [ ] How many concurrent playbook generations should we support in v1?

---

*Last updated: 2026-05-14 by Spark*