-- Optimistic-lock counter used by the app when saving the shared state.
-- Additive and safe to run once; existing rows start at version 0.
alter table public.app_state add column if not exists version bigint not null default 0;
