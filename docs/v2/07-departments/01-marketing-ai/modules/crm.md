# CRM (Customer Relationship Management)

Department: Marketing AI (../../overview.md)
Revenue %: 10% (Brokerage)
Coverage: 100% - Production-grade

---

## What It Does

CRM tracks leads from first contact to closed deal with AI-powered insights:
- Lead scoring (0-100%)
- AI analysis (pain points, strategy, script)
- Nurture sequence generation
- CSV import/export

Business Unit (corrected per ADR-018/019):
- consult - inspection/construction consulting
- list - property listing/brokerage
- build (REMOVED) - Unit 1 discontinued (per ADR-010)
- reno (REMOVED) - Fix & Flip sourced through Deals module (per ADR-019)

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| Lead pipeline (Kanban) | 100% | 4 stages: New Lead -> Follow Up -> Qualified -> Closed |
| AI lead scoring | 100% | Auto-generated score with color badges |
| AI analysis per lead | 100% | Pain points, strategy, call script via Claude |
| Overview dashboard | 100% | Funnel + source distribution + hot leads |
| Nurture sequence (30-day) | 100% | AI-generated personalized plan |
| CSV import/export | 100% | Bulk operations |
| Business unit auto-classification | 100% | Keyword classifier |

---

## ADRs

- ADR-018: CRM business_unit correction - ../../../04-decisions/accepted/ADR-018.md
- ADR-019: Remove reno from CRM - ../../../04-decisions/accepted/ADR-019.md

---

## Known Issues

- ISSUE-013: Supabase RLS hardening (anon key restrictions) - ../../../05-incidents/ISSUE-013.md

---

## Related Department Sub-modules

- Lead Generation (lead-generation.md) - Primary source of leads
- Sales Analytics (sales-analytics.md) - Future integration for conversion tracking
