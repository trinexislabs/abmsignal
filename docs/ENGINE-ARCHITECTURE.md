# ABMSignal — Engine Architecture

## The Problem

OpenClaw agents need an active session to process tasks. TaskFlows create task records, but without an active channel or heartbeat trigger, queued tasks sit idle.

## The Solution: Server A → Server B REST API

### Architecture (Production)

```
Server A (Next.js)                    Server B (OpenClaw Agent Cluster)
┌─────────────────┐                   ┌──────────────────────────────┐
│  Frontend UI    │                   │  OpenClaw Gateway :18790     │
│  API Routes     │───HTTPS REST──────│  Webhooks Plugin             │
│  Processing UI  │                   │  TaskFlow API                │
│                 │◄──poll status──────│  Orchestrator Agent          │
│                 │                   │  Researcher Agent            │
│                 │                   │  Writer Agent                 │
│                 │                   │  Reviewer Agent              │
└─────────────────┘                   └──────────────────────────────┘
```

### Flow (Current Implementation)

1. **Next.js** creates a TaskFlow via `POST /api/generate` (webhooks plugin)
2. **Next.js** triggers the orchestrator via `run_task` action (spawns a subagent session)
3. **Orchestrator** picks up the task, processes it, spawns sub-agents
4. **Next.js** polls `GET /api/playbooks/[id]/flow` for TaskFlow status
5. **When flow completes**, Next.js reads the result from flow.stateJson

### Flow (Simulation Mode)

When OpenClaw is unreachable:
- Time-based simulation in the status API endpoint
- researching (3min) → contact_review → writing (2min) → reviewing (1min) → complete

### API Endpoints

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/playbooks` | POST | Create playbook + trigger generation |
| `/api/playbooks` | GET | List playbooks |
| `/api/playbooks/[id]` | GET | Playbook detail |
| `/api/playbooks/[id]/status` | GET | Generation status (sim or real) |
| `/api/playbooks/[id]/contacts` | GET | Contacts for review |
| `/api/playbooks/[id]/contacts/review` | POST | Submit contact review (human gate) |
| `/api/playbooks/[id]/generate` | POST | Create TaskFlow + run_task |
| `/api/playbooks/[id]/flow` | GET | Poll OpenClaw TaskFlow status |

### OpenClaw Webhooks API

| Action | Description |
|--------|-------------|
| `create_flow` | Create a TaskFlow with a goal |
| `run_task` | Spawn an agent session within a flow |
| `find_latest_flow` | Get the most recent flow |
| `get_flow` | Get specific flow by ID |
| `get_task_summary` | Get task status summary for a flow |

### Auth

- Webhook secret: `X-Openclaw-Webhook-Secret: abmsignal-wh-secret-2026`
- Gateway auth: `Authorization: Bearer 3yJosQnmudygR1aUicMf4vK9boIdo8D2m6kbtt5k1RM`

### Agent Config (on Server B)

- Config: `~/.openclaw-abmsignal/openclaw.json`
- Port: 18790
- Agents: orchestrator, researcher, writer, reviewer
- Services: systemd `openclaw-abmsignal.service`