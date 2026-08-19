# Chapter 10 — Strategic Architecture Decisions

Status: **Final**

This chapter diagnoses current state and lays out decision options. It does not select a future architecture on Archi's behalf.

## 1. Current State Diagnosis

```
Finnhouses Today =
   Data Platform
   + Automation Pipeline
   + AI Assistants (5 agents, 3 runtimes)
   + Partial Audit Loops (L1-L2 maturity, Ch7)
   + Reactive Operations (Major Finding 9.1)
   + Infrastructure Security without Governance Security (Ch8)

BUT missing:
   Intelligence Layer (Ch4-7 convergence)
   Privilege Boundary (Major Finding 8.1)
   Proactive Reliability Model (Major Finding 9.1)
```

## 2. Cluster A — Intelligence Governance

**Underlying Question**: Should AI be a Feature or an Operating System at Finnhouses?

**Option A — Distributed AI (status quo continuation)**: agents continue independently in Next.js/n8n/Hub. Pros: no migration cost, preserves n8n flexibility. Cons: governance remains structurally impossible; fragmentation compounds with each new agent.

**Option B — Central AI Control Plane**: all agents → AI Gateway → Models. Pros: single governance/audit/routing point. Cons: real migration cost (only AG-4.3 already routes through `AiGateway`); risks reducing n8n authoring speed.

**Option C — Hybrid Intelligence Layer**: AI Gateway + Decision Memory + Shared Intelligence, with agents remaining distributed across runtimes. Pros: preserves n8n flexibility, Next.js speed, Hub orchestration while adding the missing layers. Cons: more design complexity than either extreme.

**Governance Capability Comparison**:

| Capability | A. Distributed | B. Control Plane | C. Hybrid |
|---|---|---|---|
| Model Routing | No | Yes | Yes |
| Agent Audit | No | Yes | Yes |
| n8n Flexibility | Yes | Partial | Yes |
| Migration Cost | Lowest | Highest | Moderate |
| Shared Memory | No | Yes | Yes |
| Fast Experimentation | Yes | Partial | Yes |

**AiGateway ≠ AI Control Plane** (explicit distinction): `AiGateway` is a model-routing abstraction — one component. An AI Control Plane requires Agent Registry + Policy Engine + Decision Ledger + Evaluation Dataset + Memory Layer + Access Control. Options B and C both require the fuller Control Plane; neither is satisfied merely by routing all agents through the existing `AiGateway`.

**Resolves on decision**: ADR-Candidate-4.1, 5.1, 5.3, 6.4, 7.1, 7.2, 8.4.

## 3. Cluster B — Hub Evolution

**Underlying Question**: Is Hub v2 a replacement, or a refactor-in-progress that should be reconsidered?

**Option 1 — Wait & Big Bang**: complete Hub v2 (FB parity) fully, then switch all traffic at once.

**Option 2 — Partial Migration**: Blog → Hub v2 (already complete), FB → Hub v1 (stays until parity). Pros: lower migration risk, incremental validation. Cons: temporary dual-runtime operation.

**Option 3 — Reevaluate / Extract Gradually**: Keep Hub v1 as production runtime indefinitely; extract specific Hub v2 capabilities (auth boundary, `HealthMonitor`, `AiGateway`) into Hub v1 piecemeal rather than treating Hub v2 as a wholesale replacement target. Rationale: Hub v2 functions less as "the same system, cleaner" and more as an **architectural correction prototype** — several components may be more valuable extracted into the proven-stable v1 runtime than adopted as a full-system swap.

Option 3 retains equal standing with Options 1/2.

## 4. Cluster C — Security Foundation

**Underlying Question**: Is the system ready for production scale?

**Phase 1 — Credential Blast Radius Reduction** (renamed from "Immediate Isolation"): goal restated as measurable, not absolute — before: 1 key leak = whole platform compromised; after: 1 key leak = 1 service compromised.

**Phase 2 — Fine-Grained Access**: converges with the AI Agent Registry and Cluster A's decision; cannot be scoped in detail until Cluster A resolves.

ADR-Candidate-9.4 (Response runbook) proceeds independently of both phases.

## 5. Cluster D — Operational Excellence

**Underlying Question**: Manual operation → self-monitoring platform?

ADR-Candidate-9.1/9.2/9.3 — the lowest-risk, least-strategic cluster; can proceed in parallel with Cluster A/B decisions without waiting on them.

## 6. Cross-Cluster Dependency Map

```
Cluster A decision (AI Execution)
        │
        ├── determines feasible shape of Cluster C Phase 2 (fine-grained access)
        │
        └── independent of ──> Cluster B (Hub Evolution)
                                        │
                                        └── independent of ──> Cluster D (Operational Excellence)

Cluster C Phase 1 (credential isolation) ── actionable now, blocks nothing
Cluster D (all 3 ADRs) ── actionable now, blocks nothing
```

**Practical implication**: Cluster C Phase 1 and Cluster D can be actioned immediately. Clusters A and B are the actual strategic decisions this Blueprint has been building toward; C Phase 2 is downstream of A.

## 7. Decision Principles (constrain Chapter 11)

**Principle 1 — Preserve Existing Velocity**: no migration path should break workflows the team currently depends on (explicitly: n8n's authoring speed).

**Principle 2 — Add Governance Before Scale**: before any new AI agent is introduced, it must have an identity, a memory contract, an evaluation path, and an access boundary.

**Principle 3 — Separate Experiment Layer from Production Layer**: Experiment (n8n sandbox) → Governed Production (Hub + AI Governance). New agent ideas should be prototypable without immediately inheriting full governance overhead, but must cross an explicit boundary before reaching production status.

**Principle 4 — Intelligence Accumulation Over Automation Count**: success is not measured by agent count, but by whether the platform converges toward one intelligence system using N capabilities (operationalizes Major Finding 7.1 as a forward-looking constraint).

## Cross-Cutting Pattern Introduced/Confirmed Here

**Maturity Inversion Pattern** (see also Ch9): the more mature architecture — both AI capability (AiGateway/QC Vision) and operational monitoring (HealthMonitor) — exists outside the active production boundary. This recurs twice independently and is elevated to a Final Summary pattern: the organization is not short on capability, it is short on a migration/governance mechanism.
