# BOQ & Cost Estimation

**Coverage: 30% — Partial, low priority.** What exists is a cost
*calculator*, not a Bill of Quantities *generator* — an important
distinction, since a BOQ is a structured, line-itemized document and the
current tooling is not.

## What exists

- `LandAnalyzer.tsx` — computes `dev_cost`, `build_cost`, and profit
  projections for land/deal evaluation

## What's missing

- No BOQ generator (structured, itemized cost breakdown by trade/material)
- No connection to actual vendor pricing or material specs

## Priority note

Low priority for the same reason as Project Management: this gap traces to
Unit 1's discontinuation, not an active Unit 3/4 need. `Deals.tsx`'s
renovation cost tracking for Fix & Flip is a closer real-world need than a
full construction BOQ system — if this sub-module gets built out, it's more
likely to serve Fix & Flip renovation costing than new-home construction.

## Cross-links

- Technical reference: `06-modules/land-analyzer.md` (if present)
- Related: [../03-investment-ai/financial-planning.md](../03-investment-ai/financial-planning.md)
