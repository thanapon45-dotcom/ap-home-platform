# Project Management

**Coverage: 30% — Partial, low priority.** No dedicated construction-phase
project tracking exists. What coverage there is comes from `Deals.tsx` (Fix &
Flip pipeline) and `LandAnalyzer.tsx`, both built for Investment AI purposes,
not construction project management.

## What exists

- `Deals.tsx` — Fix & Flip Kanban, tracks renovation deals through stages
- `LandAnalyzer.tsx` — land/deal evaluation, incidentally touches project
  scoping

## What's missing

- Dedicated construction-phase tracking (foundation → structure → MEP → QC →
  handover, the stages referenced in `sites.stage` in the QC blueprint)
- No timeline/Gantt view, no phase-gate tracking

## Priority note

Low priority — this gap traces to Unit 1's discontinuation (ADR-010), not to
Unit 4's needs. Unit 4 (Consulting/Inspection) uses `sites.stage` already via
QC Line; a fuller project-management module would only be justified if a new
business need emerges (e.g. tracking Fix & Flip renovation phases in more
detail than `Deals.tsx` currently does).

## Cross-links

- Technical reference: `06-modules/` for `Deals.tsx`, `LandAnalyzer.tsx`
- Related: [../03-investment-ai/fix-flip-analysis.md](../03-investment-ai/fix-flip-analysis.md)
