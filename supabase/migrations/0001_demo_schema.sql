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

-- The app talks to demo.jobs through these SECURITY DEFINER functions in the
-- already-exposed `public` schema, so we DON'T need to expose `demo` over REST.
-- They run as the definer but key off auth.uid(), so a user only ever creates /
-- sees their own rows.

create or replace function public.demo_create_job(
  p_target_url text,
  p_service    text,
  p_options    jsonb,
  p_cost_cents int,
  p_price_cents int
) returns jsonb
language plpgsql
security definer
set search_path = public, demo
as $$
declare j demo.jobs;
begin
  if auth.uid() is null then
    raise exception 'authentication required' using errcode = '28000';
  end if;
  insert into demo.jobs (user_id, target_url, service, options, cost_cents, price_cents)
  values (auth.uid(), p_target_url, p_service,
          coalesce(p_options, '{}'::jsonb),
          coalesce(p_cost_cents, 0), coalesce(p_price_cents, 0))
  returning * into j;
  return to_jsonb(j);
end;
$$;

create or replace function public.demo_my_jobs()
returns jsonb
language sql
security definer
set search_path = public, demo
stable
as $$
  select coalesce(jsonb_agg(to_jsonb(j) order by j.created_at desc), '[]'::jsonb)
  from demo.jobs j
  where j.user_id = auth.uid();
$$;

revoke execute on function public.demo_create_job(text, text, jsonb, int, int) from anon, public;
revoke execute on function public.demo_my_jobs() from anon, public;
grant execute on function public.demo_create_job(text, text, jsonb, int, int) to authenticated;
grant execute on function public.demo_my_jobs() to authenticated;
