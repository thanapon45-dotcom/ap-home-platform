# Chapter 11 — Migration Strategy

Status: **Final**
Trace Matrix: Chapter 10 (all 4 Clusters, Decision Principles 1-4), Major Finding 5.1/6.1/7.1/8.1/9.1, Maturity Inversion Pattern

**Migration Principle #0**: *The migration objective is not to replace components, but to introduce the missing governance and intelligence layers that allow existing components to compound value. Existing automation capability should be preserved; governance capability should be added before scale.*

**Migration Principle #1**: *Preserve operational velocity. Migrate governance capability before migrating runtime capability.*

This chapter remains a strategy document under the Architecture Freeze — no code, schema, or workflow changes are made here.

## Track A: Strategic Migration (depends on Cluster A/B decisions)

### Phase S0 — Governance Foundation Phase (renamed from "Architecture Stabilization")

Not a preparation phase — it creates capability the system has never had. Result: **"Governance Contract Established"** — e.g. Agent Contract: Who am I? What data can I access? What decision do I make? How is it evaluated?

Deliverables: AI Agent Registry, Decision Ledger, Intelligence Memory Contract, Agent Identity, Data Access Policy.

### Phase S1 — Intelligence Layer Introduction

Resolves ADR-Candidate-4.1, 5.1, 5.3, 6.4, 7.1, 7.2 together. Deliverables framed as **Logical Capability Objects, not database tables** (to avoid Schema-driven Architecture pre-empting Intelligence-driven Architecture):

```
Intelligence Layer — Logical Objects:
Agent Identity
Decision Record
Memory Artifact
Evaluation Case
Feedback Event
```

Actual table design deferred to post-Blueprint ADR work, once a Cluster A option is chosen.

### Phase S2 — Agent Governance Migration (sequenced by governance-readiness, not build order)

1. **AG-4.2 (Quality Gate)** — carries Critical rule BR-3.3, already has feedback + logging; tests the governance model against the highest-stakes agent first.
2. **AG-4.3 (QC Vision)** — already routes through `AiGateway`, already has human feedback.
3. **AG-4.4 (Market Intelligence)** — the long-horizon intelligence-asset builder; requires S1's memory contract.
4. **AG-4.5 (CRM Parser)** — bridge from human conversation to buyer intelligence; depends on S1 being live to be useful.
5. **AG-4.1 (Content Agent)** — migrated last, deliberately: it is currently a *consumer* of intelligence, not a source; its main missing capability (reading buyer/market signals) depends on S1 and on AG-4.4/4.5 already producing consumable intelligence.

## Track B: Operational Hardening (no-regret, proceeds independent of Track A)

**Phase O1 — Credential Blast Radius Reduction**: separate `SUPABASE_SERVICE_KEY` into per-service credentials (Hub v1 / Hub v2 / n8n / Dashboard).

**Phase O2 — Operational Observability**: health check parity for Hub v1, queue-stuck alerting, failed-workflow detection, deployment smoke test.

**Phase O3 — Deployment Confidence**: redefine deploy success from "correct git SHA" to "correct commit + application boot + critical API test + workflow health" (**Deployment Confidence Principle**).

**Phase O4 — Incident Response Runbook (Response side)**, explicitly separate from O1 (Prevention side): disable → rotate → update services → verify → review. Can be written now.

## Decision Gates

**Gate 1 — Intelligence Foundation Ready** (must pass before any new AI agent is introduced): Agent Registry, Decision Log, Feedback Storage, Evaluation Dataset all present.

**Gate 2 — Production Governance Ready** (must pass before migrating any existing agent): Agent Identity + Permission Boundary + Monitoring + Rollback + **Evaluation** present for that agent.

**Gate 3 — Runtime Evolution Decision** (deferred until real data exists): choose among Option 1 (Big Bang), Option 2 (Partial Migration), Option 3 (Extract Gradually) — informed by Track A/B execution experience, not decided upfront. Option 3 retains equal standing.

## Roadmap Success Metrics

| Area | Current | Target |
|---|---|---|
| AI Governance | No registry | Every agent registered |
| Memory | Isolated tables | Shared intelligence layer |
| Feedback | Audit only | Learning signal |
| Security | Shared privilege | Scoped access |
| Operations | Reactive | Proactive |
| Deployment | SHA verification | Functional confidence |

**Maturity Target**: L1-L2 → L3 → L4 (per Ch7's Maturity Assessment) — not "v1 → v2." L5 (Autonomous Improvement) is named as the long-horizon future state, explicitly out of scope for this migration plan.

## What this chapter deliberately avoids

Does not recommend "move everything to Hub v2." Does not select a Cluster A option on Archi's behalf. Does not let strategic uncertainty (Track A, Gate 3) block the no-regret operational work (Track B).
