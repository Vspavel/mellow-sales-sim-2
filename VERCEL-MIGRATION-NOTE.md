# Vercel migration note

## What blocks Vercel today

1. Runtime persistence is file-based (`data/*.json`, `data/sessions/*.json`, `data/artifacts/*.json`, `data/logs/*`). Vercel functions are stateless and local disk is ephemeral, so writes are not durable.
2. The app is a single long-lived Express server (`server.js`) designed for `app.listen(...)`, not a clean serverless entrypoint.
3. Analytics, history, exports, personas, hint memory, tuning, and artifact generation all read/write local files, so they would break or become inconsistent across invocations.
4. GitHub/Vercel deployment scaffolding was missing.

## Target Vercel-compatible architecture

- Frontend: static assets from `public/` served by Vercel.
- API: Node serverless function wrapping the Express app.
- Persistence: move all durable state from local JSON files to a hosted database.
- Recommended DB model: Vercel Postgres (or Supabase Postgres) with Blob/Object storage only if large artifact exports need file storage later.
- Initial DB tables:
  - `personas`
  - `sessions`
  - `session_messages`
  - `artifacts`
  - `hint_memory`
  - `hint_recency`
  - optional `sdr_hint_tuning`
- Routing model:
  - `/` and static files from `public/`
  - `/api/*` via serverless function
  - `/download/:sessionId` via same API function

## Safe first slice already done

1. `server.js` now exports the Express app and only starts a local listener when run directly.
2. Added `api/index.js` as a Vercel serverless entrypoint.
3. Added `vercel.json` rewrites for `/api/*` and `/download/*`.

## Recommended next implementation slice

1. Introduce a storage adapter layer, so file storage and DB storage are swappable.
2. Migrate writes first for:
   - personas
   - sessions
   - session transcript/messages
3. Then migrate reads for analytics/history/artifacts.
4. Add DB schema + seed migration for built-in personas.
5. Connect GitHub repo, then Vercel project, then add environment variables (`ANTHROPIC_API_KEY`, optional SMTP vars if result email stays enabled).
