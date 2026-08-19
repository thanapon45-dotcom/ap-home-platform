# Construction AI Department

**Coverage: 15% — Mostly intentional gap.** Unit 1 (new-home construction) is
**discontinued** (ADR-010, confirmed). Most of this department's sub-modules
were scoped for a business line that no longer operates — the low coverage
here is a strategic outcome, not an execution failure. The one sub-module
that remains genuinely relevant is Quality Control, which serves **Unit 4
(Consulting/Inspection, 30% of revenue)**.

## Sub-modules

| Sub-module | Coverage | Status | Priority | Page |
|---|---|---|---|---|
| Quality Control (QC) | 60% | Production — AI Vision + dashboard | Keep building (serves Unit 4) | [quality-control.md](./quality-control.md) |
| Project Management | 30% | Partial — piggybacks on `Deals.tsx` | Low | [project-management.md](./project-management.md) |
| BOQ & Cost Estimation | 30% | Partial — calculator only, not a generator | Low | [boq-cost-estimation.md](./boq-cost-estimation.md) |
| Procurement | 0% | Missing | Not building (Unit 1 discontinued) | [procurement.md](./procurement.md) |
| Construction Scheduling | 0% | Missing | Not building (Unit 1 discontinued) | [construction-scheduling.md](./construction-scheduling.md) |
| Site Monitoring | 0% | Missing | Not building (Unit 1 discontinued) | [site-monitoring.md](./site-monitoring.md) |

## Reading this department correctly

Do not treat the 15% figure as a backlog to close. Only QC has a live
business reason to keep investing. Project Management and BOQ & Cost
Estimation show partial coverage only because `Deals.tsx` and
`LandAnalyzer.tsx` happen to touch adjacent Fix & Flip work — that overlap is
incidental, not evidence those sub-modules are half-built for Unit 1's sake.

## Action item

`CLAUDE.md`'s Business Units table (Jun 6, 2026) still lists Unit 1 as an
active business unit with target customers and service area — this is stale
against ADR-010 and should be corrected (flagged separately, still open as of
this document).

## Cross-links

- Technical reference: `06-modules/` for QC Line (LINE OA), `QcAccuracy.tsx`
- Business context: Architecture Blueprint Ch3 (BC-3.4 Construction Quality
  Assurance), `decisions.md` (ADR-010)
