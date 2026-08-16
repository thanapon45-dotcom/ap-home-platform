# Construction AI - Known Gaps

Purpose: Track what's missing or intentionally not built.
Updated: 2026-07-23

Critical context: Most gaps in this department are intentional because
Unit 1 (new home construction) was discontinued. See overview.md.

---

## Sub-module Status

| Sub-module | Status | Gap Description |
|------------|--------|------------------|
| Quality Control (QC) | 60% | AI Vision works, accuracy dashboard needs more data |
| Project Management | Not Building | Unit 1 discontinued |
| BOQ and Cost Estimation | 30% | Calculator exists, no project tracker |
| Procurement | Not Building | Unit 1 discontinued |
| Construction Scheduling | Not Building | Unit 1 discontinued |
| Site Monitoring | Not Building | Unit 1 discontinued |

---

## Detailed Gap Analysis

### Quality Control (60% to 100% gap)

What exists:
- LINE OA intake -> AI Vision (GPT-4o) analyzes site photos
- qc_inspections table with pass, severity, ai_summary fields
- Accuracy dashboard at /dashboard -> QC Accuracy tab
- Inspector feedback via LINE Quick Reply

What's missing:
- Multi-photo aggregation (multiple angles of same defect)
- Trend analysis (which defect types are increasing)
- Contractor performance scoring
- Industry-standard reference image library
- Auto-generated formal QC report PDF

Why not prioritized:
- Current QC volume is low (20 inspections, test batch only)
- Inspector adoption rate of feedback button is under 5 percent (1/20)
- Need more data before trend analysis is meaningful

If you want to close this gap:
1. Add multi-photo upload in LINE OA workflow
2. Create contractor_scores table aggregating defect history
3. Add formal PDF report generation

---

### BOQ and Cost Estimation (30% to 100% gap)

What exists:
- ROI calculator in LandAnalyzer.tsx with dev_cost, build_cost, profit_per_plot
- Calculates total project cost for Fix and Flip deals

What's missing:
- Material breakdown (cement, steel, finishing costs separately)
- Labor cost calculation
- Multi-stage cost tracking
- Standard BOQ template by house type

Why not fully prioritized:
- Calculator works for current scope (Fix and Flip deal evaluation)
- Full BOQ generation not needed unless construction work resumes

---

### Project Management, Procurement, Construction Scheduling, Site Monitoring (0%, Not Building)

Status: Not building, all four.

Why: Unit 1 (new home construction) was discontinued per ADR-010. Finnhouses
no longer does construction work. No need for project tracking, procurement,
scheduling, or site monitoring of builds we don't do.

Current alternative: Fix and Flip deals track project progress in
Deals.tsx (4 stages: Evaluating, Renovating, Listed, Closed). This IS
project tracking for Unit 3 (Fix and Flip), but NOT Unit 1 (new builds).

If business changes: If Finnhouses resumes construction services, or starts
a construction management consulting service, re-evaluate this decision.

---

## Strategic Decision: When to Expand Construction AI

Add QC enhancements when:
- QC volume exceeds 10 inspections per week
- Inspector feedback adoption exceeds 50 percent
- New service types are added (e.g. pre-purchase home inspection)

Add Project Management/BOQ when:
- Business resumes construction services (Unit 1 reactivated)
- Or starts construction management consulting service

Add Procurement/Scheduling/Site Monitoring:
- Only if business model fundamentally changes to include construction operations

---

## Recommendation

Current state is correct: Construction AI should be lean because:
1. 30 percent revenue share doesn't justify massive tooling
2. Business scope is narrow (inspection, not construction)
3. Existing QC tools work for current volume

Focus instead on:
1. Making QC more accurate (more training data)
2. Improving inspector adoption of feedback button
3. Building reference image library

---

## Related Documents

- Construction AI Overview (overview.md) - Full department status
- Investment AI Gaps (../03-investment-ai/gaps.md) - Different gap patterns
