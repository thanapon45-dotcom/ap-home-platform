# Investment AI - Known Gaps

Purpose: Track what's missing or partial in Investment AI Department.
Updated: 2026-07-23

---

## Sub-module Status

| Sub-module | Status | Gap Description |
|------------|--------|------------------|
| ROI Analysis | 100% | None |
| Land Analysis | 100% | None |
| Fix and Flip Analysis | 100% | None |
| Investment Decision Support | Partial | Portfolio-level insights not yet built |
| Financial Planning | Partial | Cost tracking exists in Deals, no comprehensive model |
| Cash Flow | Minimal | Capital deployed metric only, no time-series tracking |

---

## Detailed Gap Analysis

### Investment Decision Support (60% coverage)

What exists:
- Single-deal ROI analysis
- Land Analyzer with ROI estimates
- Deals Kanban with cost tracking

What's missing:
- Portfolio-level view (multiple deals across areas)
- Cross-area comparison (which area has best historical ROI)
- Risk-adjusted return calculations
- Capital allocation optimization

Why not fully prioritized:
- Need more closed deals (current: under 5) for statistical significance
- Single-deal decision support works for current scale

If you want to close this gap:
1. Build portfolio dashboard at /deals -> Portfolio tab
2. Add area-level ROI aggregations
3. Create risk scoring based on area history

---

### Financial Planning (50% coverage)

What exists:
- Per-deal cost tracking in Deals.tsx (purchase_price, reno_cost, sale_price)
- Total capital deployed metric
- Per-plot profit calculation

What's missing:
- Multi-deal financial planning
- Tax considerations
- Holding cost analysis (property tax, maintenance during renovation)
- Financing scenarios (all-cash vs leveraged)

Why not fully prioritized:
- Current deal volume is small (under 5 active)
- Single-deal financial analysis is sufficient for now

---

### Cash Flow (30% coverage)

What exists:
- Capital Deployed metric (sum of active deals purchase_price + reno_cost)

What's missing:
- Time-series cash flow tracking
- Expected vs actual cash outflow per stage
- Cash flow forecasting (next 6-12 months)
- Integration with actual payment records

Why at this level:
- Current deal volume is too small to need detailed tracking
- Excel/manual tracking may be sufficient

If you want to close this gap:
1. Add cash_flow_events table (date, deal_id, type, amount)
2. Build cash flow chart in Deals.tsx
3. Auto-calculate from deal stage transitions

---

## Strategic Question

This department generates 60 percent of revenue. Are the 20 percent gaps
worth closing?

Pros of closing gaps: Better portfolio decisions could increase returns,
financial planning helps scale, cash flow tracking essential for larger
capital deployments.

Cons of building more: Current deal volume (under 5) may not justify
tooling investment, risk of over-engineering at small scale.

Recommendation:
- Phase 1 (Do Now): Land Analysis improvements (area heatmap, market trend overlays)
- Phase 2 (When Volume greater than 10): Investment Decision Support portfolio dashboard
- Phase 3 (When Volume greater than 20): Cash Flow time-series tracking

---

## Related Documents

- Investment AI Overview (overview.md) - Full department status
- Marketing AI Gaps (../01-marketing-ai/gaps.md) - Cross-reference for shared analytics
