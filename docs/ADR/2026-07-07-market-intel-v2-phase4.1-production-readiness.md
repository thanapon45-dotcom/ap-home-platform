# ADR-005 Phase 4.1 — Production Readiness Assessment

**Status of the workflow file**: still a test export. `active: false`. Test webhook paths (`market-intel-v2/fb`, `market-intel-v2/manual`). Not imported into n8n. Not activated. Production webhook and production workflow completely untouched throughout Phases 3, 4, and 4.1.

## Code-level readiness: yes, with one caveat

All three QA findings from Phase 4 are now resolved at the code level and re-verified against the real extracted jsCode:

- **Finding 1 (blocking)** — missing signal keys not placeholder-filled: fixed. Every response, even one that omits `signals` entirely, now produces all 9 keys (8 post-level + liquidity) in a consistent shape.
- **Finding 2 (previously non-blocking, folded into this phase's scope per your instruction)** — no schema validation on confidence/evidence/level: fixed. Confidence is clamped to `[0,1]`, evidence is coerced to an array, invalid level enums are sanitized to `null`.
- **Finding 3 (previously flagged as pre-existing/out-of-scope, now explicitly fixed per your instruction)** — `parse_ok` required `area` even though a fallback existed: fixed. A response with `insight` but no `area` now correctly falls through to `area: 'unknown'` instead of being discarded.

15/15 QA test cases pass, including the 4 that specifically probed these three gaps (TC06, TC07, TC08, TC09) and the one that probed the area-fallback bug (TC10). The liquidity override and rubric-distinctness checks — which already worked before Phase 4.1 — continue to pass and were not affected by these changes.

**The caveat, stated plainly (same one as every phase so far)**: everything above was validated against mocked Claude/Supabase responses in a Node.js harness, because this sandbox has no outbound network access. Nothing here proves that the real Claude Haiku model, under the actual prompt, reliably produces well-formed `signals` objects in practice — it proves that *if* it doesn't, the surrounding code no longer breaks or silently drops data. That's an important distinction: Phase 4.1 hardens the system against bad model output, it doesn't tell you how often bad model output actually occurs. Only a live dry run (see the import checklist) can answer that.

## What still stands between this file and production

Nothing about the code itself is now blocking. What remains is entirely operational, and follows the same sequence the import checklist already laid out — nothing here is new:

1. Point the `REPLACE_WITH_YOUR_CREDENTIAL_ID` placeholder at your real "Supabase account" credential inside n8n after import. Cannot be done from a file edit.
2. Import as a new, separate workflow (leaving the current production workflow untouched), keep `active: false`, verify the Telegram credential resolves.
3. Run the live dry run against the `-v2` test webhook paths using real test inputs (not mocked responses) — this is the step that actually answers whether Claude Haiku follows the signal contract and the urgency/seller_motivation rubric under real conditions. Confirm rows in `content_frames` show `collector_version: 'v2'`, all 9 signal keys present, and liquidity always null/area_aggregate against real (not mocked) Claude responses.
4. Only after the dry run passes: follow the governed cutover in `AI_TEAM.md` §12 (deactivate old → verify off → activate v2 → confirm receiving traffic → archive old), changing the webhook paths back to the production ones as part of that same cutover, never running two workflows on the same webhook path at once.

## What's still explicitly out of scope (unchanged from Phase 4)

- The Hub-side liquidity aggregation job — not designed, not built. `liquidity` will read `null` in every row until that separate project happens.
- Consolidating `content_frames` / `market_insights` / `buyer_context_signals` into one table.

## Recommendation

Code is ready for the dry-run step. I have not imported or activated anything, and won't without your explicit go-ahead beyond this report, per your instruction. If you want, the next concrete action I can take is updating `docs/market-intel-v2-import-checklist.md` to mark Findings 1–3 as resolved (currently it still lists them as open items to fix before import) — otherwise that file will read as if this work hasn't happened yet.
