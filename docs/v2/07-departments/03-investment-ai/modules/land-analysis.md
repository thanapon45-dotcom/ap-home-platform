# Land Analysis

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip)
Coverage: 100% - Production-grade

---

## What It Does

Land Analysis evaluates vacant land / used houses for Fix and Flip
investment: enter land details (price, size, development cost), specify
number of plots to sell, calculate cost-profit-ROI in real-time, pin GPS on
map (Leaflet), save as project which can immediately become a Fix and Flip deal.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| ROI calculator | 100% | Full formula with profit percent |
| Type-based parameters (small/large) | 100% | CA percent varies |
| GPS Map picker | 100% | Leaflet integration with OpenStreetMap |
| Save as project | 100% | projects table via /api/projects |
| Link to Fix and Flip deal | 100% | reno_deals.land_project_id (ADR-022) |
| Market price comparison | 100% | Premium/discount vs market displayed |

---

## Key Calculation Inputs

Total land price, total area (sq wah), development cost per sq wah CA,
number of plots/units, usable area per house, construction cost per sq m,
target profit percent, market price per house (optional), GPS coordinates.

---

## ADRs

- ADR-022: Land Analyzer to Fix and Flip Deals link - ../../../04-decisions/accepted/ADR-022.md

---

## Related Department Sub-modules

- ROI Analysis (roi-analysis.md) - Core calculation engine
- Fix and Flip Analysis (fix-flip-analysis.md) - Next step after Land Analysis
- Investment Decision Support (investment-decision-support.md) - Future portfolio view
