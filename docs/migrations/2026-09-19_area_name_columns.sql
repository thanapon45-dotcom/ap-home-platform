-- Migration: add area_name to projects + reno_deals
-- Date: 2026-09-19 (session 33)
-- Why: connects Land Analyzer -> Deals -> Market Intelligence by a shared,
--   human-readable Thai location string (e.g. "ลาดหลุมแก้ว", "รังสิต") —
--   matching how market_insights.area is already keyed. Neither `projects`
--   nor `reno_deals` had any location field usable for this before (`projects`
--   only had lat/lng; `reno_deals` only had free-text `property_address`).
-- Run this manually in the Supabase SQL editor — Claude has no network path
--   to *.supabase.co from its sandbox and cannot run or verify this itself.

ALTER TABLE projects   ADD COLUMN IF NOT EXISTS area_name text;
ALTER TABLE reno_deals ADD COLUMN IF NOT EXISTS area_name text;

-- No default/backfill — existing rows (20 projects? reno_deals is at 0 rows
-- as of ADR-022) simply get area_name = null, same honest low-data-state
-- pattern as every other new column added this way in this repo.
