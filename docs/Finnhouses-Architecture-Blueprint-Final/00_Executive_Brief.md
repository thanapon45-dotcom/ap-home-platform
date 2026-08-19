# Finnhouses AI Platform Architecture Blueprint — Executive Brief

Status: **Complete** *(assembled from Final Summary + ADR Register only — no new interpretation introduced)*

---

## Page 1 — Executive Overview

**Vision**: AI-native, Human-Centered Real Estate Intelligence Operating System.

**Current Position**: Finnhouses has already passed the "build an AI platform" phase. It has AI agents, automation runtime, a Hub architecture, a data layer, human feedback mechanisms, encoded business rules, and real operational workflows generating revenue today.

**Main Finding**: The platform is not lacking AI capability. It is lacking the operating model that allows AI capability to compound.

**Strategic Direction**: Add a Governance and Intelligence Layer on top of what exists. Do not replace components, do not add agent count for its own sake, do not adopt enterprise-scale governance prematurely.

---

## Page 2 — Current Architecture Assessment

```
Business
   |
Applications  (Next.js / Hub v1 / Hub v2 / n8n)
   |
Automation    (34 Hub routes, ~16 n8n workflows)
   |
AI Agents     (5: Content, Quality Gate, QC Vision, Market Intel, CRM Parser)
   |
Data          (26 Supabase tables, RLS enabled)
```

Missing at every layer: **No Intelligence Governance Layer** — no agent registry, no unified decision ledger, no cross-agent memory, no scoped AI access control.

---

## Page 3 — Three Cross-Cutting Findings

1. **Fragmentation Pattern** — agents, data, runtime, and governance all fracture along the same silo lines; one root cause appearing four times.
2. **Maturity Inversion Pattern** — the most architecturally mature capability (Hub v2's AiGateway, HealthMonitor, auth model) exists outside the production boundary. The organization has the solution; it lacks the migration mechanism.
3. **Capability > Governance Gap** — the platform accumulates data volume, not compounding intelligence.

---

## Page 4 — Strategic Decisions Required

**Decision #1 — AI Governance Model**: Distributed / Control Plane / Hybrid Intelligence Layer.
**Decision #2 — Hub Evolution**: Big Bang / Partial Migration / Extract Gradually.

These are the only two decisions requiring Archi's strategic judgment. Everything else (credential isolation, monitoring, deployment confidence, incident response) is a no-regret action proceeding independently.

---

## Page 5 — Recommended Evolution Path

```
Today: AI-Assisted Automation
        |
Governance Foundation  (Agent Contract, Decision Ledger — logical objects, not schema yet)
        |
Intelligence Layer      (Shared memory across agents, closing the L1-L2 → L3 gap)
        |
Learning Organization   (Feedback changes future decisions, not just logged)
        |
AI-native Real Estate Intelligence Operating System
```

---

## Page 6 — Immediate Action Plan (0-90 days, no-regret, starts now)

1. Credential isolation — per-service Supabase keys; before: 1 leak = platform compromise, after: 1 leak = 1 service impact.
2. Operational monitoring — health parity for Hub v1, queue-stuck detection, workflow failure alerting.
3. Deployment confidence — smoke tests beyond git-SHA verification.
4. Incident response runbook — disable → rotate → update services → verify → review.
5. Agent Contract prototype — pilot on AG-4.2 (Quality Gate): existing feedback, existing logging, clear rule, measurable outcome.

---

## Page 7 — Future State Architecture

```
                 Business Intelligence
                          |
                 Intelligence Layer
                          |
        ┌─────────────────┼─────────────────┐
        ▼                 ▼                 ▼
    AI Agents           Memory          Evaluation
        |
   ┌────┼────┐
   ▼    ▼    ▼
  Hub  n8n  Next.js
```

---

## Page 8 — Final Executive Decision

1. Will AI be built as a Feature, or as an Operating System?
2. Should Governance precede Scale, or Scale precede Governance?
3. Is Hub v2 the Destination, or a Capability Source to extract from?

---

**Finnhouses AI Platform Architecture Blueprint — Version Final**
Scope: Assessment → Diagnosis → Strategic Options → Migration → Governance → Executive Decision
Next Document: Finnhouses Intelligence Governance Implementation Plan v1.0
