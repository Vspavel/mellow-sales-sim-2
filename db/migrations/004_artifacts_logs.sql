create table if not exists session_artifacts (
  session_id text primary key,
  payload jsonb not null,
  markdown text not null default '',
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_artifacts_saved_at on session_artifacts (saved_at desc);

create table if not exists session_logs (
  session_id text primary key,
  finished_date date,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_session_logs_finished_date on session_logs (finished_date desc);
