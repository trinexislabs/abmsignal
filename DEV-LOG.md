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

### 2026-05-14: OpenClaw Integration Architecture

**Key Insight:** OpenClaw does NOT have a REST API for creating sessions externally. The `POST /api/v1/sessions` endpoint doesn't exist.

**Correct integration pattern:**
- The Next.js app sends messages to the **orchestrator agent via the hooks API** (`POST /hooks`)
- The orchestrator agent receives the message and uses `sessions_spawn` internally to dispatch to researcher/writer/reviewer
- Results are written to `/tmp/abmsignal/{playbook_id}/result.json` which the Next.js app polls

**Hooks API:**
- Endpoint: `http://localhost:18790/hooks`
- Auth: `Authorization: Bearer k5EGW3POknr5cdIkljFUt2-lAQKpGiM822QovD30e50`
- Body: `{"message": "..."}`
- This sends the message to the default agent (orchestrator)

**Simulation fallback:** When OpenClaw is not reachable, the API falls back to time-based simulation (researching → contacts_review → writing → reviewing → complete).

**Decision:** 4 OpenClaw agents on a SEPARATE instance from Trinexis team.

| Agent | Role | Model | Workspace |
|-------|------|-------|-----------|
| orchestrator | Receives requests, decomposes tasks, manages state, enforces human gates, assembles final playbook | GLM-5.1 (cloud) | ~/.openclaw/workspace-abmsignal-orchestrator |
| researcher | Deep research via UDR loops (3-5 iterations per account), contact discovery, signal detection | GLM-5.1 (cloud) | ~/.openclaw/workspace-abm-researcher |
| writer | Writes all 12 playbook sections, cultural adaptation, personalized outreach | GLM-5.1 (cloud) | ~/.openclaw/workspace-abm-writer |
| reviewer | 16-point quality checklist, fact verification, consistency scoring | Qwen 3.5 35B (local) | ~/.openclaw/workspace-abm-reviewer |

**Separate OpenClaw instance:**
- Config: `~/.openclaw-abmsignal/openclaw.json`
- Port: 18790 (vs Trinexis on 18789)
- Service: `openclaw-abmsignal.service` (systemd)
- Start script: `~/.openclaw-abmsignal/start.sh`
- No Telegram channel (API-only, no chat interface needed)
- Shares Ollama models with Trinexis instance

**Why separate:** ABMSignal is a product, not a team member. It should not share config, sessions, or channels with Trinexis staff agents.

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

**Phase 1 (Current): Agent Configs + Test Loop** ✅ COMPLETE
1. ✅ Create 4 agent configs (SOUL.md, workspaces) on DGX Spark
2. ✅ Add agents to separate OpenClaw instance (port 18790)
3. ✅ Create ABM Framework skill
4. ⏳ Test orchestration: Orchestrator dispatches to Researcher
5. ⏳ Test full loop: Researcher → Writer → Reviewer → assembled playbook
6. ⏳ Validate output quality with real target account

**Phase 2: API Layer + Frontend Wiring** ✅ IN PROGRESS
1. ✅ OpenClaw REST client (src/lib/openclaw/client.ts)
2. ✅ In-memory playbook store (src/lib/store/playbooks.ts)
3. ✅ 7 API routes (create, list, detail, status, contacts, review, generate)
4. ✅ Processing page with agent status cards + polling
5. ✅ New playbook processing flow (create → generate → progress)
6. ✅ Simulation mode (falls back to mock when OpenClaw not reachable)
7. ⏳ Wire frontend forms to API (product brief → account → generate)
8. ⏳ End-to-end test with real OpenClaw agents
9. ⏳ Settings/billing pages (low priority)

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