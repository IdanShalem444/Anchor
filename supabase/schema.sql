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
  created_at timestamptz not null default now()
);

-- For existing projects: add the Canvas columns if they're missing.
alter table public.profiles add column if not exists canvas_base_url text;
alter table public.profiles add column if not exists canvas_token text;

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
