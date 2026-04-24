# Storage migration scaffold

This app now uses a storage adapter boundary in `storage/index.js`.

## Current runtime

- Default driver: `file`
- Switch via: `STORAGE_DRIVER=file|postgres`
- Today, only the file driver is live.
- The `postgres` option is intentionally scaffold-only and throws until a real SQL adapter is implemented.

## First relational entities

The initial SQL scaffold covers:

- `personas`
- `sales_sessions`

Both tables store the full entity payload in `jsonb` so the app can migrate incrementally before normalizing columns further.
