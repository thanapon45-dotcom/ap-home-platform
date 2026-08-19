# Sales Analytics

**Coverage: 40% — Partial (gap)**

## Current state

Split between `Deals.tsx` (ROI variance for Fix & Flip) and `DashboardOS.tsx`
(Revenue Pipeline: Traffic → Leads → Appointments → Proposals → Closed Deals).

## Gap

No conversion-rate analytics (stage-to-stage drop-off, time-in-stage,
source-attribution) exists as a dedicated view. The Revenue Pipeline widget on
`DashboardOS.tsx` shows counts, not conversion rates.

## Note

Traffic card currently shows "—" pending ~7 days of Vercel Analytics data
accumulation (per Wave 4 deployment notes) — this is a data-availability gap,
not a missing feature.
