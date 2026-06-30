-- ───────────────────────────────────────────────────────────────
-- Anchor — Supabase schema
-- Run this in the Supabase SQL editor (Dashboard → SQL → New query).
-- ───────────────────────────────────────────────────────────────

-- Profiles: one row per auth user (name, plan, avatar, settings)
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  name text,
  avatar_url text,
  plan text not null default 'free',
  settings jsonb not null default
    '{"notifications":true,"weekStart":"monday","reduceMotion":false}'::jsonb,
  canvas_base_url text,
  canvas_token text,
  canvas_connected_at timestamptz,
  created_at timestamptz not null default now()
);

-- For existing projects: add the Canvas columns if they're missing.
alter table public.profiles add column if not exists canvas_base_url text;
alter table public.profiles add column if not exists canvas_token text;
alter table public.profiles add column if not exists canvas_connected_at timestamptz;

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own" on public.profiles
  for select using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own" on public.profiles
  for insert with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- Workspaces: one JSONB document per user holding ALL Anchor data
-- (subjects, assessments, flashcards, tests, notes, projects, …)
create table if not exists public.workspaces (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

alter table public.workspaces enable row level security;

drop policy if exists "workspaces_select_own" on public.workspaces;
create policy "workspaces_select_own" on public.workspaces
  for select using (auth.uid() = user_id);

drop policy if exists "workspaces_insert_own" on public.workspaces;
create policy "workspaces_insert_own" on public.workspaces
  for insert with check (auth.uid() = user_id);

drop policy if exists "workspaces_update_own" on public.workspaces;
create policy "workspaces_update_own" on public.workspaces
  for update using (auth.uid() = user_id);

-- Grant table privileges to signed-in users (RLS still restricts to own rows).
-- Required in addition to the policies above, or queries return 42501.
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.profiles to authenticated;
grant select, insert, update, delete on public.workspaces to authenticated;

-- Auto-provision a profile + empty workspace when a user signs up
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;

  insert into public.workspaces (user_id, data)
  values (new.id, '{}'::jsonb)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ───────────────────────────────────────────────────────────────
-- Plans & billing — server-authoritative plan + metered AI usage
-- ───────────────────────────────────────────────────────────────

-- Billing columns on profiles (idempotent for existing projects).
alter table public.profiles add column if not exists stripe_customer_id text;
alter table public.profiles add column if not exists stripe_subscription_id text;
alter table public.profiles add column if not exists plan_status text not null default 'active';
alter table public.profiles add column if not exists plan_renews_at timestamptz;

-- Lock the plan: clients may edit their own profile (name/avatar/settings/
-- canvas) but CANNOT change plan or billing fields. Only the service role
-- (Stripe webhook) or our SECURITY DEFINER functions (which set the
-- transaction-local 'app.plan_write' flag) may. This closes the
-- "click Switch to Pro and you're Pro" hole at the database level.
create or replace function public.prevent_plan_self_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role'
     and coalesce(current_setting('app.plan_write', true), '') <> 'on' then
    new.plan := old.plan;
    new.plan_status := old.plan_status;
    new.stripe_customer_id := old.stripe_customer_id;
    new.stripe_subscription_id := old.stripe_subscription_id;
    new.plan_renews_at := old.plan_renews_at;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_plan_self_change on public.profiles;
create trigger trg_prevent_plan_self_change
  before update on public.profiles
  for each row execute function public.prevent_plan_self_change();

-- Monthly AI usage counters. One row per user per 'YYYY-MM' period (UTC).
-- Clients may READ their own counter (for the usage meter) but never write it
-- — only consume_ai_credit() mutates it.
create table if not exists public.usage_counters (
  user_id uuid not null references auth.users (id) on delete cascade,
  period text not null,                       -- 'YYYY-MM' (UTC)
  ai_generations int not null default 0,
  updated_at timestamptz not null default now(),
  primary key (user_id, period)
);

alter table public.usage_counters enable row level security;

drop policy if exists "usage_select_own" on public.usage_counters;
create policy "usage_select_own" on public.usage_counters
  for select using (auth.uid() = user_id);
-- Deliberately NO insert/update/delete policies: writes go only through the
-- SECURITY DEFINER function below.

grant usage on schema public to authenticated;
grant select on public.usage_counters to authenticated;

-- Atomic "check the cap, then increment" for one AI generation. Returns
-- {allowed, used, limit}. When already at the cap it returns allowed=false
-- WITHOUT incrementing, so a blocked request is never billed.
create or replace function public.consume_ai_credit(p_limit int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_period text := to_char((now() at time zone 'utc'), 'YYYY-MM');
  v_used int;
begin
  if v_user is null then
    return jsonb_build_object('allowed', false, 'used', 0, 'limit', p_limit);
  end if;

  insert into public.usage_counters (user_id, period)
  values (v_user, v_period)
  on conflict (user_id, period) do nothing;

  update public.usage_counters
     set ai_generations = ai_generations + 1, updated_at = now()
   where user_id = v_user and period = v_period and ai_generations < p_limit
  returning ai_generations into v_used;

  if v_used is null then
    select ai_generations into v_used
      from public.usage_counters
     where user_id = v_user and period = v_period;
    return jsonb_build_object('allowed', false, 'used', coalesce(v_used, p_limit), 'limit', p_limit);
  end if;

  return jsonb_build_object('allowed', true, 'used', v_used, 'limit', p_limit);
end;
$$;

grant execute on function public.consume_ai_credit(int) to authenticated;

-- Promo / friend access codes. Clients have NO direct access (RLS on, no
-- policies, no grants); redeem_code() is the only path in.
create table if not exists public.redemption_codes (
  code text primary key,
  plan text not null default 'pro',
  max_uses int not null default 1,
  uses int not null default 0,
  expires_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.redemption_codes enable row level security;
-- No policies, no grants → only the SECURITY DEFINER function can touch this.

-- Redeem a code for the calling user. Validates existence / expiry / uses,
-- then upgrades the caller's plan and bumps the code's use count.
create or replace function public.redeem_code(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user uuid := auth.uid();
  v_code public.redemption_codes;
begin
  if v_user is null then
    return jsonb_build_object('ok', false, 'error', 'Please sign in first.');
  end if;

  select * into v_code from public.redemption_codes
    where code = lower(trim(p_code)) for update;

  if v_code.code is null then
    return jsonb_build_object('ok', false, 'error', 'Invalid code.');
  end if;
  if v_code.expires_at is not null and v_code.expires_at < now() then
    return jsonb_build_object('ok', false, 'error', 'This code has expired.');
  end if;
  if v_code.uses >= v_code.max_uses then
    return jsonb_build_object('ok', false, 'error', 'This code has already been used.');
  end if;

  perform set_config('app.plan_write', 'on', true);
  update public.profiles set plan = v_code.plan, plan_status = 'active' where id = v_user;
  update public.redemption_codes set uses = uses + 1 where code = v_code.code;

  return jsonb_build_object('ok', true, 'plan', v_code.plan);
end;
$$;

grant execute on function public.redeem_code(text) to authenticated;

-- Some Supabase projects do NOT auto-grant the service_role broad table
-- access. The Stripe webhook updates `profiles` as the service_role, so grant
-- it explicitly — otherwise the webhook gets a 403 and silently fails to
-- upgrade paying users.
grant select, insert, update, delete on public.profiles to service_role;
grant select, insert, update, delete on public.usage_counters to service_role;
grant select, insert, update, delete on public.redemption_codes to service_role;
grant select, insert, update, delete on public.workspaces to service_role;

-- Example: seed a single-use Pro code (run manually, edit as needed):
--   insert into public.redemption_codes (code, plan, max_uses)
--   values ('anchor-launch', 'pro', 50);
