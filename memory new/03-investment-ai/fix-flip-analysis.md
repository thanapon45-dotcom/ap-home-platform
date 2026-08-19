# Fix & Flip Analysis

**Coverage: 100% — Production.** This is the platform's single highest-value
sub-module by revenue — Unit 3 (Fix & Flip) is 60% of company revenue and is
sourced/executed entirely through this pipeline, structurally separate from
CRM leads (per Architecture Blueprint AO-3.1 — Fix & Flip never passes
through the CRM `leads` table by design).

## What exists

- `Deals.tsx` — Fix & Flip Kanban pipeline, ROI and cost variance tracking
  (actual vs. estimate)
- Architecture Blueprint Ch3 — renovation intelligence findings (BC-3.3)

## Cross-links

- Technical reference: `06-modules/deals.md` (if present)
- Architecture Blueprint: Ch3 AO-3.1 (Two Structurally Separate Value
  Streams), BR-3.1 (Fix & Flip excluded from CRM classification by design)
- Related: [roi-analysis.md](./roi-analysis.md), [../02-construction-ai/project-management.md](../02-construction-ai/project-management.md)
