# Phase 5 Roadmap Proposal (post ADR-005 Stage 2)

Proposal only — nothing here has been built or scoped in detail. For discussion and prioritization before any implementation starts.

## INTEL-001 — Liquidity Aggregation Service

**What it solves**: `signals.liquidity` has been `{level: null, confidence: 0, source_scope: "area_aggregate"}` on every row since Phase 3 by design — it's the one signal ADR-005 deliberately never let the LLM generate, because liquidity needs area-level historical context a single post can't provide.

**Rough shape**: a Hub-side scheduled job that, per area, looks at recent `content_frames`/`market_insights` rows (volume of listings, price_behavior signals, days-on-market proxies if available) and computes a liquidity score, then backfills/updates `content_frames.signals.liquidity` for that area's recent rows. Needs a real definition of "liquidity" for Finnhouses' market first — e.g., inventory turnover proxy vs. absolute listing count vs. price-cut frequency — that's a business/analytics question before it's an engineering one.

**Suggested first step**: not code — a short doc defining what liquidity should actually measure for your market, with 2-3 example areas showing what "high" vs "low" liquidity would look like using data you already have.

## INTEL-002 — Market Intelligence Dashboard

**What it solves**: right now the only way to see `content_frames`/`market_insights`/`buyer_context_signals` data is querying Supabase directly (which is how this whole cutover was verified). No one on your team can browse trends, filter by area/category/timing signal, or spot patterns without SQL.

**Rough shape**: could be a lightweight addition to the existing `ap-home-platform.vercel.app` dashboard (Next.js, already live) — a new page reading from Supabase with filters for area, category, timing_signal, date range, and a simple table/chart view. Given the existing dashboard architecture, this is likely the most contained of the four items.

**Suggested first step**: a rough wireframe/list of the 5-6 questions you'd actually want to answer by looking at this data (e.g., "which areas have the most urgent-seller signals this month?"), so the dashboard is built around real questions rather than just dumping the table.

## INTEL-003 — Prompt Drift Monitor

**What it solves**: this cutover's dry run caught the model returning invalid `category` and `confidence` values that violated real DB constraints — not because the prompt was wrong, but because the model didn't reliably follow it. There's currently no ongoing way to notice if this kind of drift gets worse over time (e.g., if Claude model updates change behavior, or if new edge-case inputs start appearing more often).

**Rough shape**: lightweight — periodically sample recent `content_frames` rows and check things like: how often does `raw_model_text_debug` get populated (parse failures), how often do signal confidence/evidence fields look degenerate (all zeros, empty evidence on high-confidence claims), how often is `urgency` evidence identical to `seller_motivation` evidence (the exact rubric violation Phase 3/4 QA was built around). Could post a weekly summary to the same Telegram channel already used for save-status notifications.

**Suggested first step**: define the 3-4 specific drift signals worth tracking (probably the ones just listed) before building anything — this is a monitoring spec question, not an engineering one yet.

## ADR-006 — Market Intelligence Validation Layer

**What it solves**: right now, schema validation happens entirely inline in the n8n Parse nodes (the `normalizeSignal`/`VALID_CATEGORIES`/confidence-clamping code this cutover just added). That's fine for one workflow, but if Market Intelligence data ever gets written from a second source (another workflow, a manual admin tool, a future integration), the same validation logic would need to be duplicated or drift out of sync.

**Rough shape**: an actual ADR (architecture decision), not just code — decide whether validation should move to a shared Hub-side endpoint that all writers call through, a Postgres-level constraint/trigger layer (partially already true via the CHECK constraints this cutover discovered), or stay inline per-workflow with a documented shared reference. This is worth deciding deliberately rather than accreting more inline logic each time a new bug is found the way this cutover did.

**Suggested first step**: this one genuinely needs an ADR before code — worth a short discussion on whether a second Market Intelligence input source is actually likely to exist before investing in shared validation infrastructure for it.

## Suggested prioritization (my take, open to disagreement)

INTEL-002 (dashboard) is probably the highest immediate value for lowest effort, since the data now flowing in has no visibility outside SQL. INTEL-003 (drift monitor) is cheap insurance given what this cutover just found. INTEL-001 (liquidity) and ADR-006 (validation layer) both need real thinking/definition work before they're engineering tasks — not blocked on anything, just not "build this" ready yet.

Not proposing any of this be started without your sign-off on priority — this is scoping only, per your instruction not to make unrelated architectural changes.
