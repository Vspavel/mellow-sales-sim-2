CREATE TABLE IF NOT EXISTS storage_kv (
  key text PRIMARY KEY,
  payload jsonb NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS session_artifacts (
  session_id text PRIMARY KEY,
  payload jsonb NOT NULL,
  markdown text NOT NULL DEFAULT '',
  saved_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_artifacts_saved_at
  ON session_artifacts (saved_at DESC);

CREATE TABLE IF NOT EXISTS session_logs (
  session_id text PRIMARY KEY,
  finished_date date,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_session_logs_finished_date
  ON session_logs (finished_date DESC);

CREATE TABLE IF NOT EXISTS prompt_memory_runs (
  run_id text PRIMARY KEY,
  persona_id text,
  generated_at timestamptz,
  cycle_count integer NOT NULL DEFAULT 0,
  memory_record_count integer NOT NULL DEFAULT 0,
  payload jsonb NOT NULL,
  markdown text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_prompt_memory_runs_generated_at
  ON prompt_memory_runs (generated_at DESC);

CREATE INDEX IF NOT EXISTS idx_prompt_memory_runs_persona_id
  ON prompt_memory_runs (persona_id);
