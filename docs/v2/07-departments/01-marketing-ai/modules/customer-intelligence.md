# Customer Intelligence

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: Embedded - 50%

---

## What It Does

Customer Intelligence captures deep buyer psychology that informs all
marketing messaging: who the customer is, what they fear, what they want,
how they make decisions, what triggers conversion.

Source: Curated from real customer interviews and field experience, encoded
into BRAND_FACTS in AIContent.tsx.

---

## What's Currently Embedded

Primary Profile: Age 30-50, business owner/manager, income 100K+/month,
married with kids, 2 cars, moving up (not first home).

Decision Maker: Wife is the real decision maker - content must speak to her.

Conversion Triggers (ranked by strength):
1. Old house finally sold, must move soon (strongest)
2. New job / higher position
3. Wants to live near family
4. Close to workplace

Ghost Signal: Lead stops answering calls and LINE messages - re-engage with
content addressing their core fear.

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Customer profile (encoded in BRAND_FACTS) | 100% | Rich, detailed |
| Decision maker dynamics | 100% | Wife identified as primary |
| Conversion triggers ranking | 100% | 4 ranked triggers |
| Ghost signal detection | Partial | Concept exists, no automated detection |
| Behavior analytics dashboard | Missing | No tracking of which triggers actually converted |
| Segment-level performance | Missing | Can't compare which segments convert best |

---

## Why No Standalone Dashboard

Customer Intelligence is embedded into Content AI via BRAND_FACTS. The
insights inform every prompt - they are not separate analytics. Building a
standalone dashboard is a measurement problem, not a generation problem.

---

## Strategic Gap

Recommendation: Don't build standalone. Update BRAND_FACTS periodically
based on real customer feedback and sales conversion data.

---

## Related Department Sub-modules

- Content AI (content-ai.md) - Where BRAND_FACTS lives
- Sales Analytics (sales-analytics.md) - Where this would integrate if built
