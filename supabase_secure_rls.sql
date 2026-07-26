-- ============================================================================
-- Mas4U — Stage B: lock the database to authenticated users only
-- ============================================================================
-- ⚠️  DO NOT RUN THIS YET. Run it only during the "activation" step described in
--     SECURITY_PLAN.md, together, AFTER:
--       1) staff have Supabase Auth accounts (email + password), and
--       2) the app has been switched to sign in through Supabase Auth.
--
-- Running it before those steps will make the live site unable to read/write
-- data (because it currently connects with the anonymous key), so the app would
-- appear broken until activation is complete.
--
-- What it does: replaces the current "anyone with the anon key" policies with
-- "only signed-in users" policies. After this, the public anon key alone can no
-- longer read or write the shared data.
-- ============================================================================

alter table public.app_state enable row level security;

-- Remove the permissive (anon) policies from Stage A.
drop policy if exists "app_state read"   on public.app_state;
drop policy if exists "app_state insert" on public.app_state;
drop policy if exists "app_state update" on public.app_state;

-- Allow only authenticated sessions.
drop policy if exists "app_state auth read"   on public.app_state;
drop policy if exists "app_state auth insert" on public.app_state;
drop policy if exists "app_state auth update" on public.app_state;

create policy "app_state auth read"   on public.app_state for select to authenticated using (true);
create policy "app_state auth insert" on public.app_state for insert to authenticated with check (true);
create policy "app_state auth update" on public.app_state for update to authenticated using (true) with check (true);

-- ----------------------------------------------------------------------------
-- ROLLBACK (if something goes wrong during activation, restore Stage A access):
-- ----------------------------------------------------------------------------
-- drop policy if exists "app_state auth read"   on public.app_state;
-- drop policy if exists "app_state auth insert" on public.app_state;
-- drop policy if exists "app_state auth update" on public.app_state;
-- create policy "app_state read"   on public.app_state for select using (true);
-- create policy "app_state insert" on public.app_state for insert with check (true);
-- create policy "app_state update" on public.app_state for update using (true) with check (true);
