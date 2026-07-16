# ADR-005: Market Intel content_frames v2 — 9-dimension Signals schema

| Field | Value |
|---|---|
| **Date** | 2026-07-07 |
| **Status** | Proposed |
| **Author** | Claude (Lead Software Engineer), refined with ChatGPT (Virtual CTO) review |
| **Approved By** | _pending Archi sign-off_ |

---

## Context

`content_frames` (Market Intel) currently contains 18 real columns in production (verified directly via Supabase MCP on 2026-07-07, immediately before the Phase 2 migration — see "Production Baseline Correction" below for how this differs from this ADR's original draft): `id, created_at, frame_text, frame_type, target_segment, target_context, keyword, tone, channel, publish_date, engagement_score, likes, comments, shares, post_url, is_starred, star_note, performance_data`, plus the 4 columns this ADR adds additively (`signals, positioned_content, ai_summary, collector_version`). The only taxonomy that exists today lives in the separate `market_insights` table as a single `category` enum (`risk_perception | demand_pattern | liquidity_signal | price_behavior | competitor_gap`), plus a separate `buyer_context_signals` table for timing/emotional data. These three tables overlap conceptually but were never unified, and a downstream consumer (`app/api/chat/route.ts`) already read columns (`positioning_angle`, `emotional_hook`, `content_angle`) that never existed — silently broken via the same try/catch-swallows-error pattern as ISSUE-007. That route has since been fixed (2026-07-07) to query the real `target_segment, keyword, frame_text` columns instead.

Archi proposed replacing this with a richer structure:

```
Market Intel
├── Metadata
├── Signals (Demand, Price, Liquidity, Offer, Finance, Value, Location, Urgency, Seller Motivation)
├── Positioned Content
└── AI Summary
```

This lets the Hub query across independent dimensions (e.g. "high urgency + low liquidity" = strong negotiation opportunity for a buyer lead) instead of one flat `category` string.

---

## Production Baseline Correction

**Original assumption (this ADR's first draft, 2026-07-07 morning)**: `content_frames` has 6 flat columns — `area, target_segment, keyword, frame_text, timing_signal, source_type` — based on reading the insert payload in `ap-home-platform/scripts/Finnhouses — Market Intelligence Collector v1 (fixed).json` and a subagent's grep-based audit of the repo.

**Discovered reality (verified via Supabase MCP directly against the `ap-home-platform` project, immediately before executing the Phase 2 migration)**: the live table has 18 columns, none of which are `area`, `timing_signal`, or `source_type`. It has `frame_type, target_context, tone, channel, publish_date, engagement_score, likes, comments, shares, post_url, is_starred, star_note, performance_data` instead — a schema clearly designed for tracking published content pieces and their FB engagement performance, not a narrow "market intel signal" record.

**Why the original assumption was wrong**: the file this ADR was based on (`scripts/Finnhouses — Market Intelligence Collector v1 (fixed).json`) is a **stale, pre-fix snapshot**. `issues-log.md` ISSUE-007 (session 19e, 2026-07-02, status Resolved) already documented and fixed this exact problem months before this ADR: the original Collector sent `area/timing_signal/source_type` — columns that never existed — so every insert into `content_frames` was rejected by PostgREST and swallowed silently by a bare `try/catch`, meaning **zero rows were ever actually written by that code path**. The real fix lives in `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v1 (2).json`, which maps to the real columns (`frame_text, frame_type, target_segment, target_context, keyword, channel`) and is annotated with the session 19d/19e fix notes. The repo's `ap-home-platform/scripts/` copy of this workflow was never updated to match and is effectively dead documentation.

**Impact**: This ADR's "Context" section described a table that never existed in that shape in production. It does not change the *decision* (see below), but it did mean this ADR's understanding of the starting point was wrong, and Phase 3 (n8n changes) would have targeted the wrong file if not caught here.

**Why the migration remains valid regardless**: `ALTER TABLE content_frames ADD COLUMN IF NOT EXISTS signals/positioned_content/ai_summary/collector_version` is additive and orthogonal to every one of the 18 real columns — it doesn't matter whether the table had 6 columns or 18, the additive migration is safe either way. The Phase 2 migration already executed (2026-07-07) is unaffected by this correction.

**Why the Phase 3 target changed**: Phase 3 must edit `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v1 (2).json` (the real, ISSUE-007-fixed version), not `ap-home-platform/scripts/Finnhouses — Market Intelligence Collector v1 (fixed).json` or `(env-fixed).json` (stale, pre-fix, and not what's actually driving production inserts). See the companion source-of-truth report: `docs/market-intel-collector-source-of-truth.md`.

---

## Decision

> We will adopt the 9-signal structure as `docs/market-intel-signals.schema.json`, with each signal sharing a `{level, confidence, evidence[], source_scope}` shape (not a bare string/boolean), and add it to `content_frames` as new **additive JSONB columns** (`signals`, `positioned_content`, `ai_summary`) rather than replacing the table, because the platform's stated migration principle (AI_TEAM.md §3) is incremental — never Big Bang.

Two engineering points that go beyond the original proposal and must be respected during implementation:

1. **Liquidity is structurally different from the other 8 signals.** Demand/Price/Offer/Finance/Value/Location/Urgency/Seller Motivation can all be derived by the LLM from a single post's text at ingestion time (`source_scope: "post"`). **Liquidity cannot** — "how fast do properties in this area sell" is an area-level aggregate fact, not something present in one listing's text. Asking GPT to hallucinate a liquidity level per-post would produce a confident-sounding but fabricated number. Liquidity must be computed by the Hub from historical rows in the same `area` (e.g. trailing 30/60/90-day count of price-cut mentions, days-since-first-seen for similar listings) and written with `source_scope: "area_aggregate"`. Until an area has enough historical volume, liquidity must be `level: null, confidence: 0`, not a guessed "low".

2. **Urgency vs. Seller Motivation need an explicit rubric or they will bleed into each other** (ChatGPT's review flagged this correctly): Urgency = surface language in the post itself (ด่วน, รีบขาย, a stated deadline) — keyword/phrase-detectable, `source_scope: "post"`. Seller Motivation = the *inferred reason* behind that urgency (relocation, debt, inheritance sale, upgrading) — requires contextual inference beyond keyword matching and must not simply restate the urgency keyword as the "motivation."

---

## Alternatives Considered

| Option | Pros | Cons |
|---|---|---|
| **9 columns as JSONB blob under `signals`, additive to existing table (chosen)** | No breaking change to `MarketIntel.tsx` or the Vercel dashboard mid-migration; matches "incremental migration only" principle; Postgres JSONB supports indexed path queries (`signals->urgency->>level`) | Requires a GIN index for query performance at scale; slightly more verbose queries than flat columns |
| 9 discrete columns (`urgency_level`, `urgency_confidence`, ... × 9) | Simple `WHERE` filters, no JSON path syntax | 36+ new columns for 9 signals × 4 fields; every future signal dimension needs a migration; doesn't match the nested shape Archi asked for |
| Full table replacement (`content_frames_v2`, drop old table) | Cleanest end-state, no dual-write | Breaking change — requires touching `MarketIntel.tsx`, the n8n Parse node, and fixing the already-broken `chat/route.ts` all in one shot; violates "never Big Bang Rewrite" (AI_TEAM.md §3) |
| Keep flat `category` enum, just add more enum values | Zero schema change | Doesn't solve the actual problem — enum can't represent 9 independently-true dimensions at once (a post can be high-urgency AND low-liquidity AND high-value simultaneously; one enum value can't) |

---

## Consequences

### Positive
- Enables compound filtering across independent dimensions for lead scoring (e.g. Phase 2 "Buyer Intelligence" in AI_TEAM.md §17)
- `evidence[]` on every signal gives an audit trail — directly feeds the Phase 3/4 self-improving loop (AI_TEAM.md §11, §17) since prompt quality can be evaluated against stored evidence later
- `positioned_content.signal_refs` makes it possible to debug *why* the model chose a given hook, instead of treating hook generation as a black box

### Negative / Trade-offs
- Three tables (`content_frames`, `market_insights`, `buyer_context_signals`) still exist in parallel during the transition — this ADR does not consolidate them, it only adds the new structure to `content_frames`. Consolidation is a follow-up decision, not bundled here.
- JSONB columns are not enforced by Postgres CHECK constraints the way discrete columns with enums would be — the `signal` shape is only enforced at write-time by the n8n/Hub code and the JSON Schema, not by the database itself. A malformed row bypasses the schema unless we add a CHECK/trigger later.

### Risks
- If the n8n Parse node prompt isn't updated to also fill `rubric_note` and `evidence[]`, signals degrade to "confident-sounding but untraceable" — same failure mode ISSUE-007 already burned us on with silent `try/catch`. Any implementation of this ADR must NOT swallow parse errors silently.
- Liquidity aggregation requires a new Hub-side job (not just a prompt change) — if scoped as "just update the n8n prompt," liquidity will be implemented wrong (per point 1 above).

---

## Implementation Notes

- Schema definition: `docs/market-intel-signals.schema.json` (this ADR's companion file)
- `content_frames` additive migration: add `signals JSONB`, `positioned_content JSONB`, `ai_summary JSONB`, `collector_version TEXT DEFAULT 'v1'` — do **not** drop or rename any of the existing 18 columns. **Status: executed 2026-07-07** (Phase 2, migration name `content_frames_v2_additive`), row count unchanged 75→75, all existing rows backfilled `collector_version='v1'`.
- n8n: update the Collector's Parse node prompt to emit the 8 post-level signals (all except liquidity) in the new shape; update the **real** Supabase insert node (`memory/n8n-workflows/Finnhouses — Market Intelligence Collector v1 (2).json`, not the stale `scripts/` copies — see Production Baseline Correction above) to also write the 4 new columns alongside the existing real ones (dual-write during transition). Note: that file also hardcodes the Supabase service_role key directly in the JSON instead of using `getCredentials('supabaseApi')` like the stale `scripts/` version does — this should be corrected as part of the Phase 3 edit, not carried forward. See `docs/market-intel-collector-source-of-truth.md`.
- Hub (new, not yet built): a scheduled job or on-read aggregation that computes `liquidity` per `area` from historical `content_frames`/`market_insights` rows and either backfills it onto recent frames or serves it as a joined lookup — needs its own design pass before implementation, this ADR only establishes that it must be area-scoped, not per-post
- Separately (not blocking this ADR, but fixed regardless as of 2026-07-07): `app/api/chat/route.ts` was reading columns that never existed (`positioning_angle`, `emotional_hook`, `content_angle`) — corrected to query `target_segment, keyword, frame_text` with proper error logging.
- Per AI_TEAM.md §7, this is a Database schema ADR — requires Archi sign-off before any migration or n8n prompt change is implemented. Migration (Phase 2) is approved and executed; n8n changes (Phase 3) remain pending approval.

---

## References

- Related issues: `issues-log.md` ISSUE-007 (content_frames silent write failure — resolved session 19e, and the reason this ADR's original schema assumption was wrong)
- Related docs: `docs/market-intel-signals.schema.json`, `docs/market-intel-collector-source-of-truth.md`, `glossary.md` (content_frames entry)
- Governance: `AI_TEAM.md` §3 (Incremental Migration only), §7 (ADR Mandatory Triggers — Database), §11 (Future Architecture — Self-Improving Loop)
