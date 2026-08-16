# Marketing AI Department

> Revenue share: 10% (Unit 2 - Brokerage)
> Coverage: 85% (5/6 sub-modules in production, 1 partial)
> Priority: Operational (well-built, focus on quality not expansion)

---

## What This Department Does

Marketing AI เป็น department ที่รับผิดชอบการสร้าง demand, การจัดการ lead, และการตลาด content สำหรับธุรกิจอสังหาริมทรัพย์ของ Finnhouses
แม้จะมีสัดส่วนรายได้แค่ 10% (Unit 2 - Brokerage) แต่เป็น department ที่ platform ลงทุนมากที่สุดในแง่ tooling

Core functions:
- Generate content สำหรับ Facebook Page (blog conversion + property listings + keyword-driven)
- Capture และ nurture leads จากหลายช่องทาง (LINE, Web forms, FB)
- Build market intelligence จาก real-world observations
- Measure performance และ iterate

---

## Sub-modules

| Sub-module | Status | Coverage | Module Doc |
|------------|--------|----------|------------|
| Market Intelligence | Production | 100% | [modules/market-intelligence.md](modules/market-intelligence.md) |
| Lead Generation | Production | 100% | [modules/lead-generation.md](modules/lead-generation.md) |
| CRM | Production | 100% | [modules/crm.md](modules/crm.md) |
| Content AI | Production | 100% | [modules/content-ai.md](modules/content-ai.md) |
| Customer Intelligence | Embedded | 50% | [modules/customer-intelligence.md](modules/customer-intelligence.md) |
| Sales Analytics | Partial | 40% | [modules/sales-analytics.md](modules/sales-analytics.md) |

---

## Coverage Summary

| Status | Count | % of Department |
|--------|-------|-----------------|
| Production | 4/6 | 67% |
| Embedded | 1/6 | 17% |
| Partial | 1/6 | 17% |
| Missing | 0/6 | 0% |

Overall: 85% coverage - the highest of the 3 departments.

---

## Revenue Context

Unit 2 (Brokerage) = 10% revenue
Unit 3 (Fix & Flip) = 60% revenue (covered by Investment AI)
Unit 4 (Inspection) = 30% revenue (covered by Construction AI)

Key insight: แม้ Marketing AI จะครอบคลุม 85% ของ sub-modules แต่รายได้จริงจาก Marketing Department มีแค่ 10%
Investment AI ที่ generate 60% revenue มี code น้อยกว่า แต่ impact สูงกว่า

---

## Architecture Decisions (ADRs)

Key ADRs affecting this department:
- [ADR-005](../../04-decisions/accepted/ADR-005.md) - Market Intel signals schema
- [ADR-009](../../04-decisions/accepted/ADR-009.md) - Buyer Segment decoupling
- [ADR-010](../../04-decisions/accepted/ADR-010.md) - Finnhouses business model correction
- [ADR-012](../../04-decisions/accepted/ADR-012.md) - Thai quality + model fix
- [ADR-016](../../04-decisions/accepted/ADR-016.md) - WF1 AI Quality Gate
- [ADR-018](../../04-decisions/accepted/ADR-018.md) - CRM business_unit correction
- [ADR-019](../../04-decisions/accepted/ADR-019.md) - Remove reno from CRM
- [ADR-020](../../04-decisions/accepted/ADR-020.md) - FB Post Performance Tracker fix

[Full ADR index](../../04-decisions/accepted/README.md)

---

## Known Issues

- [ISSUE-010](../../05-incidents/ISSUE-010.md) - Market Intel maxTokens truncation
- [ISSUE-016](../../05-incidents/ISSUE-016.md) - AI Content Studio Thai language issues
- [ISSUE-017](../../05-incidents/ISSUE-017.md) - OS Dashboard Hub bypass

[Full issue index](../../05-incidents/README.md)

---

## Related Documents

- [Investment AI Overview](../03-investment-ai/overview.md) - Owns Unit 3 (Fix & Flip, 60% revenue)
- [Construction AI Overview](../02-construction-ai/overview.md) - Owns Unit 4 (Inspection, 30% revenue)
