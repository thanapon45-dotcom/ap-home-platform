# Cash Flow

Department: Investment AI (../../overview.md)
Revenue %: 60% (Fix and Flip)
Coverage: Minimal - 30%

---

## What It Does

Cash Flow tracks money in/out over time: outflows (land purchase,
renovation costs, holding costs), inflows (sale proceeds), net position by
deal, by month, by quarter.

Current state: Only Capital Deployed snapshot exists. No time-series tracking.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Capital Deployed snapshot | 100% | Sum of active deals capital |
| Per-deal cash in/out | Missing | No per-deal event log |
| Time-series cash flow | Missing | No monthly/quarterly charts |
| Cash flow forecasting | Missing | No projection of future cash needs |
| Payment scheduling | Missing | No planned payment dates |

---

## What's Missing

Time-Series Tracking: would need a cash_flow_events table (date, deal_id,
event_type, amount, direction) to answer questions like "how much cash do I
need in Q3 2026?"

Forecasting: would calculate expected cash events based on deal stage
transitions, average time per stage, renovation budget spend rate.

---

## Why Minimal Coverage

Current context: fewer than 5 active deals, quick flip cycles (probably
under 6 months per deal), manual Excel tracking may suffice. This becomes
important when deal volume exceeds 10, or financing is used (interest
payments need tracking).

---

## If You Want to Close This Gap

Recommendation: don't build until deal volume justifies it (greater than
10), owner requests specific cash flow forecasting, or financing is added.

Minimum viable approach: add actual_payment_date field to reno_deals,
manual entry of payments, simple line chart of cumulative cash position.

---

## Related Department Sub-modules

- ROI Analysis (roi-analysis.md) - Output of cash deployed
- Financial Planning (financial-planning.md) - Higher-level planning
- Investment Decision Support (investment-decision-support.md) - Portfolio view
