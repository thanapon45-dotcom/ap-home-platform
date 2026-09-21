# Investment Decision Support

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip)
Coverage: Partial - 60%

---

## What It Does

Investment Decision Support provides portfolio-level insights for the Fix
and Flip business: aggregate ROI across all closed deals, compare ROI by
area/type/time period, identify which areas/types perform best, risk
scoring based on historical variance.

Current state: Basic aggregate metrics exist. Advanced analytics pending.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Total capital deployed | 100% | Sum of active deals capital |
| Average ROI (closed deals) | 100% | Shown when n greater than 0 |
| Capital deployed per area | Partial | Can be grouped by `reno_deals.area_name` when populated |
| ROI by area comparison | Missing | No aggregation |
| ROI by deal type | Missing | No segmentation |
| Risk scoring | Missing | No historical variance tracking |
| Portfolio optimization | Missing | No which-area-to-invest recommendation |

---

## What's Missing

ROI by Area Comparison: needs closed deals with `reno_deals.area_name`, historical ROI per area, and sufficient sample size per area.
Currently under 5 closed deals, insufficient for meaningful comparison.

Risk Scoring: would use actual vs estimate variance per area, time to
close, holding cost variance. Same data limitation applies.

Portfolio Optimization: would require substantial historical data plus
market research. Not built yet.

---

## When to Build

Trigger conditions: deal volume exceeds 10 closed deals, multiple deals per
area (enables comparison), owner expresses interest in portfolio
optimization. Until then, use manual Excel analysis.

---

## If You Want to Close This Gap

Phase 1 (Quick): add Portfolio tab to Deals module showing aggregate ROI by
area, active deals by area, recent closed deals performance.

Phase 2 (Advanced): risk scoring algorithm using historical variance,
time-to-close metrics, market trend data.

---

## Related Department Sub-modules

- ROI Analysis (roi-analysis.md) - Per-deal calculation
- Financial Planning (financial-planning.md) - Higher-level planning
- Cash Flow (cash-flow.md) - Time-series money movement
