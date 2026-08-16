# Marketing AI - Known Gaps

Purpose: Track what's missing or partial in Marketing AI Department.
Updated: 2026-07-23

---

## Sub-module Status

| Sub-module | Status | Gap Description |
|------------|--------|------------------|
| Market Intelligence | 100% | None |
| Lead Generation | 100% | None |
| CRM | 100% | None |
| Content AI | 100% | None |
| Customer Intelligence | Embedded | Currently part of Content AI (BRAND_FACTS) - no standalone analytics dashboard |
| Sales Analytics | Partial | No conversion funnel analytics, no campaign ROI dashboard |

---

## Detailed Gap Analysis

### Customer Intelligence (50% coverage)

What exists:
- BRAND_FACTS in AIContent.tsx captures detailed customer profile:
  - Age 30-50, business owner/manager, income 100K+/month
  - Decision maker is wife (content must speak to her)
  - Conversion triggers ranked by strength
  - Ghost signals and trust triggers

What's missing:
- Standalone dashboard for customer behavior analysis
- No analytics on which messaging resonates with which segment
- No tracking of customer journey across touchpoints

Why not prioritized:
- 10 percent revenue share (Unit 2)
- Embedded insights in BRAND_FACTS already inform Content AI prompts

If you want to close this gap:
- Build customer analytics dashboard (read from leads table analytics)
- Track conversion trigger effectiveness

---

### Sales Analytics (40% coverage)

What exists:
- Deals.tsx shows ROI variance per deal (post-close)
- DashboardOS.tsx shows pipeline counts by stage
- OperationalDashboard.tsx shows FB/Blog queue status

What's missing:
- Conversion funnel analytics (visitor to lead to qualified to closed)
- Campaign ROI dashboard (per-content performance)
- Lead source attribution (which channel converts best)
- Content Performance fully validated (post_performance has 0 real rows)

Why not prioritized:
- post_performance has 0 real rows (per ADR-020, anon key blocked RLS)
- Wait for FB Post Performance Tracker workflow to be activated

If you want to close this gap:
1. Activate workflow with service_role key (per ADR-020)
2. Build Content Performance dashboard consuming real data
3. Add Lead Source attribution tracking

---

## Strategic Decision: Build or Don't Build?

Marketing AI Department has 85 percent coverage and the gaps are:
- Customer Intelligence (analytics-heavy)
- Sales Analytics (data-heavy)

Both gaps require analytics dashboards. They don't generate revenue
directly, they measure existing revenue.

Recommendation: Don't build new analytics unless business owner requests
it. Focus on:
1. Activate Content Performance data flow (ADR-020)
2. Keep maintaining current Marketing AI tools
3. Add Customer Intelligence as derived insights in BRAND_FACTS when needed

---

## Related Documents

- Marketing AI Overview (overview.md) - Full department status
- Investment AI Gaps (../03-investment-ai/gaps.md) - Cross-reference for shared analytics needs
