# Departments Overview

> **Purpose:** Business-function view of AP-Home Platform - complements the
> technical-component view in docs/v2/06-modules/ (not yet created).
> This layer answers "who owns what business outcome"; the modules layer
> answers "what code/component does what".

---

## Departments at a Glance

| Department | Revenue % | Priority | Coverage | Status |
|------------|-----------|----------|----------|--------|
| [Investment AI](03-investment-ai/overview.md) | 60% | High | 80% | Production-grade |
| [Construction AI](02-construction-ai/overview.md) | 30% | Medium | 15% | Limited (Unit 1 discontinued) |
| [Marketing AI](01-marketing-ai/overview.md) | 10% | Operational | 85% | Production-grade |

---

## Revenue-Driven Priority Order

Per docs/v2/01-vision/business-model.md (not yet split from BUSINESS_MODEL.md):

    Unit 3 (Fix & Flip) = 60% revenue -> Investment AI (primary owner)
    Unit 4 (Inspection) = 30% revenue -> Construction AI (QC only -- Unit 1 discontinued)
    Unit 2 (Brokerage)  = 10% revenue -> Marketing AI (CRM + Content AI)

Implication: Platform investment should be proportional to revenue:
- Investment AI gets the most engineering attention
- Construction AI is intentionally lean (Unit 1 discontinued)
- Marketing AI is well-built but covers a smaller revenue share

---

## Coverage Summary Across All Departments

    Investment AI (60% revenue)   XXXXXXXXXXXX... 80%
    Construction AI (30% revenue) XX.............. 15% (intentional)
    Marketing AI (10% revenue)    XXXXXXXXXXXXXXX 85%

    Overall Platform Coverage: ~60%

---

## Related Documents

- ADR Index: ../04-decisions/accepted/README.md - All accepted architecture decisions
- Incident Log: ../05-incidents/README.md - All documented issues
- Business Model, Module Index, AI Team Constitution - not yet split into docs/v2/
