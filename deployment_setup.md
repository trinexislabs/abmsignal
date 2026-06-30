# ABMSignal — Production Deployment Log

Self-hosted MVP on **DGX Spark**, public ingress via **Cloudflare Tunnel only**.
This file is the running record of the deployment. Update it after every successful
step. **Never put secrets in this file.**

---

## Chosen deployment option

**Option A** — DGX Spark self-host + Cloudflare Tunnel + Resend + merchant-of-record.

### Locked decisions
| Decision | Choice |
|---|---|
| OpenClaw worker placement | **Run worker on the host** (not in Docker). OpenClaw is a local CLI binary the worker `execFile`s; keeping the worker on the host is the simplest faithful match. |
| Public domain | `abmsignal.com` (purchased via Cloudflare). |
| Hostname split | Apex `abmsignal.com` = marketing/product page · `app.abmsignal.com` = logged-in app/dashboard. Internal connectivity subdomains chosen as needed. |
| Merchant of record | **Lemon Squeezy** (may change later). |

---

## Phase 1 — Repo & deployment inventory  ✅ (2026-06-25)

### Files inspected (read-only, no changes)
- `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore`, `.env.production.example`, `next.config.ts`
- Auth: `src/auth.ts`, `src/auth.config.ts`
- Worker/queue: `src/server/jobs/worker-process.ts`, `src/server/jobs/queue.ts`, `src/server/jobs/workers/playbook-generation-worker.ts`
- OpenClaw: `src/lib/openclaw/client.ts` (real path), `src/server/agent/openclaw-adapter.ts` (legacy, unused by workers)
- Payments: `src/app/api/payment/mock/route.ts`

### Findings — already in good shape
- **Dockerfile**: one image, 3 roles (web/worker/migrate); `node:20-bookworm-slim`; runs as unprivileged `node`.
- **Compose**: `redis`, `migrate` (one-shot `prisma migrate deploy`), `web`, `worker`, `caddy`; health-gated `depends_on`.
- **Database**: libsql/SQLite `file:/data/prod.db` on `appdata` volume; persisted across restarts.
- **Redis**: password-required, appendonly, internal-only (not published).
- **Worker/BullMQ**: real Worker, configurable concurrency, fail-fast Redis, long lock duration, stuck-run reset, graceful SIGTERM.
- **Email**: Resend wired via NextAuth provider, env-driven `EMAIL_FROM`.
- **Auth**: NextAuth v5 (Google + Resend magic link + Credentials), JWT sessions, `AUTH_TRUST_HOST=true`.

### Findings — must change for DGX Spark + Cloudflare Tunnel
1. **Caddy assumes direct public internet** (binds 80/443, Let's Encrypt auto-HTTPS on `app.abmsignal.com`). Won't work with no public inbound ports. → make internal HTTP-only, or drop Caddy and let cloudflared hit the web container directly.
2. **OpenClaw is a local host binary**, not an HTTP service: worker `execFile`s `openclaw agent --local` from `~/.openclaw/bin/openclaw`, state in `~/.openclaw-abmsignal`. → worker must run on host (decided).
3. **Payments are MOCK only** (`/api/payment/mock` flips `paymentStatus='paid'`). No Stripe webhook, no MoR. Data model already has `paymentStatus/paidAt/paymentReference` + credits/subscription tables. → build Lemon Squeezy integration with a real state model (Phase 9).
4. **`.env.production.example` is Stripe-centric** → needs a Lemon Squeezy section; OpenClaw vars must match host-worker layout.

### Verification
Inventory only; no commands run that change state. No files modified.

### Next step
Phase 2 — confirm local service layout (worker on host + DB bind-mount + reverse-proxy decision), then Phase 3 env config.

---

## Phase 2–5 — Architecture + compose/env/worker rewrite  ✅ (2026-06-25)

### Decisions confirmed by user
- Drop Caddy (Cloudflare terminates TLS); cloudflared → web directly.
- DB on a host **bind mount** `./data:/data` (shared by web container + host worker).
- Publish `web` and `redis` on **127.0.0.1 only** (loopback), nothing public.
- Domain: apex `abmsignal.com` = marketing; `app.abmsignal.com` = app. `AUTH_URL`/`NEXT_PUBLIC_APP_URL` = app subdomain.

### Final local layout
```
Compose project "abmsignal":  web (127.0.0.1:3000) · redis (127.0.0.1:6379) · migrate (one-shot)
HOST systemd services:        abmsignal-worker (BullMQ + OpenClaw CLI) · cloudflared (public ingress)
HOST runtimes:                OpenClaw (~/.openclaw, ~/.openclaw-abmsignal) · Ollama (GPU)
Data:                         ./data/prod.db (bind mount) · ./backups (Phase 10)
Tunnel:                       abmsignal.com & app.abmsignal.com -> http://localhost:3000
```

### Files changed
- `docker-compose.yml` — removed `caddy` + `worker` services and their volumes; `web`/`redis` now publish to `127.0.0.1`; DB switched from `appdata` named volume to `./data` bind mount.
- `.env.production.example` — rewritten: Lemon Squeezy section (replaces Stripe as MoR; Stripe kept blank/legacy), app-subdomain `AUTH_URL`/`NEXT_PUBLIC_APP_URL`, OpenClaw host vars.
- `.env.worker.example` — NEW: host-worker overrides (`DATABASE_URL` real path, `REDIS_URL` via 127.0.0.1, `WORKER_CONCURRENCY`).
- `infra/abmsignal-worker.service` — NEW: systemd unit for the host worker.
- `.gitignore` — track `.env.worker.example`.
- `Caddyfile` — removed (git rm).

### Not yet done / open items
- OpenClaw → app callback base URL (if agents PATCH the API): confirm during Phase 5 verification (research phase parses stdout, so may not be needed).
- Enable SQLite WAL once on the server for safe concurrent web+worker access:
  `sqlite3 ./data/prod.db 'PRAGMA journal_mode=WAL;'` (run after first migrate).
- Lemon Squeezy integration code is Phase 9 (current payments still mock).

### Verification
No services started yet. YAML/structure authored; run/verify is the next step (Phase 5).

### Next step
Phase 5 run — create `.env.production` + `.env.worker` from templates on the server, `docker compose build && up -d`, then install the worker + (Phase 6) cloudflared.

> **NOTE:** The DB bind-mount + WAL items below were SUPERSEDED by Phase 2.5
> (database moved to Supabase Postgres — no local SQLite file).

---

## Phase 2.5 — Supabase Postgres + Supabase Auth migration  ✅ code complete (2026-06-25)

User chose **full Supabase Auth** (replace NextAuth) + Supabase Postgres (replace SQLite).

### Database (SQLite/libsql → Supabase Postgres, Prisma kept)
- `prisma/schema.prisma`: datasource `sqlite` → `postgresql`.
- `prisma.config.ts`: migrations use `DIRECT_URL` (falls back to `DATABASE_URL`).
- `src/server/db.ts`: libsql adapter → `@prisma/adapter-pg` (installed `@prisma/adapter-pg`, `pg`, `@types/pg`).
- Removed old SQLite migrations (`prisma/migrations/`); fresh Postgres baseline to be generated against Supabase.
- **Runtime → transaction pooler (:6543); migrations → direct (:5432).**

### Schema for Supabase Auth
- `User` repurposed as the **profile** table: `id` = Supabase `auth.users.id` (text), no `password`/`emailVerified`. Dropped `Account`, `Session`, `VerificationToken` models. App FKs (Playbook/UserSubscription/UserCredit/OrganizationMember) unchanged.
- `supabase/triggers/handle_new_user.sql` — NEW: on `auth.users` insert, creates the profile + a free `UserSubscription` (replaces NextAuth `createUser` event). **Run once in Supabase SQL editor AFTER migrate.**

### Auth code (NextAuth → @supabase/ssr)
- Reused scaffold clients `src/lib/supabase/{server,client,middleware}.ts`.
- NEW: `src/lib/supabase/use-user.ts` (client hook, replaces `useSession`); `src/app/auth/callback/route.ts` (OAuth/PKCE); `src/app/auth/confirm/route.ts` (email OTP); `src/app/api/admin/check/route.ts` (server-side admin role check).
- Rewrote `src/lib/auth/session.ts` (`getSession`/`requireAuth` via `supabase.auth.getUser()`) and `src/lib/auth/admin.ts` (role from DB).
- Rewrote `src/middleware.ts` (Supabase session refresh + route protection; admin role enforced server-side, not in Edge).
- Client pages/components swapped to Supabase calls: `signin`, `signup`, `forgot-password`, `admin/login`, `layout.tsx` (removed SessionProvider), `navbar.tsx`, `dashboard/layout.tsx`, `admin/admin-sidebar.tsx`.
- API routes (`playbooks/*`, `user/plan`, `payment/mock`): `auth()` → `getSession()`.
- `scripts/create-admin.ts`: rewritten to use Supabase Admin API + Prisma (pg).
- **Removed**: `src/auth.ts`, `src/auth.config.ts`, `src/types/next-auth.d.ts`, `api/auth/[...nextauth]`, `api/auth/register`. **Uninstalled**: `next-auth`, `@auth/prisma-adapter`, `bcryptjs`, `@types/bcryptjs`, `@supabase/auth-helpers-nextjs`.

### Deployment config updated
- `docker-compose.yml`: removed `./data` bind-mounts (no SQLite); build args now require `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY`.
- `.env.production.example`: Supabase DB (`DATABASE_URL`+`DIRECT_URL`) + `NEXT_PUBLIC_SUPABASE_URL`/`ANON_KEY` + `SUPABASE_SERVICE_ROLE_KEY`; removed NextAuth vars (`AUTH_SECRET`/`AUTH_URL`/`GOOGLE_*`/Resend-as-NextAuth).
- `.env.worker.example`: only `REDIS_URL` (loopback) + `WORKER_CONCURRENCY` (DATABASE_URL inherited).

### Verification
- `npx prisma validate` ✅, `npx prisma generate` ✅, `npx tsc --noEmit` ✅ (0 errors).
- **Migration applied to Supabase** ✅ (`20260625130313_init_postgres`) via `database.env` (gitignored; secured `.gitignore` with `*.env`). DIRECT_URL host `db.<ref>.supabase.co:5432` worked (IPv6 OK on this host).
- **Trigger applied** ✅ — verified: 11 app tables present, `on_auth_user_created` trigger + `handle_new_user` function present.
- **`npm run build`** ✅ — all routes compiled incl. `/auth/callback`, `/auth/confirm`, `/api/admin/check`, middleware. User confirmed Supabase project was empty.

### Remaining for this phase (needs Supabase API keys + dashboard)
1. Add to `.env.production` (and for a local auth test, to `database.env`): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (Project Settings → API).
2. Supabase dashboard → Authentication: Site URL = `https://app.abmsignal.com`; redirect URLs `/auth/callback` + `/auth/confirm`; enable Email + Google providers; custom SMTP = Resend; email templates → token_hash + `/auth/confirm`.
3. Create admin: `npm run admin:create -- you@email.com --password ...` (needs the API keys in env).

### Smoke test (2026-06-25) ✅ PASS
With API keys added to `database.env`: anon key reachable ✓; admin API (service role) works ✓; signup trigger created profile (`role:user`) + free subscription (`plan:free/active`) ✓; test user cleaned up ✓.

### Next step
Resume Phase 5 (compose up) + Phase 6 (Cloudflare hostnames). Still TODO in Supabase dashboard: URL config (Site URL + redirect URLs), enable Email provider (decide confirm on/off), Google provider (Phase 8), Resend SMTP (Phase 7).

---

## Phase 5 — Local production stack up  ✅ (2026-06-25)

Host prereqs verified: Docker 28.3.3 + compose v2.39.1 (daemon needs `sudo` — user not in `docker` group); OpenClaw v2026.4.15 installed with all agents (orchestrator/researcher/writer/reviewer) + models via Ollama (`qwen3.5:35b`, `glm-5.2:cloud`); Ollama API up; ports 3000/6379 free.

### Env files generated (gitignored, chmod 600)
- `.env.production` (containers) + `.env.worker` (host worker), Supabase values pulled from `database.env`, fresh URL-safe `REDIS_PASSWORD` wired consistently (REDIS_PASSWORD + REDIS_URL@redis:6379 in prod; REDIS_URL@127.0.0.1:6379 in worker).

### Fixes needed to build/run (committed)
1. `Dockerfile`: `npm ci` → `npm ci --include=dev` — base sets `NODE_ENV=production`, which made npm skip devDeps (tailwind/postcss/tsx/typescript) needed by build + worker.
2. `src/server/db.ts`: Prisma client made **lazy** (Proxy) so importing it no longer connects/throws at build time (`docker build` has no DB env). Also fixes `npm run build` without env.
3. **`DIRECT_URL` switched to the IPv4 session pooler** (`...pooler.supabase.com:5432`) — the direct host `db.<ref>.supabase.co:5432` is IPv6-only and unreachable from Docker containers (P1001). Updated in `.env.production` + `database.env`.

### Verification
- `docker compose build` ✅ · `up -d` ✅ — redis healthy, migrate "No pending migrations", web ready.
- `curl /` 200 · `/auth/signin` 200 · `/api/user/plan` 401 (auth path) · `/dashboard` 307→signin (middleware) ✅
- redis-cli ping → PONG with app password ✅
- OpenClaw orchestrator (`--local`) returned exact JSON, model `glm-5.2:cloud` ✅
- Worker: systemd `abmsignal-worker` active, "worker started (concurrency: 1)", no Redis/errors ✅

### Run commands (reference)
- Up: `sudo docker compose --env-file .env.production up -d`
- Rebuild after pull: `sudo docker compose --env-file .env.production build && ... up -d`
- Logs: `sudo docker compose --env-file .env.production logs -f web` · `sudo journalctl -u abmsignal-worker -f`
- Worker restart: `sudo systemctl restart abmsignal-worker`

### Next step
Phase 6 — add public hostnames (`abmsignal.com`, `app.abmsignal.com` → `http://localhost:3000`) to the EXISTING cloudflared tunnel (do not disrupt current remote-access tunnel).

---

## Phase 6 — Cloudflare Tunnel public hostnames  ✅ (2026-06-26)

Existing tunnel reused: **`openclaw-spark`** (ID `3f751820-…cf51`), remotely-managed (token), runs as systemd `cloudflared`. Also serves the owner's private network (WARP CIDR `192.168.1.0/24`, `spark/ssh.nilumagents.com`) — left untouched.

### Gotchas hit + resolved (record for future)
1. **Private vs Public hostname:** first attempt added `abmsignal.com`/`app.abmsignal.com` as **Private hostnames** (WARP-only) → not publicly resolvable. Fix: add them as **Public Hostnames** on the tunnel (creates public DNS CNAME → `<tunnelid>.cfargotunnel.com` + ingress).
2. **Wrong-zone DNS:** `cloudflared tunnel route dns openclaw-spark abmsignal.com` created junk records in the **nilumagents.com** zone (the host's `~/.cloudflared/cert.pem` is scoped to nilumagents.com, not abmsignal.com). Deleted via dashboard. → Don't use `route dns` here; the dashboard Public Hostname handles DNS.
3. **HTTPS vs HTTP origin (502):** public hostnames defaulted to service **`https://…:3000`** → `tls: first record does not look like a TLS handshake` (Next.js serves plain HTTP). Fix: Service **Type = HTTP**, URL **`127.0.0.1:3000`** (IPv4 explicit; app binds IPv4 loopback only).
4. **Host stale DNS:** the DGX's own resolver still serves a negative cache for the new names (so local `curl` fails with "could not resolve") — cosmetic; public works. Verified via `curl --resolve <host>:443:<edge-ip>`.

### Verification (via Cloudflare edge)
- `abmsignal.com` 200 · `app.abmsignal.com` 200 · `/dashboard` 307→`/auth/signin` (HTTPS) · `/auth/signin` 200 · `/api/user/plan` 401 · valid edge TLS cert ✅
- No public inbound ports on the host; only cloudflared egress.

### Next step
Phase 7 (Resend email via Supabase SMTP — needed for magic-link login + password reset), Phase 8 (Google OAuth in Supabase), Phase 9 (Lemon Squeezy). Also: set Supabase **Site URL + redirect URLs** (`https://app.abmsignal.com/auth/callback` + `/auth/confirm`); create admin user (`npm run admin:create`); do a real browser signup/login test at https://app.abmsignal.com.

---

## Auth flow → magic-link only  ✅ (2026-06-26)

User decision: customer auth = **magic link (primary) + Google (Phase 8)**; **passwords removed** from the customer journey. Admin portal (`/admin/login`) **kept on password** (internal operator login).

### Why / what changed
- Original email+password signup hit Supabase's default hosted-verify link (implicit flow) → redirected to `/#error=...` (no session) + `otp_expired` (one-time link consumed/old email).
- Switched to magic link via `signInWithOtp` (shouldCreateUser=true → unifies signin+signup).
- **No Supabase email-template editing required** (free tier allows it anyway): set `emailRedirectTo` to **`/auth/callback`** so the STOCK email link (ConfirmationURL → verify → `/auth/callback?code=…`) is exchanged by our existing callback route (PKCE). `/auth/confirm` (token_hash) is also still present for an optional cross-device template tweak later.
- Files: rewrote `auth/signin` + `auth/signup` (magic-link + Google button, "check your email" state); **deleted** `auth/forgot-password`. tsc + docker build clean; redeployed web.

### Required Supabase settings (no templates)
- Auth → URL Configuration: Site URL `https://app.abmsignal.com`; Redirect URLs incl. `https://app.abmsignal.com/auth/callback`.
- Auth → Providers → Email enabled.

### Caveat (by design)
Stock-email/PKCE works when the link is opened on the **same browser/device** that requested it. Cross-device magic links need the optional `token_hash` template edit (→ `/auth/confirm`). **Google OAuth (Phase 8)** is the better mobile path.

### Resume-after-leave (user Q)
Confirmed feasible with magic-link: generation is async (worker+DB), decoupled from the browser session; Supabase sessions persist long-term (default no timeout); state is keyed to user ID, so users return to the exact stage. Login method is irrelevant to this.

### Verification
Local + public edge: `/auth/signin` 200 (magic-link UI). **User confirmed real e2e login → reached dashboard ✅.**

### Next step
Commit magic-link changes; await user's broader e2e test outcome; then Phase 7 (Resend SMTP).

---

## Agentic runtime fixes (generation + URL mode)  ✅ (2026-06-27)

Two bugs from the SQLite→Postgres move + the container/host split, both now fixed & verified.

### 1. Playbook generation never dispatched (P2010)
- `playbook-repository.ts` `claimRuntimeSlot` raw SQL used SQLite `?` placeholders → Postgres `syntax error at or near ","` → `startGeneration` threw → no run, no job (playbook stuck at `draft`).
- Fix: numbered `$1,$2…` placeholders (built via a `bind()` helper preserving order).
- Verified: dispatched "PeopleSocial" → research run **succeeded in ~1m45s**, **8 real Fortude contacts** discovered, status → `contact_review` 60%. (OpenClaw model glm-5.2:cloud.)

### 2. URL mode returned meta-only (no AI)
- `analyze-url` execed the OpenClaw CLI **inside the web container** (no binary there) → silently fell back to meta tags.
- Fix: route the AI step to the **host worker**. New `src/server/agent/url-analyzer.ts` (`analyzePageContent` via `openclaw product-analyst --local`); new `url-analysis` BullMQ queue (`queue.ts`); second Worker in `worker-process.ts`; `analyze-url` route now fetches HTML + enqueues page text + polls for the result (95s), keeping the meta fallback.
- Verified: `POST /api/analyze-url` (stripe.com) → HTTP 200, `source:"ai"`, real product brief in ~34s.

### Files
- `src/server/playbooks/playbook-repository.ts` (raw SQL fix — ALSO contains pre-existing user WIP), `src/server/jobs/queue.ts`, `src/server/jobs/worker-process.ts`, `src/app/api/analyze-url/route.ts`, NEW `src/server/agent/url-analyzer.ts`.
- Rebuilt web image + restarted host worker.

### Commit note
The generation fix sits in `playbook-repository.ts`, one of the 4 pre-existing WIP files — can't be committed file-isolated from that WIP. URL-mode files are independent/clean.

### Next step
Decide commit handling for the WIP files; user runs full contact-review → writing test; then Phase 7 (Resend SMTP).

---

## Phase 7 — Resend SMTP + cross-device magic links  ✅ (2026-06-30)

- Supabase **gates email-template editing behind custom SMTP** (free-tier built-in email = read-only templates). So Resend was a prerequisite for the token_hash fix, not just deliverability.
- Cloudflare has **no outbound SMTP** (Email Routing = receive-only; Workers+MailChannels free tier discontinued 2024) → used **Resend**.
- Sending domain **`notify.abmsignal.com`** (region ap-northeast-1), sender `noreply@notify.abmsignal.com`.
- DNS in Cloudflare (verified live via dig): MX `send.notify`→feedback-smtp.ap-northeast-1.amazonses.com; SPF TXT `send.notify`; DKIM TXT `resend._domainkey.notify`. (DMARC optional, not set.)
- Supabase custom SMTP: host `smtp.resend.com`, port 465, user `resend`, pass = Resend API key, sender `noreply@notify.abmsignal.com`.
- Template editing unlocked → **Magic link** template link changed to `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=email` → `/auth/confirm` verifies server-side (PKCE-free) → **cross-device magic links now work** (verified on mobile).

### Loose ends — CLOSED (2026-06-30)
- **Full pipeline verified end-to-end**: a playbook (TracEI→Hatton National Bank) reached COMPLETE 100% — 8 contacts confirmed, 18/18 sections (181KB content, 0 empty), 109 sources cited.
- **Generation fix + contact-review WIP committed** (`15da843`): Postgres slot-claim placeholders + manual/edited contacts (with email) at the review checkpoint. Working tree clean.

### Remaining phases
- Phase 8 — Google OAuth (Supabase provider)
- Phase 9 — Lemon Squeezy payments (replace mock; proper state model)
- Phase 10 — Backups (Supabase DB + off-box) · Phase 11 — Monitoring · Phase 12 — Launch checklist

