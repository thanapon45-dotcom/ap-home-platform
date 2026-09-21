# Fix and Flip Analysis

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip - primary revenue driver)
Coverage: 100% - Production-grade

---

## What It Does

Fix and Flip Analysis tracks deals through 4 stages:
1. Evaluating - before purchase decision
2. Renovating - after purchase, under renovation
3. Listed - listed for sale
4. Closed - sold, deal complete

For each deal: track actual vs estimated costs (purchase, renovation, sale),
calculate variance to improve future estimates, visual progress bar (budget
spent vs allocated). Fix & Flip deals are independent from Land Analyzer projects.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| 4-stage Kanban pipeline | 100% | Move deals between stages |
| Actual vs Estimate variance | 100% | Purchase, renovation, sale price (ADR-017) |
| ROI calculation (auto) | 100% | (sale - invested) / invested times 100 |
| Budget tracking | 100% | Progress bar (spent/allocated) |
| Link to Land Analyzer project | 0% / not applicable | Intentionally independent; no FK to `projects` (ADR-027) |
| Portfolio metrics | 100% | Capital deployed, avg ROI closed |

---

## Honest Empty States

Per ADR-017 design philosophy, the dashboard shows honest low-data states:
if fewer than 10 closed deals, shows "not enough data to summarize" instead
of fake percentages. This avoids fake precision from small samples.

---

## Data Schema

reno_deals table key fields: name, property_address, stage
(evaluating/renovating/listed/closed), purchase_price, reno_budget
(estimate), reno_cost (actual), list_price (estimate), sale_price (actual),
roi_pct (computed), site_id (FK to sites for operational execution/QC).

---

## ADRs

- ADR-014: Fix and Flip Deals module - ../../../04-decisions/accepted/ADR-014.md
- ADR-017: Fix and Flip Deal ROI (actual-vs-estimate tracking) - ../../../04-decisions/accepted/ADR-017.md
- ADR-019: Remove reno from CRM - ../../../04-decisions/accepted/ADR-019.md
- ADR-027: Land Analyzer and Fix & Flip are separate investment streams - ../../../04-decisions/accepted/ADR-027.md

---

## Known Issues

- ISSUE-009: content_queue item status never updates to completed - ../../../05-incidents/ISSUE-009.md
- ISSUE-013: Supabase RLS hardening - ../../../05-incidents/ISSUE-013.md

---

## Related Department Sub-modules

- ROI Analysis (roi-analysis.md) - Core calculation
- Land Analysis (land-analysis.md) - Source of deal creation
- Investment Decision Support (investment-decision-support.md) - Future portfolio insights
