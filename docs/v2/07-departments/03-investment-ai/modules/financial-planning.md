# Financial Planning

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip)
Coverage: Partial - 50%

---

## What It Does

Financial Planning handles per-deal cost tracking: actual vs estimated
costs, holding costs (property tax, maintenance), capital deployment
monitoring across active deals.

Current state: Basic cost tracking exists in Deals module. Full financial
planning features are pending.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Per-deal cost tracking | 100% | purchase_price, reno_budget, reno_cost |
| Capital deployment metric | 100% | Sum of active deals |
| Per-deal profit calculation | 100% | ROI per deal |
| Holding cost tracking | Missing | Property tax, maintenance, utilities |
| Multi-deal financial planning | Missing | No aggregate view across deals |
| Financing scenarios | Missing | No leveraged buy scenarios |
| Tax optimization | Missing | No tax planning features |

---

## What's Missing

Holding Cost Tracking: during renovation (3-6 months), ongoing costs like
property tax, utilities, security, insurance are not tracked. Not yet an
issue since deals complete quickly, but would matter if renovation periods
get longer.

Financing Scenarios: compare all-cash vs leveraged (mortgage) buy. Current
deals are all-cash, so no comparison needed yet.

Tax Optimization: Finnhouses business structure may have tax planning
opportunities (corporate income tax, property tax, specific business tax).
Out of scope for current engineering, requires tax expertise.

---

## Strategic Decision

Recommendation: Don't build comprehensive financial planning until deal
volume exceeds 10, business starts using financing, or owner requests
specific features. For now: track costs accurately, use Excel for ad-hoc analysis.

---

## Related Department Sub-modules

- ROI Analysis (roi-analysis.md) - Calculated from costs
- Cash Flow (cash-flow.md) - Time-series view of cash movement
- Investment Decision Support (investment-decision-support.md) - Higher-level view
