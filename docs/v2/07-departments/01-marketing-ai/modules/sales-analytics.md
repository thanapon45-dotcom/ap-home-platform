# Sales Analytics

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: Partial - 40%

---

## What It Does

Sales Analytics tracks post-publish performance of marketing content:
- Reach, engagement, click-through from Facebook Graph API
- Lead conversion from content interactions
- Campaign ROI attribution

Current state: Infrastructure is built but waiting on real data flow.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Blog content performance | Partial | post_performance table has 0 rows (per ADR-020) |
| FB content performance | Partial | Same blocker - anon key RLS issue |
| Conversion funnel analytics | Missing | No visitor to lead to closed tracking |
| Campaign ROI attribution | Missing | No per-campaign revenue tracking |
| Lead source attribution | Partial | CRM tracks source, but no conversion rate |

---

## Known Issues

- ADR-020: FB Post Performance Tracker fix (anon key to service_role key pending) - ../../../04-decisions/accepted/ADR-020.md

---

## Why This Gap Exists

Root cause: post_performance table was designed but the n8n workflow that
writes to it has been blocked by:
1. Hardcoded anon key in workflow (should be service_role)
2. RLS enabled but no policy for anon on content_posts / post_performance

---

## If You Want to Close This Gap

Prerequisites:
1. Add SUPABASE_SERVICE_KEY to n8n environment variables
2. Import the fixed workflow to n8n
3. Activate it

Then:
1. post_performance will start receiving real data
2. Content Performance dashboard will populate
3. Build lead source attribution analytics

---

## Related Department Sub-modules

- Lead Generation (lead-generation.md) - Source data for attribution
- CRM (crm.md) - Lead to closed conversion data
