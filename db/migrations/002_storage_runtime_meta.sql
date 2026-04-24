create table if not exists storage_runtime_meta (
  meta_key text primary key,
  meta_value jsonb not null,
  updated_at timestamptz not null default now()
);
