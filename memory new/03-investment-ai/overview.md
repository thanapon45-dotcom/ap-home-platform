# Investment AI Department

**Coverage: 80% — Strong.** Carries Unit 3 (Fix & Flip, 60% of revenue) —
this is the platform's highest-revenue department and its second-most-built,
after Marketing.

## Sub-modules

| Sub-module | Coverage | Status | Page |
|---|---|---|---|
| ROI Analysis | 100% | Production | [roi-analysis.md](./roi-analysis.md) |
| Land Analysis | 100% | Production | [land-analysis.md](./land-analysis.md) |
| Fix & Flip Analysis | 100% | Production | [fix-flip-analysis.md](./fix-flip-analysis.md) |
| Investment Decision Support | 60% | Partial | [investment-decision-support.md](./investment-decision-support.md) |
| Financial Planning | 50% | Partial — cost tracking only, not a full model | [financial-planning.md](./financial-planning.md) |
| Cash Flow | 30% | Partial — one metric inside `Deals.tsx` | [cash-flow.md](./cash-flow.md) |

## What's strong

`LandAnalyzer.tsx` (ROI, land analysis) and `Deals.tsx` (Fix & Flip Kanban,
actual-vs-estimate ROI) are both in daily production use and directly support
the 60%-of-revenue business line.

## What's missing

- **Cash Flow** has no dedicated tracker — only a `capital deployed` metric
  inside `Deals.tsx`. There is no forward-looking cash position or timing
  view across active deals.
- **Investment Decision Support** is real but partial — ROI + land + deal
  data exist, but there's no portfolio-level view (e.g. comparing multiple
  active/prospective deals against each other, capital allocation across
  them).
- **Financial Planning** is closer to cost tracking than a financial model —
  no scenario planning, no multi-deal projection.

## Priority note

Given this department carries 60% of revenue, Cash Flow and Investment
Decision Support are the highest-value gaps to close in the whole platform —
higher priority than anything in Construction AI.

## Cross-links

- Cross-department hub: `DashboardOS.tsx` (partial Investment dashboard)
- Technical reference: `06-modules/` for `LandAnalyzer.tsx`, `Deals.tsx`
