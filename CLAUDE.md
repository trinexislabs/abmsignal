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
- **Styling:** Dark Emerald theme (Design System v1.0) — executive intelligence aesthetic, emerald + deep green on near-black

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

## Design System — v1.0 Dark Emerald (canonical)
Positioning: Executive Intelligence Platform. "This looks like a platform a VP of Sales would trust with a $50M pipeline." Avoid neon AI-startup / purple-gradient / hacker-terminal aesthetics.

**Brand colors**
- Deep Executive Green `#0B3D2E` — primary brand, hero accents, nav/logo treatments (~30% usage)
- Signal Emerald `#10B981` — primary CTA, success, progress, positive signals (~20%); hover `#059669`
- Mint Highlight `#A7F3D0` — badges, secondary highlights, soft positives (~5%)
- Intelligence Blue `#2563EB` — secondary CTA, links, data highlights (~10%)

**Neutral scale**
- `#0B0F13` (900) main dark bg/hero · `#111827` (800) cards/panels/sidebars · `#1F2937` (700) elevated surfaces/modals/tables · `#374151` (600) borders/dividers · `#6B7280` (500) secondary text/icons · `#9CA3AF` (400) placeholder/disabled · `#D1D5DB` (300) light borders · `#E5E7EB` (200) input borders · `#F3F4F6` (100) · `#F9FAFB` (50) · `#FFFFFF` text on dark

**Semantic** — success `#10B981`/light `#D1FAE5`/text `#065F46` · info `#2563EB`/`#DBEAFE`/`#1E40AF` · warning `#F59E0B`/`#FEF3C7`/`#92400E` · error `#EF4444`/`#FEE2E2`/`#991B1B`

**Components** — Hero bg `#0B0F13` + gradient `linear-gradient(135deg,#0B0F13 0%,#0B3D2E 40%,#0B0F13 100%)` · Primary CTA bg `#10B981`/hover `#059669` · Secondary CTA transparent + `#10B981` border + `#A7F3D0` text · Cards bg `#111827` border `#1F2937` hover-border `#10B981` · Nav bg `#0B0F13` text `#D1D5DB` hover `#FFFFFF` active `#10B981`

**Type colors** — headings `#FFFFFF`, body `#E5E7EB`, secondary `#9CA3AF`, muted `#6B7280`
**Data-viz** — success `#10B981`, intelligence `#2563EB`, strategic `#7C3AED`, engagement `#14B8A6`, warning `#F59E0B`, risk `#EF4444`, activity `#06B6D4`, marketing `#EC4899`, neutral `#6B7280`

- Font: Inter (body), Space Grotesk (headings). Radius: 8px buttons, 12px cards, 16px modals.
- Always dark, no light mode. CSS variables in `globals.css`; hex values used directly in Tailwind classes across components.

## Key Pages to Build
1. Landing page (marketing homepage)
2. Dashboard (active playbooks, quick start)
3. New Playbook flow (product brief → target account → generate)
4. Playbook detail view (progress, sections, contacts)
5. Contact Review Gate (human checkpoint)
6. Playbook preview + export
7. Settings / Billing