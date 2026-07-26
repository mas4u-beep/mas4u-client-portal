-- ============================================================================
-- Mas4U — Supabase one-time setup
-- ============================================================================
-- Run this ONCE in your Supabase project:
--   Supabase Dashboard  →  SQL Editor  →  New query  →  paste all of this  →  Run
--
-- It creates a single shared "app_state" row that holds the whole application
-- database as JSON, so every user in the office reads and writes the same data,
-- and enables realtime so changes appear live for everyone.
-- ============================================================================

-- 1) The shared state table (one row, id = 1).
create table if not exists public.app_state (
  id          integer primary key,
  data        jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now()
);

-- 2) Row Level Security.
-- NOTE: In this "simple login" phase the app connects with the public anon key
-- and these policies allow anyone with that key to read/write the shared row.
-- This is fine for getting the office collaborating, but it is NOT strong
-- security for real client data — plan to upgrade to proper email+password
-- auth before storing sensitive information.
alter table public.app_state enable row level security;

drop policy if exists "app_state read"   on public.app_state;
drop policy if exists "app_state insert" on public.app_state;
drop policy if exists "app_state update" on public.app_state;

create policy "app_state read"   on public.app_state for select using (true);
create policy "app_state insert" on public.app_state for insert with check (true);
create policy "app_state update" on public.app_state for update using (true) with check (true);

-- 3) Enable realtime for this table so live updates are broadcast.
alter table public.app_state replica identity full;
do $$
begin
  begin
    alter publication supabase_realtime add table public.app_state;
  exception
    when duplicate_object then null;  -- already added, ignore
  end;
end $$;

-- Done. The app will insert the initial data automatically on first load.
