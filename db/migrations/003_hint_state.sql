create table if not exists hint_memory_records (
  id text primary key,
  session_id text,
  persona_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  payload jsonb not null
);

create index if not exists idx_hint_memory_records_session_id on hint_memory_records (session_id);
create index if not exists idx_hint_memory_records_persona_id on hint_memory_records (persona_id);
create index if not exists idx_hint_memory_records_created_at on hint_memory_records (created_at desc);

create table if not exists hint_state_blobs (
  blob_key text primary key,
  payload jsonb not null,
  updated_at timestamptz not null default now()
);
