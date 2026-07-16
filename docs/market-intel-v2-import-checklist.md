# Import Checklist — Finnhouses Market Intelligence Collector v2 (ADR-005)

Do not check off any item without actually doing it. This checklist exists because ISSUE-007 and ISSUE-008 both happened from skipping steps that looked unnecessary in the moment.

## Before import

- [x] Finding 1 from the Phase 4 QA report (missing signal keys not placeholder-filled when the model omits them) is fixed — **done in Phase 4.1** (2026-07-07). All 8 post-level signal keys are now always constructed via a `normalizeSignal` helper, never conditionally copied. See `2026-07-07-market-intel-v2-phase4.1-diff-summary.md`.
- [x] Finding 2 (no schema validation on confidence/evidence/level) is fixed — **done in Phase 4.1**. Confidence clamped to `[0,1]`, evidence coerced to an array, invalid level enums sanitized to `null`.
- [x] Finding 3 (`parse_ok` required `area` even though a fallback existed) is fixed — **done in Phase 4.1**. `parse_ok` now only requires `insight` and no parse error; a missing `area` correctly falls through to `'unknown'` instead of discarding the record.
- [ ] Confirm in the n8n UI which workflow is *actually* currently active at webhook paths `/market-intel/fb` and `/market-intel/manual` (workflow id `F3i4dQMubgbm21d6` per the latest file check, but confirm live, not from a file) — this is the workflow that will eventually be replaced.
- [ ] Confirm a "Supabase account" credential already exists in this n8n instance (both A's and B's files assume one does).

## Import (still non-production at this point)

- [ ] Import `Finnhouses — Market Intelligence Collector v2 (ADR-005).json` as a **new**, separate workflow — do not overwrite the existing one.
- [ ] Leave `active: false` after import (this is already set in the file, but verify n8n didn't change it).
- [ ] Open the 3 Supabase Code nodes (`market_insights`, `buyer_context`, `content_frames`) and point the `REPLACE_WITH_YOUR_CREDENTIAL_ID` placeholder at your real "Supabase account" credential. The workflow cannot run correctly until this manual step is done — the placeholder cannot resolve.
- [ ] Verify the Telegram credential (`Telegram Intel Bot`, id `ImDBxePys7cyMDCW`) still resolves correctly in this n8n instance.

## Dry run (webhook paths are `market-intel-v2/fb` and `market-intel-v2/manual` — deliberately different from production, safe to test without touching live traffic)

- [ ] Send at least 5 of the 15 QA test inputs (from the Phase 4 report) as real webhook requests to the `-v2` paths, with the workflow temporarily activated *only* for this test.
- [ ] For each: confirm `content_frames` gets a new row with `collector_version = 'v2'` and a populated `signals` JSONB with all 9 keys present (this is exactly what Finding 1 needs to be fixed for).
- [ ] Confirm `liquidity` is always `{level: null, confidence: 0, source_scope: 'area_aggregate'}` regardless of what the real Claude response contains — this was only verified against mocked responses in Phase 3/4, real verification happens here.
- [ ] Spot-check 2–3 rows for whether `urgency` and `seller_motivation` come back as genuinely distinct (not restated) under real model conditions — this is the one thing that absolutely cannot be verified without a live call.
- [ ] Deactivate the test workflow again after the dry run.

## Cutover to production (only after the dry run passes)

- [ ] Change both webhook paths back to `market-intel/fb` and `market-intel/manual` in the v2 workflow.
- [ ] Follow AI_TEAM.md §12 exactly: **deactivate** the old production workflow → **verify** it's off → **activate** this v2 workflow → **confirm** it's now receiving traffic → **archive** the old workflow to `memory/n8n-workflows/archive/` with a date suffix. Never have two workflows active on the same webhook path at once.
- [ ] Watch the Telegram channel and Supabase `content_frames` table for the first few real production runs.
- [ ] Update `docs/HANDOFF.md` and `docs/issues-log.md` with the cutover date and result.

## Rollback (if anything goes wrong after cutover)

- [ ] Deactivate the v2 workflow.
- [ ] Re-activate the archived old workflow (same webhook paths, nothing to change).
- [ ] The additive `content_frames` columns (`signals`, `positioned_content`, `ai_summary`, `collector_version`) don't need to be rolled back — the old workflow simply won't write to them, which is harmless (see the ADR-005 migration rollback doc if a full DB rollback is ever needed).

## Not in scope for this cutover (do later, separately)

- Liquidity aggregation Hub job — still not built, `liquidity` will stay `null` forever until that's designed and implemented.
- Consolidating `content_frames` / `market_insights` / `buyer_context_signals` into one table.
