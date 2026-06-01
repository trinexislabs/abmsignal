# ABMSignal — Production Deployment Guide

A complete, step‑by‑step DevOps runbook for shipping ABMSignal to production:
**Dockerize every component → push to GitHub → deploy on DigitalOcean**, plus the
production‑only services you must wire up (payments, email, OAuth, TLS, backups).

> **Audience:** the engineer doing the deploy. Commands assume a Linux/macOS shell
> locally and an Ubuntu 24.04 droplet on DigitalOcean.

---

## 0. Architecture at a glance

ABMSignal is a frontend + API layer plus an async generation pipeline. The AI agent
swarm (OpenClaw) is a **separate, external deployment** and is *not* dockerized here —
you point at it via environment variables.

```
                          ┌─────────────────────────── DigitalOcean Droplet ───────────────────────────┐
   Internet  ──HTTPS──▶   │  caddy (80/443, auto‑TLS)                                                   │
                          │      │ reverse_proxy                                                         │
                          │      ▼                                                                       │
                          │   web  ── Next.js app (API routes, SSR, dashboard)  ──┐                      │
                          │      │                                                 │ enqueue jobs        │
                          │      ▼                                                 ▼                      │
                          │   redis  ◀── BullMQ queue ──▶  worker (tsx worker-process)                   │
                          │      ▲                                 │ calls out                            │
                          │      │                                 ▼                                      │
                          │   appdata volume (libsql/SQLite DB, shared by web + worker)                  │
                          └──────────────────────────────────────┼───────────────────────────────────┘
                                                                  │ HTTPS
                                                                  ▼
                                          External OpenClaw / engine‑runner cluster (AWS)
                                          (Orchestrator · Researcher · Writer · Reviewer)
```

**Components you run (all dockerized):**

| Service   | Image / command                              | Role |
|-----------|----------------------------------------------|------|
| `caddy`   | `caddy:2-alpine`                             | TLS termination + reverse proxy, auto Let's Encrypt certs |
| `web`     | `abmsignal:latest` → `npm run start`         | Next.js 15 server (UI + API routes) |
| `worker`  | `abmsignal:latest` → `tsx worker-process.ts` | BullMQ consumer that runs the generation pipeline |
| `redis`   | `redis:7-alpine`                             | Job queue broker (BullMQ) |
| `migrate` | `abmsignal:latest` → `prisma migrate deploy` | One‑shot DB migration before web/worker boot |

**External dependencies (managed services / SaaS):** Stripe, Resend, Google OAuth,
your OpenClaw engine cluster, and your DNS provider.

The repository already ships these deploy assets (created for this guide):
`Dockerfile`, `.dockerignore`, `docker-compose.yml`, `Caddyfile`, `.env.production.example`.

---

## 1. Prerequisites

**Local machine**
- Docker + Docker Compose v2 (`docker compose version`)
- Git, and push access to `github.com/trinexislabs/abmsignal`
- The repo cloned locally

**Accounts / services** (set these up in §2 before deploying)
- A **DigitalOcean** account
- A **registered domain** (e.g. `abmsignal.com`) with DNS you control
- **Stripe** account (live mode)
- **Resend** account (for transactional email / magic links)
- **Google Cloud** project (for Google sign‑in)
- Access to your **OpenClaw / engine‑runner** endpoint + API token

---

## 2. Production services to set up (do this first)

These are the "production‑only" pieces that don't exist in local dev. Gather every
value into a scratch file — you'll paste them into `.env.production` in §5.

### 2.1 Domain & DNS
Decide the app hostname, e.g. `app.abmsignal.com`. You'll create an **A record**
pointing it at the droplet's IP in §6 (after the droplet exists).

### 2.2 Stripe (payments) ⚠️ requires code work

> **Important:** the current build ships a **mock** payment flow
> (`src/app/api/payment/mock`). There is **no live Stripe checkout or webhook route yet**.
> Before you can charge real cards you must implement the live integration. This is a
> required production task, not just configuration.

What exists today:
- `src/lib/stripe/client.ts` — server Stripe client + browser loader + a `PLANS` map
  that reads `STRIPE_*_PRICE_ID` env vars.
- A post‑generation paywall UI (`playbook-paywall.tsx`) that currently calls the mock route.

What you must add for production:
1. **Create products & prices** in the Stripe dashboard (live mode) for the one‑off
   ($29) and Growth ($229/mo) plans. Copy each **Price ID** into `STRIPE_*_PRICE_ID`.
2. **Add a Checkout route** — e.g. `src/app/api/payment/checkout/route.ts` that creates
   a `stripe.checkout.sessions.create({...})` (mode `payment` for one‑off, `subscription`
   for Growth) and returns the redirect URL. Point the paywall at it instead of `/api/payment/mock`.
3. **Add a webhook route** — `src/app/api/stripe/webhook/route.ts` that verifies the
   signature with `STRIPE_WEBHOOK_SECRET` and, on `checkout.session.completed` /
   `invoice.paid`, unlocks the playbook / grants credits (mirror the logic in the mock route).
   - Next.js note: read the **raw body** (`await req.text()`) for signature verification,
     and do not let a body parser touch it.
4. **Register the webhook endpoint** in Stripe → Developers → Webhooks:
   `https://app.abmsignal.com/api/stripe/webhook`, then copy the **Signing secret** into
   `STRIPE_WEBHOOK_SECRET`.
5. (Optional) Enable the **Stripe Customer Portal** for self‑serve subscription management.

Values to collect: `STRIPE_SECRET_KEY`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`,
`STRIPE_WEBHOOK_SECRET`, and the `STRIPE_*_PRICE_ID`s.

> If you want to launch with the existing mock flow to validate the funnel, you can —
> just be explicit that no money moves until the live integration above is in place.

### 2.3 Resend (email)
Magic‑link / email sign‑in is wired in `src/auth.ts` via the Resend provider.
1. In Resend, **add and verify your sending domain** (`abmsignal.com`): add the
   **SPF**, **DKIM**, and (recommended) **DMARC** DNS records Resend gives you.
2. Create an **API key** → `RESEND_API_KEY`.
3. Set `EMAIL_FROM` to a verified address, e.g. `ABMSignal <noreply@abmsignal.com>`.

### 2.4 Google OAuth
1. Google Cloud Console → **APIs & Services → Credentials → OAuth client ID** (Web).
2. **Authorized redirect URI:** `https://app.abmsignal.com/api/auth/callback/google`
3. Configure the **OAuth consent screen** and publish it (move out of "Testing" so any
   user can sign in).
4. Collect `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.

### 2.5 Auth secret
Generate a strong secret for session/JWT signing:
```bash
openssl rand -base64 32        # → AUTH_SECRET
```
Set `AUTH_URL=https://app.abmsignal.com` and `AUTH_TRUST_HOST=true` (required when running
behind the Caddy reverse proxy).

### 2.6 AI engine endpoint
From your OpenClaw deployment, collect `ENGINE_RUNNER_URL`, `ENGINE_RUNNER_API_KEY`,
`OPENCLAW_ABMSIGNAL_URL`, `OPENCLAW_ABMSIGNAL_TOKEN`, and confirm `AGENT_TIMEOUT_MS`
(default `1800000` = 30 min). The worker calls this cluster to generate playbooks.

---

## 3. Prepare the repo & push to GitHub

The deploy assets are already in the repo root. Review the placeholders, then commit.

1. **Set your real domain in `Caddyfile`** (replace `app.abmsignal.com`).
2. Confirm `.gitignore` keeps secrets out — `.env*` is already ignored, so
   `.env.production` will never be committed. ✅
3. Commit and push on a branch, then merge to `main`:

```bash
git checkout -b chore/dockerize-deploy
git add Dockerfile .dockerignore docker-compose.yml Caddyfile .env.production.example docs/
git commit -m "Add production Docker stack + deployment guide"
git push -u origin chore/dockerize-deploy
# open a PR, review, merge to main (or push straight to main if you own the repo)
```

> The container build pulls source from your local checkout/CI, not from a baked‑in
> copy — so any branch you deploy from must contain these files.

### 3.1 (Optional) Build & smoke‑test the image locally first
```bash
cp .env.production.example .env.production   # fill in at least DB/REDIS/AUTH for a local run
docker compose build
docker compose up -d
docker compose logs -f web
# visit http://localhost  (Caddy will try to get a cert for the Caddyfile domain;
# for pure local testing, temporarily set the Caddyfile site to `:80`)
docker compose down
```

---

## 4. Provision the DigitalOcean droplet

### 4.1 Create the droplet
- **Type:** Basic / Regular or Premium Intel/AMD.
- **Size:** start at **2 vCPU / 4 GB RAM** (Next build + worker + redis comfortably).
  4 GB is the practical floor for building the image on‑box; 2 GB works only if you
  build elsewhere (CI / registry). Bump to 8 GB if you run high `WORKER_CONCURRENCY`.
- **Image:** Ubuntu 24.04 LTS.
- **Auth:** add your **SSH key** (not password).
- **Region:** closest to your users / your engine cluster.

### 4.2 First login & base hardening
```bash
ssh root@YOUR_DROPLET_IP

# Create a non-root sudo user
adduser deploy
usermod -aG sudo deploy
rsync --archive --chown=deploy:deploy ~/.ssh /home/deploy

# Firewall: allow SSH + HTTP + HTTPS only
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable

# Add swap (protects builds on smaller droplets)
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab

# Automatic security updates (recommended)
apt-get update && apt-get install -y unattended-upgrades
```

Reconnect as the `deploy` user for the rest:
```bash
ssh deploy@YOUR_DROPLET_IP
```

### 4.3 Install Docker Engine + Compose plugin
```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker            # apply group without re-login
docker compose version   # verify Compose v2 is present
```

---

## 5. Deploy the application

### 5.1 Get the code onto the droplet
```bash
cd ~
git clone https://github.com/trinexislabs/abmsignal.git
cd abmsignal
git checkout main
```
> For a private repo, use a **GitHub deploy key** (read‑only SSH key added to the repo's
> Deploy Keys) or a fine‑grained PAT. Avoid putting personal credentials on the server.

### 5.2 Create the production env file
```bash
cp .env.production.example .env.production
nano .env.production         # paste every value gathered in §2
chmod 600 .env.production    # lock down permissions
```

Minimum required to boot: `DATABASE_URL`, `REDIS_PASSWORD`, `REDIS_URL`, `AUTH_SECRET`,
`AUTH_URL`, `NEXT_PUBLIC_APP_URL`. Sign‑in/payments/email need their respective keys.

> Make sure `REDIS_PASSWORD` matches the password embedded in `REDIS_URL`
> (`redis://:THE_PASSWORD@redis:6379`).

### 5.3 Build and start the stack
Compose reads `.env.production` for the `NEXT_PUBLIC_*` **build args** automatically when
you pass it via `--env-file`:

```bash
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
```

Boot order is enforced by `depends_on`: `redis` (healthy) → `migrate` (runs
`prisma migrate deploy`, exits 0) → `web` + `worker` start.

### 5.4 Verify
```bash
docker compose ps                 # all services Up; migrate = Exited (0)
docker compose logs -f migrate    # "All migrations have been applied"
docker compose logs -f worker     # "ABMSignal playbook worker started (concurrency: 3)"
docker compose logs -f web        # Next.js "Ready"
```

---

## 6. DNS + TLS

1. At your DNS provider, create an **A record**:
   `app  →  YOUR_DROPLET_IP` (and optionally `www`/apex as needed).
2. Wait for propagation (`dig app.abmsignal.com +short` should return the droplet IP).
3. Caddy (already running) will automatically obtain and renew a Let's Encrypt
   certificate for the hostname in your `Caddyfile`. Watch it succeed:
   ```bash
   docker compose logs -f caddy   # look for "certificate obtained successfully"
   ```
4. Visit `https://app.abmsignal.com` — you should get the landing page over HTTPS.

> TLS will only succeed once the A record resolves to this droplet and ports 80/443 are
> open (they are, via `ufw` in §4.2). HTTP‑01 challenges need port 80 reachable.

---

## 7. Post‑deploy setup

### 7.1 Create an admin user
There's a script for this:
```bash
docker compose exec web npx tsx scripts/create-admin.ts
# follow prompts (email/password) — grants the `admin` role used by /admin
```
Then sign in at `https://app.abmsignal.com/admin/login`.

### 7.2 Register the Stripe webhook
Once §2.2 code is deployed, add the endpoint in Stripe
(`https://app.abmsignal.com/api/stripe/webhook`), copy the signing secret into
`STRIPE_WEBHOOK_SECRET`, then `docker compose up -d web worker` to reload env.

### 7.3 Smoke test the full funnel
- Sign up (email magic link **and** Google) → confirm emails arrive (check Resend logs).
- Start a playbook → confirm a job appears (`docker compose logs -f worker`) and the
  external engine is reached.
- Reach the paywall → complete a (test or live) payment → confirm the playbook unlocks.
- Export PDF, run the contact review gate, view the admin portal.

---

## 8. Day‑2 operations

### 8.1 Deploying updates (redeploy)
```bash
cd ~/abmsignal
git pull origin main
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d   # recreates only changed services
docker image prune -f                             # reclaim old layers
```
`migrate` re‑runs on each `up` and applies any new migrations before web/worker restart.

> **Zero‑downtime tip:** for true rolling deploys, build images in CI, push to a registry
> (DigitalOcean Container Registry / GHCR), and pull tagged images on the droplet instead
> of building on‑box. See §8.5.

### 8.2 Database backups
The DB is the `appdata` volume (`/data/prod.db`). Back it up with a safe online copy:
```bash
# Consistent backup of a live SQLite/libsql file:
docker compose exec web sh -c \
  'npx --yes @libsql/client >/dev/null 2>&1; sqlite3 /data/prod.db ".backup /data/backup.db"' \
  || docker compose exec web sh -c 'cp /data/prod.db /data/backup-$(date +%F).db'

# Pull it off the droplet:
docker compose cp web:/data/backup.db ./backup-$(date +%F).db
```
Automate with a daily cron on the droplet that copies the volume file to DigitalOcean
Spaces (S3‑compatible). Also enable **DigitalOcean weekly droplet backups** as a safety net.

> If you migrate to **Turso** (§8.4), use Turso's managed backups instead.

### 8.3 Logs & monitoring
```bash
docker compose logs -f --tail=200 web worker
```
Recommended additions for production:
- **Error tracking:** add Sentry (`@sentry/nextjs`) to capture web + worker exceptions.
  The codebase already records failures (`recordPlaybookFailure`) — wire those into Sentry.
- **Uptime:** an external monitor (UptimeRobot / DO Uptime) hitting `https://app.../`.
- **Log shipping:** point Docker's logging driver at a hosted log service, or run
  Grafana Loki / Promtail if you want it self‑hosted.
- **Resource alerts:** enable DigitalOcean Monitoring + alert policies (CPU/RAM/disk).

### 8.4 Scaling

**Scale workers** (more concurrent generations):
```bash
docker compose --env-file .env.production up -d --scale worker=3
```
…and/or raise `WORKER_CONCURRENCY`. BullMQ distributes jobs across all worker replicas.

**Scale the database / go multi‑node:** the default shared SQLite file is fine for a
single droplet, but it serializes writes and can't be shared across hosts. To scale out:
1. Create a database on **Turso** (managed libsql) and copy its `libsql://…?authToken=…` URL.
2. Set `DATABASE_URL` to that URL and remove the `appdata:/data` mounts from web/worker/migrate.
3. Apply migrations against it (Turso shell or `prisma migrate diff` → apply the generated SQL).
This lets you run web/worker on multiple droplets or DigitalOcean App Platform.

**Managed Redis:** swap the `redis` service for a **DigitalOcean Managed Redis** instance
and point `REDIS_URL` at its `rediss://` connection string (the queue code already handles
TLS for `rediss://`).

### 8.5 Build in CI instead of on‑box (optional, recommended at scale)
Add a GitHub Action that, on push to `main`, builds the image (passing the `NEXT_PUBLIC_*`
build args), pushes it to GHCR/DOCR, and SSHes to the droplet to `docker compose pull && up -d`.
This removes build load from the production box and gives you immutable, rollback‑able tags.

---

## 9. Security checklist

- [ ] `.env.production` is `chmod 600` and never committed (it's git‑ignored).
- [ ] `AUTH_SECRET` is a fresh 32‑byte random value; `AUTH_TRUST_HOST=true` behind Caddy.
- [ ] `ufw` allows only 22/80/443; root SSH login disabled / key‑only auth.
- [ ] Redis is password‑protected (`requirepass`) and **not** published to the host
      (compose `expose`s it on the internal network only — no `ports:`). ✅
- [ ] Stripe **live** keys + verified webhook signing secret; raw‑body signature check.
- [ ] Resend domain verified (SPF/DKIM/DMARC) to avoid spam folders.
- [ ] HSTS + `X-Content-Type-Options` headers served (Caddyfile + `next.config.ts`). ✅
- [ ] Automatic OS security updates enabled; Docker images periodically rebuilt for CVEs.
- [ ] Database backups running and **restore‑tested**.

---

## 10. Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| Build OOM‑killed | Small droplet. Add swap (§4.2), use ≥4 GB, or build in CI (§8.5). |
| `web` up but Stripe publishable key undefined in browser | `NEXT_PUBLIC_*` weren't passed as **build args**. Rebuild with `--env-file .env.production` so compose injects `build.args`. |
| `migrate` exits non‑zero | Check `DATABASE_URL`. For `file:` it must be writable on the `appdata` volume; logs show the Prisma error. |
| Worker logs "Redis … ECONNREFUSED" / falls back | `REDIS_URL` password mismatch with `REDIS_PASSWORD`, or redis not healthy yet. |
| Google sign‑in `redirect_uri_mismatch` | Redirect URI in Google Console must be exactly `https://<domain>/api/auth/callback/google`. |
| Magic‑link emails not arriving | Resend domain not verified, or `EMAIL_FROM` not on a verified domain. Check Resend dashboard logs. |
| TLS cert not issued | A record not pointing at the droplet yet, or port 80 blocked. Confirm `dig` + `ufw`. |
| Sessions drop / CSRF errors | Missing `AUTH_URL` / `AUTH_TRUST_HOST=true` behind the proxy. |
| Live progress (SSE) stalls | Ensure the Caddy `flush_interval -1` block matches your streaming routes. |

Useful commands:
```bash
docker compose ps
docker compose logs -f <service>
docker compose exec web sh          # shell into the web container
docker compose restart web worker   # reload after editing .env.production
docker compose down                 # stop everything (volumes persist)
```

---

## 11. Production readiness checklist (TL;DR)

1. [ ] §2 services provisioned; all values collected.
2. [ ] **Live Stripe checkout + webhook routes implemented** (replaces the mock flow).
3. [ ] Resend domain verified; Google OAuth redirect + consent published.
4. [ ] Deploy assets committed and pushed to `main`.
5. [ ] Droplet hardened (non‑root user, `ufw`, swap, Docker installed).
6. [ ] `.env.production` filled in and `chmod 600`.
7. [ ] `docker compose build && up -d`; `migrate` exited 0; web + worker healthy.
8. [ ] DNS A record set; HTTPS cert issued by Caddy.
9. [ ] Admin user created; full funnel smoke‑tested (auth → generate → pay → view).
10. [ ] Backups scheduled; monitoring + error tracking enabled.

---

## Appendix A — Environment variable reference

| Variable | Used by | Notes |
|---|---|---|
| `NODE_ENV` | all | `production` |
| `NEXT_PUBLIC_APP_URL` | web (build+run) | Public base URL; **build‑time** inlined |
| `DATABASE_URL` | web, worker, migrate | `file:/data/prod.db` (default) or `libsql://…` (Turso) |
| `REDIS_URL` | web, worker | `redis://:PASS@redis:6379` (or `rediss://` for TLS) |
| `REDIS_PASSWORD` | redis | Must match the password in `REDIS_URL` |
| `WORKER_CONCURRENCY` | worker | Concurrent jobs per worker (default 3) |
| `AUTH_SECRET` | web | `openssl rand -base64 32` |
| `AUTH_URL` | web | `https://<domain>` |
| `AUTH_TRUST_HOST` | web | `true` behind reverse proxy |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | web | Google OAuth |
| `RESEND_API_KEY` | web | Email / magic links |
| `EMAIL_FROM` | web | Verified sender address |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | web (build+run) | **Build‑time** inlined |
| `STRIPE_SECRET_KEY` | web | Server Stripe client |
| `STRIPE_WEBHOOK_SECRET` | web | Webhook signature verification |
| `STRIPE_*_PRICE_ID` | web | Plan price IDs (`PLANS` map) |
| `ENGINE_RUNNER_URL` / `ENGINE_RUNNER_API_KEY` | worker | External AI engine |
| `OPENCLAW_ABMSIGNAL_URL` / `OPENCLAW_ABMSIGNAL_TOKEN` | worker | OpenClaw endpoint |
| `AGENT_TIMEOUT_MS` | worker | Per‑agent timeout (default 1800000) |
| `NEXT_PUBLIC_SUPABASE_*` / `SUPABASE_SERVICE_ROLE_KEY` | web | Optional/legacy — only if using Supabase storage |

---

## Appendix B — Files added for deployment

| File | Purpose |
|---|---|
| `Dockerfile` | Multi‑stage build; one image reused for web/worker/migrate |
| `.dockerignore` | Keeps secrets, `node_modules`, build artifacts out of the build context |
| `docker-compose.yml` | The full stack (caddy, web, worker, redis, migrate) |
| `Caddyfile` | Reverse proxy + automatic HTTPS (edit the domain!) |
| `.env.production.example` | Template for `.env.production` (never commit the real file) |
| `docs/DEPLOYMENT_GUIDE.md` | This guide |
| `docs/DEPLOYMENT_GUIDE.html` | Rendered HTML version of this guide |

---

*Generated for the ABMSignal platform. Keep this guide updated as the architecture
evolves (especially once the live Stripe integration lands).*
