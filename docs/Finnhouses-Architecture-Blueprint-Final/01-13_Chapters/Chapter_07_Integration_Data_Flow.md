# Chapter 7 — Integration & Data Flow Architecture

Status: **Final**
Trace Matrix: AO-4.4, AO-5.3, AO-6.6/Major Finding 6.1, BR-3.3

This chapter tests directly whether data flow closes a loop (output influences future decisions) or only flows forward through pipelines that never look back.

## 1. Integration Inventory

| Integration | Type | Direction |
|---|---|---|
| Dashboard → `/api/*` proxy → Hub v1 | Sync (HTTP) | One-way request/response |
| Hub v1 → n8n webhook | Sync trigger, async completion | Fire-and-forget + later callback |
| n8n → Hub `/webhook/n8n`, `/webhook/image-done` | Async callback | Completion signal only |
| n8n → Supabase (native node / `httpRequest`) | Sync (per-execution) | Write-only in observed cases |
| Dashboard → Supabase (server-side API routes) | Sync | Read (dashboards) or write (feedback PATCH) |
| LINE → n8n webhook → Hub `/api/qc` | Async, event-driven | One-way ingestion |

## 2. End-to-End Flow Traces

**Trace A — Buyer Signal → Content**
```
Lead note (CRM) → AG-4.5 (CRM Note Parser, n8n)
   → writes buyer_context_signals {trigger_type, urgency, ...}
   → [END OF TRACE — no further consumer found]

AG-4.1 (Content Agent, Next.js) → reads content_frames (taste library) only
   → does NOT read buyer_context_signals (AO-4.4, no FK per AO-5.3)
```
**Finding**: Not a loop — two disconnected one-way pipelines describing the same business entity. The data needed to make Content Agent buyer-aware already exists; this is a read-path gap, not a data-collection gap.

**Trace B — QC Photo → Decision → Feedback**
```
LINE photo → AG-4.3 (QC Vision) → qc_inspections {pass, severity, ai_summary}
   → QcAccuracy.tsx dashboard → Owner clicks correct/incorrect
   → qc_inspections.human_feedback set
   → [END OF TRACE — human_feedback never read back into future decisions]
```
**Finding**: This is an **audit feedback loop**, not a learning loop.

| Loop Type | Status |
|---|---|
| Audit Loop | Present |
| Feedback Collection Loop | Present |
| Learning Loop | Absent |

Same shape repeats for AG-4.2 (`quality_gate_log`) and AG-4.4 (`market_insights` calibration) — three audit loops, zero learning loops.

**Trace C — Market Intel → Dashboard → (attempted) Content**
```
FB post / manual input → AG-4.4 (Market Intel) → market_insights, area_memory
   → MarketIntel.tsx Calibration tab (human_feedback)
   → [Content Agent does not read market_insights or area_memory — same gap as Trace A]
```

## 3. Loop Closure Analysis

Across all three traces, the same pattern repeats: decision → log → human verification → stop. None close into decision → log → verification → improved future decision. **The system currently implements Automation with Audit, not an Intelligence Loop.**

### Intelligence Loop Maturity Assessment

| Level | Pattern | Finnhouses Status |
|---|---|---|
| L0 | AI Generate Only | Passed |
| L1 | AI + Human Review | Present |
| L2 | AI Decision Logging | Present, partially (3 separate schemas) |
| L3 | Feedback influences future decisions | Absent |
| L4 | Shared intelligence across agents | Absent |
| L5 | Autonomous improvement loop | Absent |

**Conclusion**: Current platform maturity sits at **L1–L2**: Automated Operations with Audit Capability, not yet an Intelligence Operating System.

## 4. Cross-Domain Data Reuse Analysis

| Data written by | Read by any other agent? | Evidence |
|---|---|---|
| `buyer_context_signals` (AG-4.5) | No | AO-4.4, no FK |
| `market_insights` / `area_memory` (AG-4.4) | No | Same |
| `content_frames` performance (AG-4.1) | No | `post_performance` exists but 0 rows |
| `qc_inspections` / `quality_gate_log` `human_feedback` | No | Confirmed across Ch4-6 |

Zero cross-domain reuse found in any of the 5 agents' code paths.

## 5. Architectural Observations

**Major Finding 7.1 — No Cross-Agent Intelligence Reuse** (elevated from AO-7.1)
Evidence: AG-4.1 through AG-4.5 (all 5 agents surveyed).
Finding: Every AI agent currently produces isolated intelligence artifacts. No downstream agent consumes another agent's output as context for future decisions.
Impact: **The platform accumulates data volume but not compounding intelligence.**

**AO-7.2** (Evidence: A) — All 3 human-feedback loops are audit-only; none feed back into future AI behavior.

**AO-7.3** (Evidence: Medium) — `post_performance` (designed to close a loop) has 0 rows despite the n8n workflow and dashboard both being code-complete (ADR-020) — a case where the mechanism has been built but not operated.

## 6. ADR Candidates

**ADR-Candidate-7.1** (Major Finding 7.1): Should Content Agent (AG-4.1) be required to read `buyer_context_signals`/`market_insights` before generating content? Decision Drivers: prompt complexity/cost, freshness requirements, whether to wait for the Shared Intelligence Layer decision or build a point-to-point read sooner.

**ADR-Candidate-7.2 — Learning Mechanism Design (Retrieval, not Training)**: Should human feedback be operationalized as a learning signal for AG-4.2/4.3/4.4? Decision Drivers (expanded): retrieval-based improvement vs. model fine-tuning (fine-tuning is very likely premature given current volumes: `quality_gate_log`=1, `qc_inspections`=20); few-shot example memory from confirmed cases; prompt/context evolution as the tractable near-term mechanism; evaluation-dataset creation as a prerequisite. **The near-term answer is a Decision Memory Layer + Evaluation Dataset, not model training.**

**ADR-Candidate-7.3** (AO-7.3): Should the ADR-020 FB Post Performance Tracker import be prioritized ahead of new loop-closing work, since it is already built and only blocked on operational activation?

**Convergence note**: ADR-Candidate-7.1/7.2 are the data-flow form of ADR-Candidate-4.4/5.3 (Shared Intelligence Layer) and ADR-Candidate-6.4 (AI Execution Boundary) — recommend treating as one 4-facet decision in Chapter 10.
