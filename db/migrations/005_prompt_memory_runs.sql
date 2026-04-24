create table if not exists prompt_memory_runs (
  run_id text primary key,
  persona_id text not null,
  generated_at timestamptz not null default now(),
  report_json jsonb not null,
  report_markdown text not null,
  payload jsonb not null default '{}'::jsonb
);

create index if not exists idx_prompt_memory_runs_persona_id on prompt_memory_runs (persona_id);
create index if not exists idx_prompt_memory_runs_generated_at on prompt_memory_runs (generated_at desc);
