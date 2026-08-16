# Quality Control (QC)

Department: Construction AI (../../overview.md)
Revenue %: 30% (Inspection)
Coverage: 60% - Production-grade (intentionally limited scope)

---

## What It Does

Quality Control is the inspection core of the Construction AI department:
1. Site supervisor / inspector sends photo via LINE OA
2. AI Vision (GPT-4o) analyzes the photo, identifies defects
3. Severity classification (critical / major / minor)
4. Inspector confirms via Quick Reply
5. Data stored in qc_inspections table
6. Accuracy dashboard shows real-world performance

Business Unit: Unit 4 - Inspection/consulting for construction work

---

## Coverage

| Capability | Status | Notes |
|------------|--------|-------|
| LINE OA photo intake | 100% | wf_qc_line 2 workflow |
| AI Vision analysis (GPT-4o) | 100% | Detects defects, severity, location |
| qc_inspections table schema | 100% | pass, severity, ai_summary, human_feedback |
| Inspector feedback (LINE Quick Reply) | 100% | Correct/incorrect buttons |
| Accuracy dashboard | 100% | /dashboard -> QC Accuracy tab |
| Multi-photo aggregation | Missing | Currently 1 photo per inspection |
| Trend analysis | Missing | Need more data |
| Contractor scoring | Missing | Future feature |
| Formal PDF report | Missing | Future feature |

---

## Honest Data State (per ADR-015)

Per the design philosophy of honest low-data state:

Current status (July 2026):
- Total inspections: 20 (test batch)
- With human feedback: 1
- Accuracy cannot be reliably calculated (need more than 10 for statistical significance)
- Dashboard shows "not enough data to summarize" instead of fake percentages

This avoids misleading confidence from small samples and false precision
that misleads business decisions.

---

## Key Tables

qc_inspections: id, line_message_id, image_url, pass (boolean), severity
(critical/major/minor), ai_summary, human_feedback, human_feedback_at,
created_at

qc_standards: id, category, image_url, description (reference images for AI training)

qc_daily_usage: date, count (daily usage tracking)

---

## ADRs

- ADR-015: QC Line Accuracy Dashboard - ../../../04-decisions/accepted/ADR-015.md

---

## Known Issues

- ISSUE-013: Supabase RLS hardening - ../../../05-incidents/ISSUE-013.md

---

## Strategic Note: Why QC is the Only Sub-module

QC is the ONLY sub-module in Construction AI department because:
- Unit 4 = Inspection - Third-party verification of construction work
- Unit 1 = Discontinued - No new construction, no need for procurement/scheduling
- Finnhouses business model = Help customers verify contractor work, not do construction

If Unit 1 reactivates, other sub-modules would need to be built.

---

## Related Department Sub-modules

None - Quality Control is the only active sub-module in Construction AI department.

Related cross-department:
- Investment AI Overview (../../03-investment-ai/overview.md) - Different scope (Fix and Flip, not Inspection)
- Marketing AI Overview (../../01-marketing-ai/overview.md) - Different scope (Brokerage)
