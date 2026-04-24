-- MEL-1094 storage migration scaffold
-- Initial relational tables for personas and sessions.

create table if not exists personas (
  id text primary key,
  name text not null,
  role text not null,
  archetype text not null,
  tone text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists sales_sessions (
  session_id text primary key,
  persona_id text not null,
  status text not null,
  started_at timestamptz,
  finished_at timestamptz,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint sales_sessions_persona_fk
    foreign key (persona_id)
    references personas (id)
    on delete restrict
);

create index if not exists idx_sales_sessions_persona_id on sales_sessions (persona_id);
create index if not exists idx_sales_sessions_status on sales_sessions (status);
create index if not exists idx_sales_sessions_finished_at on sales_sessions (finished_at desc);
