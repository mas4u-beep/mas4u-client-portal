-- ============================================================================
-- Mas4U — Data tables engine (annual reports, exempt dealers, assignments, ...)
-- ============================================================================
-- Run ONCE in Supabase → SQL Editor → New query → paste → Run.
--
-- Creates a flexible, secure "tables" engine: each table you upload (every Excel
-- sheet) becomes a row in data_tables, and every data row becomes a separate row
-- in data_rows. Because each row is its own database record, many employees can
-- edit different rows at the same time WITHOUT overwriting each other, and it
-- scales to thousands of rows. Access is limited to logged-in users only.
-- ============================================================================

-- A table definition (name + its column list).
create table if not exists public.data_tables (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  columns     jsonb not null default '[]'::jsonb,   -- [{ key, label }]
  sort_order  double precision default 0,
  created_at  timestamptz not null default now()
);

-- One row of data belonging to a table.
create table if not exists public.data_rows (
  id          uuid primary key default gen_random_uuid(),
  table_id    uuid not null references public.data_tables(id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,    -- { columnKey: value }
  position    double precision default 0,
  updated_at  timestamptz not null default now()
);
create index if not exists data_rows_table_idx on public.data_rows(table_id);

-- Row Level Security — logged-in (authenticated) users only.
alter table public.data_tables enable row level security;
alter table public.data_rows  enable row level security;

drop policy if exists "data_tables read"  on public.data_tables;
drop policy if exists "data_tables write" on public.data_tables;
drop policy if exists "data_rows read"    on public.data_rows;
drop policy if exists "data_rows write"   on public.data_rows;

create policy "data_tables read"  on public.data_tables for select to authenticated using (true);
create policy "data_tables write" on public.data_tables for all    to authenticated using (true) with check (true);
create policy "data_rows read"    on public.data_rows  for select to authenticated using (true);
create policy "data_rows write"   on public.data_rows  for all    to authenticated using (true) with check (true);

-- Realtime so edits appear live for everyone.
alter table public.data_rows replica identity full;
do $$
begin
  begin alter publication supabase_realtime add table public.data_tables; exception when duplicate_object then null; end;
  begin alter publication supabase_realtime add table public.data_rows;   exception when duplicate_object then null; end;
end $$;

-- Done. Next: upload your Excel files through the in-app importer.
