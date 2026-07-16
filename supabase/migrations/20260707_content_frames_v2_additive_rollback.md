# Rollback: content_frames v2 additive columns (ADR-005)

## Application rollback

1. Revert the n8n Collector workflow files to the pre-ADR-005 version (single dual-write insert becomes flat-only insert again). The existing 6 flat columns keep working the entire time regardless — dual-write is additive, so reverting the workflow is safe on its own without touching the DB.
2. `MarketIntel.tsx` / `app/api/chat/route.ts` never read `signals`/`positioned_content`/`ai_summary` until a later phase explicitly adds that — so no dashboard code needs to change to roll back.

## Database rollback

If you must remove the new columns entirely:

```sql
ALTER TABLE content_frames
  DROP COLUMN IF EXISTS signals,
  DROP COLUMN IF EXISTS positioned_content,
  DROP COLUMN IF EXISTS ai_summary,
  DROP COLUMN IF EXISTS collector_version;
```

This is safe: the 6 original columns (`area, target_segment, keyword, frame_text, timing_signal, source_type`) are untouched, so `MarketIntel.tsx` and the legacy n8n insert keep working exactly as before ADR-005.

Prefer not to drop — even partial/malformed `signals` data from an early rollout is useful for debugging the Parse-node prompt later.
