# Chapter 5 — Data Architecture

Status: **Final**
Trace Matrix: AO-4.3, AO-4.4, AO-4.5, BR-3.3, AI Agent Registry gap (Ch4 §6)

## 1. Data Architecture Overview

Supabase functions as the primary business and intelligence data System of Record. Operational runtime state remains **partially** represented outside Supabase's relational model — inside Hub v1's `hub_state.value` JSON blob (see AO-5.2) — so Supabase should not be read as the sole system of record for all platform state.

**Table count note — Resolved 2026-08-07** (Architecture Amendment, see CHANGELOG.md): This chapter's original inventory (26 tables) was produced from a `list_tables` call earlier in this engagement. An earlier chapter (Ch2) recorded 28 tables. A fresh live `list_tables` read against the `ap-home-platform` Supabase project (public schema, Evidence A) now confirms **28 tables** — Ch2's figure was correct. The delta traces to two tables absent from this chapter's original inventory, now added below (§2): `agent_reports` and `line_users`.

## 2. Data Entity Inventory

| Category | Tables (rows as of assessment date) |
|---|---|
| Core Business Data | `leads` (4), `properties` (15), `reno_deals` (2), `projects` (1), `sites` (3), `line_users` (2), `content_posts` (15) |
| Intelligence Data | `market_insights` (135), `buyer_context_signals` (35), `content_frames` (140), `area_memory` (8), `buyer_profiles` (3), `market_listings` (69) |
| Governance/Feedback Data | `quality_gate_log` (1), `qc_inspections` (20), `qc_defects` (5), `qc_daily_usage` (4), `qc_standards` (14), `post_performance` (0), `agent_reports` (4) |
| Operational/Config | `hub_state` (2), `hub_queue` (0) |
| Dormant (0 rows, Evidence A) | `construction_records`, `defect_log`, `seller_profiles`; near-dormant: `fb_listings`/`fb_sellers`/`fb_listing_history` (3 each) |

## 3. Data Ownership Matrix

| Data | Owner Domain (BD-3.x, inferred) | Consumers | Ownership Confidence |
|---|---|---|---|
| `leads` | BD-3.1 Customer Acquisition | CRM UI, AG-4.5 | High |
| `buyer_context_signals` | BD-3.1 / Market Intelligence (overlap) | AG-4.5 writes, AG-4.1 doesn't read | Medium |
| `market_insights` | BD-3.6 Market/Buyer Sensing | AG-4.4 | Medium |
| `content_frames` | Publishing / Market Intelligence (overlap) | AG-4.1 | Medium |
| `area_memory` | BD-3.6 Market/Buyer Sensing | AG-4.4 | Medium |
| `qc_inspections`, `qc_defects`, `qc_standards` | BD-3.4 Construction Quality | AG-4.3, QC dashboard | High |
| `quality_gate_log` | BD-3.8 AI Governance | AG-4.2, Quality Gate dashboard | High |
| `reno_deals` | BD-3.3 Fix & Flip / Renovate-to-Resell | Deals UI, Brains | High |
| `projects` | BD-3.7 Build-to-Sell Development | Land Analyzer, Brains | High |
| `hub_state` | Hub v1 (cross-cutting, no clean domain owner) | Dashboard Overview | Low |

## 4. Current Data Flow (representative — AI feedback path)

```
AG-4.2/4.3/4.4 (AI decision)
        |
        v
{quality_gate_log | qc_inspections | market_insights}.human_feedback = NULL
        |
        v
Dashboard tab (QcAccuracy / QualityGateAccuracy / MarketIntel Calibration)
        |
        v
Owner clicks correct/incorrect → PATCH → human_feedback set
```

Same shape, independently implemented 3 times.

## 5. Schema Quality Analysis

**Major Finding 5.1 — AI Decision Data Fragmentation** (elevated from "Finding 1")
Three independently-built tables — `market_insights`, `qc_inspections`, `quality_gate_log` — each carry a `human_feedback`/`human_feedback_at` pair added in three separate ADRs, with three different check-constraint vocabularies (`accurate/inaccurate`, `correct/incorrect`, `correct/incorrect`). No shared table or vocabulary unifies them. This is the schema-level confirmation of AO-4.3 and directly evidences the missing AI Agent Registry noted in Chapter 4 §6.

**Finding 2 — `hub_state` as opaque JSON blob**: `hub_state` has only 3 columns (`key`, `value jsonb`, `updated_at`) and 2 rows — the entire Hub v1 runtime state (queues, blog/fb status, history arrays) lives inside `value`, not in relational columns.

**Finding 3 — BR-3.3 has no data-backed home**: no table (`brand_rules`, `rules`, or similar) exists to store guardrail rules.

**Finding 4 (AO-5.3, restated with Impact)**: No foreign keys connect `market_insights`, `buyer_context_signals`, `content_frames`, or `area_memory` to one another (Evidence A). `buyer_context_signals.lead_id` is the only FK bridging any of them to core business data.
**Impact**: The platform currently stores intelligence *artifacts*, but does not yet maintain an intelligence *graph* or model that allows knowledge to accumulate across workflows. Having data is not the same as having intelligence.

**Finding 5 — Dormant tables, no lifecycle marker**: several tables sit at 0-3 rows with no `deprecated`/`archived` flag distinguishing "not yet adopted" from "abandoned."

## 6. Data Governance

RLS enabled on all 28 tables (Evidence A, confirmed 2026-08-07). No documented retention policy, versioning strategy, or explicit ownership metadata beyond code-location convention. No `updated_by`/`created_by` actor tracking anywhere in the schema.

## 7. Architectural Observations

**AO-5.1 / Major Finding 5.1** (Evidence: A) — Three independently-built, structurally near-identical feedback schemas exist with no shared table or vocabulary — violation of Architecture Principle 9 (Single Source of Truth) at the schema level.

**AO-5.2** (Evidence: A) — `hub_state` stores the majority of Hub v1's operational state as an opaque JSON blob in a 3-column table.

**AO-5.3** (Evidence: A) — No structural linkage between the four core Intelligence tables; schema-level evidence for AO-4.5.

**AO-5.4** (Evidence: A/B) — No business-rule data store exists.

**AO-5.5** (Evidence: A; Confidence: Medium) — Several tables remain at 0-3 rows with no lifecycle marker.

## 8. ADR Candidates

**ADR-Candidate-5.1 — AI Decision & Feedback Data Model** (renamed from "consolidate feedback schemas"): Should Finnhouses introduce a unified model for AI decision traceability and human feedback, replacing the 3 independent schemas? Table naming deferred to the ADR decision itself. Decision Drivers: migration cost across 3 dashboards/APIs, preserving table-specific fields, sequencing relative to the AI Agent Registry — recommend resolving together.

**ADR-Candidate-5.2** (AO-5.2): Should `hub_state`'s JSON blob be normalized into relational tables? Decision Drivers: read/write complexity during Hub v1→v2 transition, query performance needs (none observed as urgent), risk of touching a production hot-path table.

**ADR-Candidate-5.3** (AO-5.3): Should Finnhouses introduce a Shared Intelligence Layer connecting the 4 intelligence tables? Converges with ADR-Candidate-4.4. Decision Drivers: same as 4.4, plus schema-design cost (FK columns vs. linking table vs. graph store).

**ADR-Candidate-5.4** (AO-5.4): Should a `business_rules` data store be introduced? Converges with ADR-Candidate-4.2.

**ADR-Candidate-5.5** (AO-5.5): Should dormant tables be formally archived/dropped or documented as intentionally-reserved?

**ADR-Candidate-5.6 — Schema Lifecycle Governance**: Should every table require lifecycle metadata (`status`, `owner`, `created_for`, `deprecated_at`, `replacement_table`)? Decision Drivers: future maintenance cost, schema clarity, migration safety.

**Cross-chapter convergence note**: ADR-Candidate-5.1↔4.1(-adjacent), 5.3↔4.4, and 5.4↔4.2 describe the same underlying decisions from two vantage points (AI-agent-level vs. data-level) — recommend resolving each pair together in Chapter 10/11.


## 9. Investment Stream Boundary — Build-to-Sell vs Renovate-to-Resell

The production data model treats these as separate investment streams:

```
Build-to-Sell
Land Analyzer
    ↓
projects

Renovate-to-Resell
Fix & Flip Deals
    ↓
reno_deals
    ↓
sites
    ↓
QC
```

There must be no identity/FK relationship from `reno_deals` to `projects`. Cross-module intelligence may be exposed through Brains, but Brains must not infer that a Deal belongs to a Land Analyzer project without explicit evidence.
