# ABMSignal Deployment Prompt for Claude Code

You are helping me deploy ABMSignal using this chosen MVP deployment option:

**Option A — Home DGX Spark self-host with Cloudflare Tunnel, Resend, and merchant-of-record.**

## Background

ABMSignal is a SaaS product currently designed around a Docker-based production stack.

The deployment architecture is roughly:

- `web` — Next.js app handling frontend, dashboard, API routes, SSR, auth callbacks, admin UI, payment flows, etc.
- `worker` — async worker process consuming BullMQ jobs.
- `redis` — queue broker for BullMQ.
- `migrate` — one-shot database migration service.
- `caddy` or reverse proxy — currently used for TLS/reverse proxy in the original cloud/VPS deployment model.
- database — currently SQLite/libsql-style local database volume, likely `file:/data/prod.db`.
- OpenClaw / engine runner — agentic harness responsible for long-running AI generation work.
- Ollama / model APIs — local or external model runtime called by OpenClaw.

In this new MVP production plan, I want to run everything from my **DGX Spark** as the early production server instead of paying for cloud VMs.

The public app should be exposed through:

```text
Cloudflare DNS + Cloudflare Tunnel
```

I do **not** want to expose my DGX Spark directly using router port forwarding or public inbound ports.

The production service stack should be:

```text
Users
  ↓
Cloudflare DNS / HTTPS / Tunnel
  ↓
DGX Spark
  ↓
Internal reverse proxy / Caddy / app port
  ↓
ABMSignal web + API
  ↓
Redis + worker queue
  ↓
OpenClaw runtime
  ↓
Ollama / model APIs
```

## Objective

Help me deploy ABMSignal step by step using this DGX Spark + Cloudflare Tunnel setup.

I am not an expert in production deployments, Cloudflare, DNS, webhooks, email domain verification, or merchant-of-record setup. Guide me very practically.

Do not jump straight into making major changes. First inspect the repo and understand the current deployment files.

## First task

Start by inspecting the repository and identifying:

1. Current Dockerfile
2. Current docker-compose files
3. Caddyfile or reverse proxy config
4. Environment variable examples
5. Auth implementation
6. Payment implementation
7. Email implementation
8. Worker / BullMQ implementation
9. Database configuration
10. OpenClaw / engine-runner integration
11. Any scripts for migrations, admin user creation, or production setup

Then give me a clear summary of what already exists and what needs to change for the DGX Spark + Cloudflare Tunnel deployment.

## Important constraints

- Lowest possible MVP cost.
- Keep deployment complexity low.
- Keep everything maintainable by a solo founder.
- Prefer Docker Compose over Kubernetes.
- Do not use cloud servers for the first launch.
- Do not expose Redis, SQLite, Ollama, OpenClaw, Docker socket, SSH, or internal dashboards publicly.
- Only expose the public web app hostname, likely:

```text
https://app.abmsignal.com
```

- Cloudflare Tunnel should be the only public ingress path.
- Avoid destructive commands unless I explicitly approve.
- Do not commit secrets.
- Do not print secrets into files unless instructing me to paste them locally.
- Do not assume the production domain until I confirm it.
- Do not assume merchant-of-record provider until I confirm it. Likely options are Paddle or Lemon Squeezy.
- When a step requires action in an external dashboard, give me exact dashboard navigation and what values to copy back.

## Deployment strategy

Guide me in phases.

---

## Phase 1 — Repo and deployment inventory

Inspect the repo and answer:

- Is the app already ready for Docker Compose production deployment?
- Which services are defined?
- Which ports are exposed?
- Does Caddy assume direct public internet access?
- What needs to change when running behind Cloudflare Tunnel?
- Is the database persisted safely?
- Is Redis protected?
- Is the worker configured correctly?
- Are OpenClaw / engine-runner URLs configurable via environment variables?
- Is the current payment flow live or mock?
- Is email auth already wired to Resend?
- Is Google OAuth already wired?

Output a concise readiness checklist.

---

## Phase 2 — Local DGX Spark production architecture

Help me decide the exact local service layout.

Preferred shape:

```text
DGX Spark host
  ├── Docker Compose project: ABMSignal
  │   ├── web
  │   ├── worker
  │   ├── redis
  │   ├── migrate
  │   └── caddy or internal reverse proxy
  │
  ├── OpenClaw runtime
  ├── Ollama / local model runtime
  ├── local database volume
  └── backup folder
```

Tell me whether OpenClaw should be:

1. inside the same Compose file,
2. in a separate Compose project, or
3. run separately as a system service.

Recommend the simplest safe option.

---

## Phase 3 — Environment configuration

Create or update a safe `.env.production.example` for this deployment.

It should include variables such as:

```env
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://app.abmsignal.com
AUTH_URL=https://app.abmsignal.com
AUTH_TRUST_HOST=true
AUTH_SECRET=

DATABASE_URL=file:/data/prod.db

REDIS_PASSWORD=
REDIS_URL=redis://:PASSWORD@redis:6379

WORKER_CONCURRENCY=1

RESEND_API_KEY=
EMAIL_FROM=

GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

ENGINE_RUNNER_URL=
ENGINE_RUNNER_API_KEY=
OPENCLAW_ABMSIGNAL_URL=
OPENCLAW_ABMSIGNAL_TOKEN=
AGENT_TIMEOUT_MS=1800000

MERCHANT_OF_RECORD_PROVIDER=
MOR_API_KEY=
MOR_WEBHOOK_SECRET=
```

Do not create real `.env.production` with fake secrets unless I ask. Instead, give me a command to copy the example and fill it locally.

---

## Phase 4 — Reverse proxy and Cloudflare Tunnel adaptation

The original Caddy setup may assume public ports 80/443 and Let’s Encrypt.

For Cloudflare Tunnel, I likely need Caddy or the app to listen internally, for example:

```text
http://localhost:8080
```

Then Cloudflare Tunnel maps:

```text
app.abmsignal.com → http://localhost:8080
```

Inspect the current Caddyfile and recommend the correct adjustment.

I want the simplest reliable setup:

- Cloudflare handles public HTTPS.
- Local reverse proxy only routes internally.
- No local public port exposure required.
- Streaming/SSE routes should not break if ABMSignal uses live progress.

---

## Phase 5 — Docker Compose production run

Prepare exact commands for DGX Spark:

```bash
cd ~/abmsignal
docker compose --env-file .env.production build
docker compose --env-file .env.production up -d
docker compose ps
docker compose logs -f web worker redis migrate
```

Also include:

- how to restart
- how to rebuild after git pull
- how to check logs
- how to stop safely
- how to verify the database volume
- how to verify worker queue is running
- how to verify OpenClaw connectivity
- how to verify Ollama connectivity

---

## Phase 6 — Cloudflare setup guidance

When we reach this stage, guide me through Cloudflare dashboard setup.

I need instructions for:

1. Adding the domain to Cloudflare
2. Updating nameservers if needed
3. Creating Cloudflare Tunnel
4. Installing `cloudflared` on DGX Spark
5. Connecting DGX Spark to Cloudflare
6. Creating public hostname:

```text
app.abmsignal.com
```

7. Pointing that hostname to local service:

```text
http://localhost:8080
```

8. Running the tunnel as a system service
9. Verifying public HTTPS
10. Confirming no inbound router ports are required

Give me the exact commands when appropriate.

---

## Phase 7 — Resend email setup

Guide me through Resend setup.

I need:

- which sending domain/subdomain to use
- what DNS records Resend needs
- where to add records in Cloudflare DNS
- how to verify SPF, DKIM, DMARC
- what to put in `EMAIL_FROM`
- how to test magic link email delivery
- how to troubleshoot spam or rejected emails

Recommended email identity:

```text
ABMSignal <noreply@notify.abmsignal.com>
```

But ask me before finalizing the subdomain.

---

## Phase 8 — Google OAuth setup

Guide me through Google OAuth production setup.

I need:

- exact Google Cloud Console location
- OAuth consent screen setup
- test mode vs production mode
- authorized redirect URI:

```text
https://app.abmsignal.com/api/auth/callback/google
```

- env variables required
- how to test
- how to fix `redirect_uri_mismatch`
- how to fix cookie/session/CSRF issues behind Cloudflare Tunnel

---

## Phase 9 — Merchant-of-record payment integration

Current payment flow may still be mock. Inspect the code.

If the payment flow is mock, create an implementation plan for merchant-of-record integration.

Likely provider: Paddle or Lemon Squeezy. Ask me to confirm provider before writing provider-specific code.

The payment system must support:

- checkout creation
- success/cancel redirect URLs
- webhook verification
- idempotent webhook handling
- entitlement unlock
- subscription state
- refund/chargeback state if supported
- admin reconciliation view or at least admin logs
- manual unlock fallback for MVP
- payment status refresh endpoint

Important: payment webhook reliability is critical because the app is self-hosted on DGX Spark. If webhook delivery fails because my server is offline, the system should be able to reconcile payment later using provider API.

Do not simply set `paid = true`. Design a proper state model.

Suggested states:

```text
checkout_created
checkout_started
payment_pending
payment_succeeded
payment_failed
subscription_active
subscription_past_due
subscription_cancelled
refunded
chargeback_opened
chargeback_lost
manual_unlock
```

---

## Phase 10 — Backups and production safety

Set up a simple MVP backup plan.

For local SQLite/libsql:

- daily backup command
- backup folder
- retention policy
- off-box backup target

Preferred off-box options:

1. Cloudflare R2
2. Google Drive
3. external NAS
4. other S3-compatible storage

Recommend the simplest version first.

Also prepare:

- restore instructions
- backup verification instructions
- disk space check
- logs cleanup
- container auto-restart
- DGX reboot recovery checklist

---

## Phase 11 — Monitoring

Set up minimum monitoring:

- external uptime monitor for `https://app.abmsignal.com`
- app logs
- worker logs
- failed job logs
- payment webhook logs
- email delivery logs
- disk usage monitoring
- tunnel health check
- OpenClaw/Ollama health endpoint if available

Recommend simple tools first. Avoid complex observability stack unless necessary.

---

## Phase 12 — Launch checklist

Create a final launch checklist covering:

- domain working
- Cloudflare Tunnel running as service
- HTTPS working
- auth working
- email working
- Google OAuth working
- payment test working
- webhook test working
- playbook generation working
- OpenClaw working
- Ollama working
- results returned to UI
- admin user created
- database backup working
- restore tested
- no internal services publicly exposed
- `.env.production` not committed
- logs checked
- restart tested

---

## Documentation requirement

Make sure to create a log file called:

```text
deployment_setup.md
```

Update this file after every successful step with what we exactly did.

This serves two purposes:

1. It becomes a proper deployment document explaining how the deployment is done.
2. It helps us restart from the right point if the session gets disconnected.

The log should include:

- date/time of the step
- phase name
- files inspected
- files changed
- commands run
- external dashboard actions completed
- verification result
- next recommended step

Do not log secrets into this file.

---

## Working style

Work step by step.

At the start of each phase:

1. Tell me the goal.
2. Inspect relevant files.
3. Explain what you found.
4. Recommend the next change.
5. Show the exact commands or code changes.
6. Ask me before applying risky changes.
7. After each change, give me verification commands.
8. Update `deployment_setup.md` after every successful step.

Keep explanations beginner-friendly but technically correct.

Assume I am comfortable running commands, but not deeply experienced with production infrastructure.

Start now with **Phase 1 — Repo and deployment inventory**.
