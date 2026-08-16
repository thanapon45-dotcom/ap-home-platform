# Investment AI Department

Revenue share: 60% (Unit 3 - Fix and Flip)
Coverage: 80% (4/6 sub-modules in production, 2 partial)
Priority: High - primary revenue driver

---

## What This Department Does

Investment AI generates 60 percent of total revenue through land analysis,
ROI evaluation, and Fix and Flip deal management (buy land/used house,
renovate, sell).

Core functions:
- Analyze vacant land / used houses for investment ROI
- Track Fix and Flip deals through 4 stages (Evaluating, Renovating, Listed, Closed)
- Calculate actual-vs-estimate variance to improve future estimates
- Visualize deals on map
- Decision support for portfolio-level strategy

---

## Sub-modules

| Sub-module | Status | Coverage |
|------------|--------|----------|
| ROI Analysis | Production | 100% (modules/roi-analysis.md) |
| Land Analysis | Production | 100% (modules/land-analysis.md) |
| Fix and Flip Analysis | Production | 100% (modules/fix-flip-analysis.md) |
| Investment Decision Support | Partial | 60% (modules/investment-decision-support.md) |
| Financial Planning | Partial | 50% (modules/financial-planning.md) |
| Cash Flow | Minimal | 30% (modules/cash-flow.md) |

---

## Coverage Summary

| Status | Count | Percent |
|--------|-------|---------|
| Production | 3/6 | 50% |
| Partial | 2/6 | 33% |
| Minimal | 1/6 | 17% |
| Missing | 0/6 | 0% |

Overall: 80 percent coverage - the highest revenue-generating department has
solid tooling.

---

## Revenue Context

Unit 3 (Fix and Flip) = 60 percent revenue - this department owns this.
Unit 4 (Inspection) = 30 percent revenue - Construction AI owns this (QC only).
Unit 2 (Brokerage) = 10 percent revenue - Marketing AI owns this.

Critical insight: This department generates the majority of revenue with
only 80 percent tooling coverage. The remaining 20 percent gaps (Financial
Planning, Cash Flow, Decision Support) could potentially unlock higher
returns on existing investments.

---

## ADRs

- ADR-014: Fix and Flip Deals module - ../../04-decisions/accepted/ADR-014.md
- ADR-017: Fix and Flip Deal ROI (actual-vs-estimate) - ../../04-decisions/accepted/ADR-017.md
- ADR-019: Remove reno from CRM - ../../04-decisions/accepted/ADR-019.md
- ADR-022: Land Analyzer to Fix and Flip Deals link - ../../04-decisions/accepted/ADR-022.md

---

## Known Issues

- ISSUE-009: content_queue item status never updates to completed - ../../05-incidents/ISSUE-009.md

---

## Related Documents

- Marketing AI Overview (../01-marketing-ai/overview.md) - Owns Unit 2 (Brokerage, 10%)
- Construction AI Overview (../02-construction-ai/overview.md) - Owns Unit 4 (Inspection, 30%)
