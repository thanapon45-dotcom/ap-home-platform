# Market Intelligence

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: 100% - Production-grade

---

## What It Does

Market Intelligence is the platform's "memory of the real estate market" -
catches ground-truth observations from the field (sales rep notes, client
conversations, observation of Facebook posts) and uses them to:
- Build area-specific market knowledge
- Create positioning content (via "Positioned Content")
- Track what Finnhouses knows about each area over time

Input: Human observation (typed in or sent via Telegram)
Output: Structured records in market_insights + content_frames tables

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Capture observations | 100% | Text + area + timing signal via web form or Telegram |
| AI categorization | 100% | 9-signal schema (ADR-005): demand, price, offer, finance, value, location, urgency, seller_motivation, liquidity |
| Area memory | 100% | Built into BRAND_FACTS + market_intel table |
| Positioned content | 100% | Auto-generated and stored in content_frames |
| Feedback loop | Partial | Calibration tab exists (ADR-023), but no real feedback data yet |

---

## ADRs

- ADR-005: Market Intel 9-signal schema - ../../../04-decisions/accepted/ADR-005.md
- ADR-023: Market Intel confidence calibration - ../../../04-decisions/accepted/ADR-023.md

---

## Known Issues

- ISSUE-010: Market Intel maxTokens truncation - ../../../05-incidents/ISSUE-010.md

---

## Related Department Sub-modules

- CRM (crm.md) - Uses Market Intel for lead scoring context
- Content AI (content-ai.md) - Primary consumer of market_insights + content_frames
