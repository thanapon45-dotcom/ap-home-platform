# Lead Generation

**Coverage: 100% — Production**

## Implementing components

- `CRM.tsx` (Pipeline + Overview tabs)
- `LandAnalyzer.tsx` → creates `reno_deals` records
- `PropertyReview.tsx` (property intake → listing pipeline)

## What it does

Captures leads from Budget Tool, LINE Seller Intake, and property submissions;
routes them into the CRM Kanban (`new → followup → qualified → closed`).

## Note

Fix & Flip deals (BD-3.3, 60% of revenue) do **not** pass through this pipeline
— they're sourced and executed entirely through `Deals.tsx` by design (see
Architecture Blueprint AO-3.1). Lead Generation as documented here covers
Brokerage and Home Building leads only.
