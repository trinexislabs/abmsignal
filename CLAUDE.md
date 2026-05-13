# ABMSignal — Project Context

## Product
ABMSignal is an AI-powered ABM (Account-Based Marketing) Playbook Engine SaaS platform.
Users input their product brief + target account, and get a launch-ready, hyper-personalized ABM playbook with verified contacts, culturally-adapted outreach, and a complete execution checklist.

## Stack
- **Framework:** Next.js 15 (App Router) + TypeScript + Tailwind CSS v4
- **UI:** shadcn/ui components (Radix primitives + Tailwind)
- **Database:** Supabase (PostgreSQL) — auth, real-time subscriptions, storage
- **Payments:** Stripe (subscription billing)
- **AI Backend:** OpenClaw agent cluster (separate deployment, not part of this codebase)
- **State:** Redis + BullMQ for job queues (playbook generation is async, 30-120 min)
- **Styling:** Dark theme, modern SaaS aesthetic, navy + white accent colors

## Architecture
This repo is the **SaaS frontend + API layer**. It:
1. Collects user input (product brief, target account)
2. Sends jobs to the AI backend (OpenClaw agent cluster)
3. Shows real-time progress via WebSockets
4. Presents the generated playbook with inline editing
5. Handles contact verification gate (human checkpoint)
6. Exports playbooks as PDF

The AI agent swarm (Orchestrator, Researcher, Writer, Reviewer) runs on a separate OpenClaw deployment on AWS. This frontend communicates via REST API + WebSocket events.

## Agent Swarm (for context, not in this repo)
| Agent | Role |
|-------|------|
| Orchestrator | Decomposes requests, routes tasks, manages state, enforces gates |
| Researcher | Deep account research via UDR loops |
| Writer | Hyper-personalized outreach, cultural adaptation |
| Reviewer | 16-point quality checklist, fact verification |

## Current Build State
Starting from scratch. This is the initial build.

## Conventions
- All components in `src/components/`
- All pages in `src/app/` (App Router)
- All API routes in `src/app/api/`
- All types in `src/types/`
- All lib/utils in `src/lib/`
- Use server components by default, client components only when needed
- Use Supabase client from `src/lib/supabase/`
- Use Stripe client from `src/lib/stripe/`

## Design System
- Dark mode default
- Primary color: Navy (#1e3a5f) — professional, trustworthy
- Accent: Electric blue (#339af0) — action, highlights
- Background: Near-black (#0a0a0f) 
- Surface: Dark gray (#141419)
- Text: White (#ffffff) and muted gray (#a1a1aa)
- Font: Inter (body), Space Grotesk (headings)
- Border radius: 8px (buttons), 12px (cards), 16px (modals)
- Shadows: Subtle, layered glow effects
- Animations: Smooth transitions, subtle pulse on loading states

## Key Pages to Build
1. Landing page (marketing homepage)
2. Dashboard (active playbooks, quick start)
3. New Playbook flow (product brief → target account → generate)
4. Playbook detail view (progress, sections, contacts)
5. Contact Review Gate (human checkpoint)
6. Playbook preview + export
7. Settings / Billing