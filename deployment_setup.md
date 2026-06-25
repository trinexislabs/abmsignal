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

