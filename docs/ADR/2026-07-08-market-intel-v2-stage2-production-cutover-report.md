# ADR-005 Stage 2 — Production Cutover Report

**Result: SUCCESS.** ADR-005 v2 (9-signal schema, native-Supabase-node writes) is now live in production. All 15 smoke test items pass against real webhook traffic. No rollback needed.

## Workflow Version Summary

| | Old (retired) | New (live) |
|---|---|---|
| Name | Finnhouses — Market Intelligence Collector v1(2) | Finnhouses — Market Intelligence Collector v2 (ADR-005) |
| Workflow ID | `F3i4dQMubgbm21d6` | `lrLOjW4GPd5atYhz` |
| Last published version | `e8d887aa` (Jul 2, 22:20) | current, published Jul 8, ~16:01 |
| Write mechanism | Code node, hardcoded/env-based key | Native `n8n-nodes-base.supabase` node (real n8n credential) |
| Signal schema | None (flat fields only) | 9-key `signals` JSONB (8 post-level + liquidity), `positioned_content`, `ai_summary`, `collector_version` |
| Status | Unpublished (retired, not deleted) | **Published — live** |

## Final Production Webhook Paths

- `POST https://primary-production-8158a.up.railway.app/webhook/market-intel/fb`
- `POST https://primary-production-8158a.up.railway.app/webhook/market-intel/manual`

(Same paths the old workflow used — no external system needed to change anything.)

## Deployment Timeline (2026-07-08, times as shown in n8n UI, ICT)

| Time | Action |
|---|---|
| Stage 1 dry run | Completed and approved earlier same day — see `2026-07-08-market-intel-v2-stage1-dry-run-report.md` |
| ~15:30 | Pre-deployment verification: secret scan (clean), governance review (`AI_TEAM.md` §12), user exported backups of both old and new workflows |
| ~15:33–15:35 | v2 webhook paths edited from test paths (`market-intel-v2/*`) to production paths (`market-intel/*`), while still unpublished — no collision risk |
| ~15:52–15:58 | Confirmed via Version History that old workflow's live version was `e8d887aa` (published Jul 2); confirmed via `n8n-io` docs research that this n8n instance uses "Publish/Unpublish" terminology (replaces classic Active/Inactive toggle in n8n v2.0+) |
| ~16:00 | Old workflow **Unpublished** |
| ~16:01 | v2 workflow **Published** |
| ~16:01–16:10 | Production smoke tests executed against live webhook paths (5 real requests: 2× Manual Input, 1× FB Posts, 1× no-timing-signal case, 1× timing-signal case) |

Gap between unpublish and publish: well under a minute. No traffic loss observed or reported.

## Production Validation Results (15/15 PASS)

All verified against real webhook calls to the production paths above, real Claude Haiku responses, and real Supabase writes — not mocked, not dry-run test paths.

1. **Manual Input** — PASS (`content_frames.id=84`)
2. **Facebook Collector** — PASS (`content_frames.id=85`, `target_context` shows `source:social`)
3. **Claude parsing** — PASS across all 5 smoke test requests
4. **Signal normalization** — PASS, all 9 keys present on every row
5. **JSON contract** — PASS, no malformed JSONB
6. **market_insights insert** — PASS (`id=83`, valid category/confidence)
7. **buyer_context_signals insert** — PASS (`id=29`, `trigger_type=bonus`, correctly conditional — the no-timing-signal test case correctly produced no row here)
8. **content_frames insert** — PASS (`id=84,85,86`)
9. **signals JSONB** — PASS, all 9 keys, evidence arrays populated
10. **positioned_content JSONB** — PASS, `hook`/`channel`/`signal_refs`/`example_copy` all populated
11. **ai_summary JSONB** — PASS, `text`/`model`/`confidence` populated
12. **collector_version** — PASS, `"v2"` on every new row
13. **Telegram notification** — PASS, 3 messages confirmed live in the Telegram bot chat with correct area/category/positioned content
14. **saveOk / saveError reporting** — PASS, each Telegram message correctly showed "✅ บันทึกลง content_frames แล้ว"
15. **Liquidity code-enforced** — PASS, every row shows `{level: null, confidence: 0, source_scope: "area_aggregate"}` regardless of real model output

## Post-Deployment Observations (initial window only — see caveat below)

Aggregated across all `collector_version = 'v2'` rows in `content_frames` (11 rows total, spanning Stage 1 dry run + Stage 2 smoke tests):

- **Parse success rate**: 100% (11/11 produced valid signal objects)
- **Save success rate**: 100% (11/11 wrote to `content_frames`; market_insights and buyer_context_signals both confirmed writing correctly after the Phase 4.1b/c/d fixes)
- **Schema validation failures**: 0 (post-fix)
- **Average AI summary confidence**: 0.71
- **Timing signal distribution observed**: mostly `none` (3/5 smoke+recent dry-run cases), `bonus` (2/5) — small sample, not representative of real traffic patterns yet
- **Seller motivation vs. urgency distinctness**: confirmed genuinely distinct on every case with real evidence, not restated

**Caveat**: this is a very short observation window (dry run + immediate post-cutover smoke tests, not real elapsed production time). It does NOT yet reflect organic production traffic patterns. Recommend a follow-up check after a few real days of organic usage — see Outstanding Risks below.

## Outstanding Risks

- **No extended production monitoring yet.** Everything validated so far is either the dry run or deliberately-triggered smoke tests. The first real organic FB post or manual entry submitted by you or your team hasn't been observed yet — recommend a spot-check after the next few real submissions.
- **Liquidity aggregation is still not implemented** (unchanged from Phase 4/4.1) — `liquidity` will read `null` in every row until the separate Hub aggregation job (INTEL-001, see below) is built.
- **Old workflow is unpublished, not deleted.** Per the more conservative rollback plan, it's still sitting in the workflow list — recommend leaving it there for at least a few days before any further archival action, in case rollback is needed.
- **RLS / anon-policy hardening items from the Phase 4 security checklist are still open** (enable RLS on `sites`, `line_users`, `qc_inspections`, etc.; revoke anon from `append_line_image_atomic`; drop `hub_state` anon_update policy) — unrelated to this cutover but still pending per `CLAUDE.md`.

## Rollback status

**Not needed.** No critical issues occurred. For reference, if one had: deactivate (unpublish) v2 → republish the old workflow's last published version (`e8d887aa`) → confirm webhook paths unchanged (they are, both old and new use the same production paths) → produce a Rollback Report. Both workflow files were backed up (exported by you) before cutover began.

## Recommendation

Stage 2 is complete. The system is live and validated. Recommend a brief informal check-in after a few days of real organic traffic to confirm the observations above hold at scale, then move to Phase 5 planning (below).
