# Quality Control (QC)

**Coverage: 60% — Production.** The only Construction AI sub-module still
actively worth investing in, since it serves Unit 4 (Consulting/Inspection,
30% of revenue) rather than the discontinued Unit 1.

## What exists

- QC Line — LINE OA intake: site photo in → AI Vision defect check → Thai
  reply within ~15s (see `qc-line-system-blueprint.md`)
- `QcAccuracy.tsx` — dashboard for reviewing AI defect calls, human
  correct/incorrect feedback
- `qc_inspections` / `qc_defects` / `qc_standards` / `qc_daily_usage` Supabase
  tables

## What's missing to reach further coverage

- **Contractor scoring system** — no aggregation of defect history per
  contractor/site over time; each inspection is currently a standalone event
- Per Architecture Blueprint Ch7, the QC feedback loop is **audit-only** —
  human corrections are logged but do not yet feed back into future AI
  behavior (no learning loop, Intelligence Loop Maturity L1–L2)

## Cross-links

- Technical reference: `06-modules/qc-line.md` (if present), `QcAccuracy.tsx`
- Architecture Blueprint: Ch4 AG-4.3 (QC Vision Agent), Ch7 Trace B (QC audit
  loop), Ch5 (`qc_inspections` schema)
