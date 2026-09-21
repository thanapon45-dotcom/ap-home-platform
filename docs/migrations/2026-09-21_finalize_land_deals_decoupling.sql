-- AP-Home: finalize removal of legacy Land Analyzer ↔ Fix & Flip coupling
-- Applied to production on 2026-09-21 after live-schema verification.
-- Business boundary:
--   Build-to-Sell       -> Land Analyzer -> projects
--   Renovate-to-Resell  -> Fix & Flip -> reno_deals
--
-- This migration is a record of the production cleanup.
-- It is intentionally idempotent for the drop operations; the guarded DO block
-- only clears legacy values when the column still exists.

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reno_deals'
      and column_name = 'land_project_id'
  ) then
    update public.reno_deals
    set land_project_id = null
    where land_project_id is not null;
  end if;
end $$;

alter table public.reno_deals
  drop constraint if exists reno_deals_land_project_id_fkey;

alter table public.reno_deals
  drop column if exists land_project_id;
