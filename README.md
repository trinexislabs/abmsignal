# ABMSignal

AI-powered ABM Playbook Engine — multi-agent research, writing, and review.

## Overview

ABMSignal generates production-ready, hyper-personalized Account-Based Marketing playbooks using a swarm of specialized AI agents (Orchestrator, Researcher, Writer, Reviewer).

**Product Brief + Target Account → Launch-Ready ABM Campaign**

## Architecture

- **Frontend:** Next.js + TypeScript + Tailwind + Supabase
- **Backend:** OpenClaw agent cluster (4 agents on AWS)
- **Database:** Supabase (PostgreSQL)
- **Queue:** BullMQ + Redis
- **Payments:** Stripe

## Agent Swarm

| Agent | Role | Model |
|-------|------|-------|
| Orchestrator | Task decomposition, state management, assembly | GPT-4o / Claude |
| Researcher | Deep account research (UDR), contact discovery | GPT-4o / Claude |
| Writer | Outreach sequences, cultural adaptation, battle cards | GPT-4o / Claude |
| Reviewer | 16-point quality checklist, fact verification | GPT-4o-mini |

## Getting Started

```bash
npm install
npm run dev
```

## Documentation

- [PRD](https://github.com/trinexislabs/abmsignal/blob/main/docs/PRD.md)
- [Architecture](https://github.com/trinexislabs/abmsignal/blob/main/docs/architecture.md)

## License

Proprietary — Trinexis Labs