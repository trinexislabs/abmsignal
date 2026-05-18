# ABMSignal — Data Flow Architecture

## 1. User Input → Playbook Creation

```
User fills form → POST /api/playbooks → Engine Runner → OpenClaw CLI → Orchestrator
```

**Step by step:**

1. User fills two forms on `/playbook/new/product` and `/playbook/new/account`
2. Form data sent to `POST /api/playbooks` which creates a playbook record with status "draft"
3. User clicks "Generate" → `POST /api/playbooks/[id]/generate` which calls the Engine Runner at `http://localhost:18793/invoke`
4. Engine Runner spawns `openclaw agent --agent orchestrator -m "GENERATE ABM PLAYBOOK..."` as a detached child process
5. The message includes: playbook ID, product brief, target account, and API endpoint URLs

**Key file:** `src/app/api/playbooks/[id]/generate/route.ts` → calls `http://localhost:18793/invoke`
**Engine Runner:** `engine-runner/src/index.js` → spawns CLI with `OPENCLAW_GATEWAY_PORT=18790`

---

## 2. Orchestrator → API Updates (Agent writes back)

```
Orchestrator uses curl → PATCH /api/playbooks/[id] → updates playbook in memory store
```

The orchestrator agent uses `exec` tool to run `curl` commands that update the playbook status, push contacts, and submit sections:

- `PATCH /api/playbooks/[id]` — updates status, progress_pct, agent_status, sections
- `POST /api/playbooks/[id]/contacts/review` — pushes contacts for human review
- After human approves contacts → Engine Runner re-invoked with `phase: 'writing'` → orchestrator continues

**Storage:** `src/lib/store/playbooks.ts` — in-memory Map + file persistence to `data/playbooks.json`

---

## 3. UI Polls for Progress

```
Frontend polls → GET /api/playbooks/[id]/status → returns status, progress, agent_status
```

- `/playbook/[id]/processing/page.tsx` polls `GET /api/playbooks/[id]/status` every 5 seconds
- When status = `contact_review` → redirects to `/playbook/[id]/contacts`
- When status = `complete` → redirects to `/playbook/[id]`

---

## 4. Rendering the Playbook

```
/playbook/[id]/page.tsx → GET /api/playbooks/[id] → renders sections, contacts, sources
```

- `GET /api/playbooks/[id]` returns the full playbook with sections, contacts, agent_status
- The page renders each section in a card layout
- Section content is markdown, rendered via `dangerouslySetInnerHTML` or a markdown parser
- Source references: content text containing `(source: URL)` is parsed into inline `[1]` badges
- The `Sources & Verification` section consolidates all `section.sources` arrays

---

## 5. The Flow Diagram

```
[Next.js UI]                    [Engine Runner]              [OpenClaw Agents]
     │                                │                           │
     ├─ POST /generate ──────────────►│                           │
     │                                ├─ spawn CLI ─────────────►│ Orchestrator
     │                                │                           │
     │◄─ polls GET /status ───────────┤                           │
     │  (every 5s)                    │                           ├─ curl PATCH /status
     │                                │                           ├─ curl POST /contacts
     │                                │                           │
     ├─ [Human approves contacts] ───┤                           │
     │  POST /contacts/review ───────┼─ re-invoke CLI ─────────►│ continue writing
     │                                │                           │
     │                                │                           ├─ curl PATCH /sections
     │                                │                           ├─ spawn reviewer
     │                                │                           │
     │◄─ redirect to /playbook/[id] ──┤                           │
     │  when status=complete           │                           │
```

---

## Key Files

| File | Role |
|------|------|
| `src/app/api/playbooks/[id]/generate/route.ts` | Triggers Engine Runner |
| `engine-runner/src/index.js` | Spawns OpenClaw CLI |
| `src/lib/store/playbooks.ts` | In-memory + file storage |
| `src/app/api/playbooks/[id]/route.ts` | GET/PATCH playbook data |
| `src/app/api/playbooks/[id]/status/route.ts` | Status polling endpoint |
| `src/app/api/playbooks/[id]/contacts/route.ts` | Contact review endpoint |
| `src/app/api/playbooks/[id]/verify/route.ts` | Source verification endpoint |
| `src/app/playbook/[id]/processing/page.tsx` | Polling UI |
| `src/app/playbook/[id]/page.tsx` | Final playbook render |
| `src/app/playbook/[id]/contacts/page.tsx` | Contact review UI |

---

## Agent Architecture

```
OpenClaw Gateway (port 18790)
├── orchestrator (GLM-5.1 Cloud) — coordinates pipeline, delegates via sessions_spawn
│   ├── researcher (GLM-5.1 Cloud) — 12-loop deep research, 75+ searches
│   ├── writer (GLM-5.1 Cloud) — writes 12 sections with personalization
│   └── reviewer (Qwen 3.5 35B Local) — 24-point quality checklist
```

### Agent Config Locations

| Agent | Workspace | Skills |
|-------|-----------|--------|
| orchestrator | `~/.openclaw-abmsignal/workspace-orchestrator/` | abm-framework |
| researcher | `~/.openclaw-abmsignal/workspace-researcher/` | abm-framework, udr-research, abm-deep-research |
| writer | `~/.openclaw-abmsignal/workspace-writer/` | abm-framework |
| reviewer | `~/.openclaw-abmsignal/workspace-reviewer/` | abm-framework |

### Skill Locations

| Skill | Path |
|-------|------|
| ABM Deep Research | `~/.openclaw-abmsignal/skills/abm-deep-research/SKILL.md` |
| ABM Framework | `~/.openclaw/skills/abm-framework/SKILL.md` |
| UDR Research | `~/.openclaw/skills/udr-research/SKILL.md` |

### Config & Runtime

| Component | Location |
|-----------|----------|
| OpenClaw config | `~/.openclaw-abmsignal/openclaw.json` |
| Gateway systemd service | `~/.openclaw-abmsignal/openclaw-abmsignal.service` |
| Gateway start script | `~/.openclaw-abmsignal/start.sh` |
| Engine Runner | `~/Apps/abmsignal/engine-runner/` (port 18793) |
| Next.js app | `~/Apps/abmsignal/` (port 3738) |
| Playbook data | `~/Apps/abmsignal/data/playbooks.json` |

---

## Communication Pattern

There is no WebSocket or real-time push — it's all **polling-based**:

1. The agent writes back via `curl` to the Next.js API
2. The frontend polls `GET /status` every 5 seconds to pick up changes
3. Status transitions trigger page redirects (contact_review → contacts page, complete → playbook page)

This is intentionally simple — no persistent connections to maintain, no reconnection logic needed.