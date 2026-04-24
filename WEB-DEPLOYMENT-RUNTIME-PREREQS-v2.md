# Sales Simulator v2, web deployment runtime prerequisites

Date: 2026-04-19
Related issue: MEL-341

## 1. What is real in the current web codebase

Confirmed from `mellow-sales-sim/server.js`, `package.json`, and `README.md`:
- current web runtime is a plain Node.js + Express app
- current web app uses deterministic roleplay and assessment logic
- current web app can optionally call Anthropic when `ANTHROPIC_API_KEY` is set, but still has deterministic fallback logic
- current web app can optionally send result emails when SMTP env vars are configured
- current web app supports `STORAGE_DRIVER=file|postgres`
- Postgres connection envs supported: `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- there is no auth/session secret implemented in the current app
- persona/session persistence can now move off local disk into Postgres while other artifacts remain file-backed

So for the **current shipped web build**, required env depends on the storage/runtime mode you deploy.

## 2. What is explicitly **not** required for the web path

Because MEL-341 supersedes the earlier Telegram framing:
- no Telegram bot tokens
- no per-persona bot credentials
- no Telegram webhook setup

## 3. Missing prerequisites if MEL-331 v2 scope is enforced literally

MEL-331 adds two capabilities that the current web codebase does not yet implement but would require runtime configuration:

### A. Evaluator / agent-driven post-run analysis
If post-run evaluation must be LLM-backed rather than deterministic, choose and wire exactly one model provider.

Required secret:
- `OPENAI_API_KEY` or equivalent single chosen provider key

Decision still needed:
- provider choice for persona/evaluator runtime
- whether one provider is used for both roleplay and evaluation, or only for evaluation

### B. Result delivery outside the browser session
If results must be emailed or otherwise pushed after a run, add one delivery channel.

Minimum required secrets for email delivery:
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_SECURE`
- `SMTP_USER`
- `SMTP_PASS`
- `SMTP_FROM`
- destination rule such as `RESULT_EMAIL` or per-user recipient mapping

Important note:
- these mail variables are now wired into the active web app

## 4. Hosting/runtime items still missing for a real web-v2 deployment

If the product stays as the current deterministic web app, hosting needs are light:
- Node runtime
- public URL / reverse proxy
- writable storage for file mode, or hosted Postgres for `STORAGE_DRIVER=postgres`
- process supervision (systemd, pm2, container runtime, etc.)

If the product becomes true MEL-331 web v2, add these runtime items explicitly:
- one chosen LLM API key
- one chosen outbound result-delivery path (SMTP or another approved provider)
- persistent writable storage for session transcripts/results
- explicit retention policy for stored run data

## 5. Recommendation

Treat the dependency surface like this:

### Required now to keep the current web app live
- `PORT`
- host-level deployment config
- either writable app data directory for file mode or Postgres connection env for postgres mode

### Required now for Vercel-style durable deployment
- `STORAGE_DRIVER=postgres`
- one of `DATABASE_URL` / `POSTGRES_URL` / `POSTGRES_PRISMA_URL` / `POSTGRES_URL_NON_POOLING`
- optional `POSTGRES_BOOTSTRAP_FROM_FILE=true|false`

### Required before claiming full MEL-331 web-v2 readiness
- one chosen LLM provider key
- one chosen result-delivery configuration
- explicit storage/retention decision for run outputs

## 6. Bottom line

The current web deployment has **no unresolved secret dependency** except normal hosting.

The unresolved prerequisites belong to the **next v2 capability layer**, not the current deployed build:
1. model/API credential for evaluator or LLM persona runtime
2. mail/delivery credentials for post-run result delivery
3. storage/retention decision for persisted transcripts and results
