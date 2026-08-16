# ROI Analysis

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip)
Coverage: 100% - Production-grade

---

## What It Does

ROI Analysis calculates expected return on investment for real estate deals:
input is land/house details (price, size, construction cost, target profit),
output is ROI percent, cost-per-plot, recommended sale price, profit per plot.

Used in two places:
1. Pre-purchase - Land Analyzer estimates ROI before buying
2. Post-purchase - Tracks actual vs estimated (in Deals module)

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| ROI calculation (Land Analyzer) | 100% | Cost-per-plot, profit, break-even |
| Actual vs Estimate variance | 100% | In Deals module (ADR-017) |
| Cost breakdown | 100% | Dev cost + Build cost + Profit |
| Market price comparison | 100% | Compares recommended price vs market |
| Area-based parameters | 100% | Type (small/large) adjusts CA percent |

---

## Key Formula

ROI = (Sale Price times Plots minus Total Cost) divided by Total Cost
Total Cost = Land Price + Dev Cost + Build Cost
Sell Price = Cost Per Plot / (1 - Target Profit Percent)

---

## ADRs

- ADR-017: Fix and Flip Deal ROI (actual-vs-estimate tracking) - ../../../04-decisions/accepted/ADR-017.md

---

## Related Department Sub-modules

- Land Analysis (land-analysis.md) - Provides land details input
- Fix and Flip Analysis (fix-flip-analysis.md) - Tracks actual outcomes
- Financial Planning (financial-planning.md) - Future expansion
