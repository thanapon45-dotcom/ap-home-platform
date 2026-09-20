-- AP-Home: remove Land Analyzer ↔ Deals coupling
-- Applied to production on 2026-09-20.
-- Existing value was test data; cleared before dropping the relationship.

update public.reno_deals
set land_project_id = null
where land_project_id is not null;

alter table public.reno_deals
  drop constraint if exists reno_deals_land_project_id_fkey;

alter table public.reno_deals
  drop column if exists land_project_id;
