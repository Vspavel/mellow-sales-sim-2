# Storage migration scaffold

This app now uses a storage adapter boundary in `storage/index.js`.

## Current runtime

- Default driver: `file`
- Switch via: `STORAGE_DRIVER=file|postgres`
- `file` keeps local JSON compatibility.
- `postgres` is now live for personas and sessions.
- Current connection envs supported: `DATABASE_URL`, `POSTGRES_URL`, `POSTGRES_PRISMA_URL`, `POSTGRES_URL_NON_POOLING`
- Optional bootstrap control: `POSTGRES_BOOTSTRAP_FROM_FILE=true|false` (default `true`)

## First relational entities

The current SQL slice covers:

- `personas`
- `sales_sessions`
- `storage_migrations`
- `storage_runtime_meta`

`personas` and `sales_sessions` store the full entity payload in `jsonb` so the app can migrate incrementally before normalizing columns further.

## Bootstrap behavior

- On a fresh Postgres database, the adapter imports `data/personas.json` into `personas`.
- If `sales_sessions` is empty, it imports `data/sessions/*.json`.
- If a specific session is requested and missing in Postgres, the adapter can still import that session on demand from the local JSON file when available.
- Existing Postgres rows are not deleted during bootstrap.

- `prompt_memory_runs` stores generated prompt-memory loop reports so runs no longer depend only on local files.

- Telegram v2 sessions currently reuse the shared session persistence path; remaining Telegram-specific logging should be treated as the last optional tail if needed.
