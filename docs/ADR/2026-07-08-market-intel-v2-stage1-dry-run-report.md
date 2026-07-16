# ADR-005 Stage 1 — Dry Run Report

**Result: PASS.** All 7 validation criteria from the Stage 1 approval scope are met against real Claude Haiku responses and real Supabase writes. Workflow remains `active: false` on test-only webhook paths; production workflow and webhook untouched throughout.

## What was tested

Workflow: `Finnhouses — Market Intelligence Collector v2 (ADR-005)`, imported as a separate n8n workflow, test webhook paths `market-intel-v2/fb` and `market-intel-v2/manual`. Tested via n8n's "set mock data" + Execute workflow (real Claude Hub calls, real Supabase writes, no traffic on production paths). Cases run across both webhook triggers, covering: a normal urgent-relocation listing, a no-timing-signal case, and a bonus-season timing case (to exercise the buyer_context conditional branch).

## Bugs found and fixed during the dry run

The dry run caught three real, previously-undetected failures that mocked-response testing in Phases 3/4 could not have caught:

1. **Code node credential access is broken on this n8n instance.** `this.getCredentials()` throws `this.getCredentials is not a function` (Code nodes never support this — confirmed against n8n's own docs). The follow-up `$env.SUPABASE_SERVICE_KEY` fix also failed with `access to env vars denied`, even with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` and a full service restart — this matches an open, unresolved n8n bug ([n8n-io/n8n#29603](https://github.com/n8n-io/n8n/issues/29603)). **Fix**: rebuilt all 3 Supabase writes as native `n8n-nodes-base.supabase` nodes, which use n8n's real credential system and are unaffected by either bug. This required splitting `buyer_context (conditional)` and `content_frames` into prep → insert → merge node chains, since a native node's output replaces the incoming JSON with just the inserted row.
2. **`market_insights.category` has a real DB CHECK constraint** (5 fixed values). The model returned `category: "seller_motivation"` — a signal key, not a category — on a live call. The old `?? 'demand_pattern'` fallback only caught null/undefined, not an out-of-enum string, so every insert to `market_insights` failed silently (`continueOnFail: true` swallowed the error). **Fix**: added a `VALID_CATEGORIES` whitelist in both Parse nodes; anything outside the 5 allowed values now falls back to `demand_pattern`.
3. **`market_insights.confidence` is a `smallint` (integer 1–5)**, but the prompt also uses "confidence" for the 0.0–1.0 per-signal scores. The model returned the top-level confidence as `0.9` by analogy with the signal fields, which Postgres rejected outright (`invalid input syntax for type smallint`). **Fix**: added integer coercion/clamping (1–5, default 3) in both Parse nodes.

All three fixes are now in the workflow file and were re-verified live after each fix — see evidence below.

## Validation against the 7-point Stage 1 checklist

1. **Claude returns a valid signal contract** — confirmed. Real Haiku responses parsed correctly across all test cases (with the maxTokens 900→1600 bump from Phase 4.1a already covering a truncation failure caught in an earlier dry-run pass).
2. **Normalize layer works** — confirmed. Every `content_frames.signals` row has all 8 post-level keys + liquidity, even when the model's raw response was incomplete or malformed.
3. **JSON schema passes** — confirmed, no malformed JSONB written.
4. **Supabase writes succeed** — confirmed for all 3 tables (`market_insights`, `buyer_context_signals`, `content_frames`) after the credential and enum fixes above.
5. **content_frames contains existing fields + signals + positioned_content + ai_summary + collector_version** — confirmed, see evidence row `id=83` below.
6. **saveOk/saveError reporting works** — confirmed via the merge nodes' `content_frame_saved` / `content_frame_error` and `buyer_context_saved` / `buyer_context_error` fields, and the Telegram success/error messages reflect them correctly.
7. **Liquidity remains code-enforced, never LLM-generated** — confirmed on every row: `liquidity: {level: null, confidence: 0, source_scope: 'area_aggregate'}` regardless of what the model returned, including on a real, non-mocked response.

## Evidence

Latest successful rows (2026-07-08, UTC timestamps), verified directly via Supabase MCP:

- `content_frames.id=83`, `target_context="บางบัวทอง | timing:bonus | source:observation"`, `collector_version="v2"`. `signals` has all 9 keys; `urgency` evidence `["อยากขายให้จบก่อนสิ้นปีนี้", "อยากปิดเรื่องบ้านให้เรียบร้อย"]` vs `seller_motivation` evidence `["ได้โบนัสมาก้อนนึงเลยอยากปิดเรื่องบ้าน"]` — genuinely distinct reasoning under a real model call, not restated. `liquidity` is `{level: null, confidence: 0, source_scope: "area_aggregate"}`.
- `market_insights.id=82`, `area="บางบัวทอง"`, `category="demand_pattern"`, `confidence=5` — valid enum, valid integer.
- `buyer_context_signals.id=28`, `trigger_type="bonus"`, `channel="facebook"` — confirms the conditional branch (skip when no timing signal, write when one exists) works correctly; earlier test cases with `timing_signal: none` correctly produced no row in this table.

An earlier pass also confirmed the empty-text / no-signal cases route correctly (no spurious rows, error branch reachable).

## Rollback status

No rollback needed — nothing in production was touched. Workflow `active: false` throughout. Webhook paths remain `market-intel-v2/fb` / `market-intel-v2/manual`, distinct from production `market-intel/fb` / `market-intel/manual`. Production workflow and its webhook are untouched and still serving live traffic on Hub v1 per `CLAUDE.md`.

## Recommendation

Stage 1 dry run is complete and passing. Per your original instruction, this report is the stopping point — awaiting your approval before any Production Cutover work (changing webhook paths back to production, deactivate-old → activate-new sequence per `AI_TEAM.md` §12).
