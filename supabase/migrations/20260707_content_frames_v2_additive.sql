-- ADR-005: Market Intel content_frames v2 — additive columns only.
-- Do NOT drop/rename existing columns: area, target_segment, keyword, frame_text, timing_signal, source_type
-- See docs/ADR/2026-07-07-market-intel-signals-schema.md and docs/market-intel-signals.schema.json
-- REVIEW ONLY — not applied yet, waiting for explicit approval before running against production Supabase.

ALTER TABLE content_frames
  ADD COLUMN IF NOT EXISTS signals JSONB,
  ADD COLUMN IF NOT EXISTS positioned_content JSONB,
  ADD COLUMN IF NOT EXISTS ai_summary JSONB,
  ADD COLUMN IF NOT EXISTS collector_version TEXT NOT NULL DEFAULT 'v1';

-- Constant-default ADD COLUMN is a metadata-only change on Postgres 11+ (no table rewrite,
-- no row-by-row backfill, safe on a live table of any size). Existing rows get
-- collector_version = 'v1' instantly; new rows written by the updated n8n Collector
-- will explicitly set collector_version = 'v2' at insert time (see n8n workflow update).

-- Optional, deferred: GIN index for querying inside `signals` (e.g. signals->'urgency'->>'level').
-- Not created now — add later if/when the dashboard or Hub needs to filter by signal level
-- at query time. Flagging here so it isn't forgotten (see ADR-005 "Consequences" section).
-- CREATE INDEX IF NOT EXISTS idx_content_frames_signals ON content_frames USING GIN (signals);
