-- S2: demo platform schema in the shared 6x7 Supabase project.
-- Additive only — creates a `demo` schema + `jobs` table. Touches no other app.
-- Apply with the Supabase MCP (apply_migration) or the dashboard SQL editor.

create schema if not exists demo;

create table if not exists demo.jobs (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users on delete cascade,
  target_url  text not null,
  service     text not null default 'video',   -- 'video' | 'screenshots'
  options     jsonb not null default '{}'::jsonb,
  status      text not null default 'queued',   -- queued | rendering | done | error
  cost_cents  int  not null default 0,          -- what the render costs us
  price_cents int  not null default 0,          -- what we charged
  output_url  text,                             -- Supabase storage URL of the result
  error       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists jobs_user_idx on demo.jobs (user_id, created_at desc);
create index if not exists jobs_status_idx on demo.jobs (status) where status in ('queued', 'rendering');

-- Each user sees only their own jobs.
alter table demo.jobs enable row level security;

drop policy if exists "own jobs" on demo.jobs;
create policy "own jobs" on demo.jobs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- The render worker uses the service_role key (bypasses RLS) to claim queued
-- jobs and write results, so no extra policy is needed for it.

-- NOTE: to read/write demo.jobs via the REST API (PostgREST), add `demo` to the
-- project's exposed schemas: Dashboard → Settings → API → Exposed schemas,
-- or set db.schemas in config. The worker (service_role over the DB) does not
-- need this; only client/REST access does.
