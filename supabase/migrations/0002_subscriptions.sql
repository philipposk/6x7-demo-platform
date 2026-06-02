-- Shared billing table for the whole 6x7 platform (not just demo).
-- Hybrid entitlement: a row per (user_id, app); app='global' means all-access.
-- A user is entitled for app X if they have an ACTIVE row for app=X OR app='global'.
--
-- Written ONLY by the Stripe webhook (service-role). Users can read their own
-- rows, so any subdomain app checks entitlement directly with the user session.

create table if not exists public.subscriptions (
  user_id                uuid not null references auth.users(id) on delete cascade,
  app                    text not null default 'global',   -- 'global' | 'demo' | 'school' | ...
  plan                   text not null default 'free',      -- 'free' | 'pro' | tier slug
  status                 text not null default 'inactive',  -- active | trialing | past_due | canceled | inactive
  stripe_customer_id     text,
  stripe_subscription_id text,
  current_period_end     timestamptz,
  updated_at             timestamptz not null default now(),
  primary key (user_id, app)
);

create index if not exists subs_stripe_sub_idx  on public.subscriptions (stripe_subscription_id);
create index if not exists subs_stripe_cust_idx on public.subscriptions (stripe_customer_id);

alter table public.subscriptions enable row level security;

-- Read-own only. No client write policy → only the service-role webhook writes.
drop policy if exists "read own subscription" on public.subscriptions;
create policy "read own subscription" on public.subscriptions
  for select using (user_id = auth.uid());
