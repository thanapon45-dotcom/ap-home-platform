# Construction AI Department

Revenue share: 30% (Unit 4 - Inspection/Consulting)
Coverage: 15% (1/6 sub-modules in production, others intentionally not built)
Priority: Medium - Limited by business unit scope

---

## What This Department Does

Construction AI is the department responsible for third-party verification
of construction work - inspecting quality on behalf of homeowners who hired
a contractor.

Core functions:
- Inspect construction work via LINE OA + AI Vision (GPT-4o)
- Produce quality inspection reports
- Help clients decide whether to release final payment

---

## Important Business Context

Unit 1 (new home construction) was DISCONTINUED (per ADR-010).

Implications:
- This department covers inspection/consulting only (Unit 4)
- We do NOT need: Procurement, Construction Scheduling, Site Monitoring
- We do NOT need: Full Project Management (BOQ for new builds)
- We focus on: QC of existing construction work

This is why coverage is 15 percent - most sub-modules are intentionally not built.

---

## Sub-modules

| Sub-module | Status | Coverage |
|------------|--------|----------|
| Quality Control (QC) | Production | 60% (modules/quality-control.md) |
| Project Management | Not Building | 0% (Unit 1 discontinued) |
| BOQ and Cost Estimation | Partial | 30% (Calculator exists in LandAnalyzer) |
| Procurement | Not Building | 0% (Unit 1 discontinued) |
| Construction Scheduling | Not Building | 0% (Unit 1 discontinued) |
| Site Monitoring | Not Building | 0% (Unit 1 discontinued) |

---

## Coverage Summary

| Status | Count | Percent |
|--------|-------|---------|
| Production | 1/6 | 17% |
| Partial | 1/6 | 17% |
| Not Building (intentional) | 4/6 | 67% |

Overall: 15 percent intentional coverage - the rest is consciously out of scope.

---

## Why This Department is Intentionally Lean

Business Reality:
- Unit 4 (Inspection/Consulting) = 30 percent of revenue
- Unit 1 (Construction) = DISCONTINUED
- Finnhouses does NOT do construction work directly

Comparison: Marketing vs Construction

| Aspect | Marketing AI | Construction AI |
|--------|--------------|------------------|
| Revenue share | 10% | 30% |
| Coverage | 85% | 15% |
| Reason | Mature tooling, multiple use cases | Unit 1 discontinued, narrow scope |
| Investment priority | Maintain only | Maintain only |

Conclusion: Both departments are operational - neither needs expansion.
Construction AI is correctly lean because it serves a narrow business scope.

---

## ADRs

- ADR-015: QC Line Accuracy Dashboard - ../../04-decisions/accepted/ADR-015.md

---

## When to Expand This Department

Current triggers for expansion:
1. Volume increase: QC inspections greater than 10/week (currently low)
2. Service expansion: New inspection service types
3. Contractor network: If Finnhouses starts managing contractor relationships

Until then: Focus on QC quality and accuracy.

---

## Related Documents

- Investment AI Overview (../03-investment-ai/overview.md) - Owns 60% revenue (Fix and Flip)
- Marketing AI Overview (../01-marketing-ai/overview.md) - Owns 10% revenue (Brokerage)
