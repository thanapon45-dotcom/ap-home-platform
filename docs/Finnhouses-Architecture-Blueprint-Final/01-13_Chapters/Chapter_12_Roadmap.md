# Chapter 12 — Roadmap & Implementation Sequence

Status: **Final**
Trace Matrix: Ch11 Track A/B split, Gates 1-3, Success Metrics table, Decision Principles 1-4

This chapter converts Chapter 11's phases into a sequenced timeline (no calendar dates — the Blueprint does not have team-capacity data to assign them).

## Sequencing View

```
Track B (No-Regret)                Track A (Strategic — Gated)
────────────────────                ─────────────────────────
O1 Credential Blast Radius   ──┐
   Reduction                   │
O4 Incident Response          │    S0 Governance Foundation Phase
   Runbook (Response side,     │    (Agent Identity, Decision Ledger,
   independent; can start now) │     Memory Contract, Access Policy
                                │     — as Logical Capability Objects)
O2 Operational Observability  │
   (health parity, alerting)   ├──> Gate 1: Intelligence Foundation Ready
                                │    (Registry + Log + Feedback + Eval)
O3 Deployment Confidence       │
   (smoke test, functional     │
   verification)               │    S1 Intelligence Layer Introduction
                                │    (Logical Objects → design, not yet built)
                                │
                                │    Gate 2: Production Governance Ready
                                │    (Identity + Permission[via O1] +
                                │     Monitoring[via O2] + Rollback[via O3] +
                                │     Evaluation)
                                │
                                │    S2 Agent Governance Migration
                                │    (AG-4.2 → AG-4.3 → AG-4.4 → AG-4.5 → AG-4.1)
                                │
                                │    Gate 3: Runtime Evolution Decision
                                │    (Option 1 / 2 / 3 — decided with real
                                │     data from S0-S2 execution)
```

## Sequencing Rationale

**Immediate (Track B start)**: O1 and O4-Prevention-adjacent work can begin without further design. O2/O3 require modest design but no strategic decision.

**Gate-dependent (Track A)**: S0's deliverable within this Blueprint's scope is the *design* of the Logical Capability Objects; implementation is handed off past the Architecture Freeze boundary.

**Decision Principle 3 constraint**: any new agent work during this roadmap period should occur in the n8n sandbox, not be added directly to production agents while S0-S2 are in progress.

## Roadmap Guardrails

```
Guardrail 1: No new production AI agents before Gate 1.
Guardrail 2: No agent migration before Gate 2.
Guardrail 3: No Hub runtime decision before Gate 3 evidence.
Guardrail 4: No governance bypass for speed —
             experimental speed belongs in the sandbox layer only.
```

## Migration Risk Register

| Risk | Trigger | Mitigation |
|---|---|---|
| Governance design delays feature work | Team adds agents faster than governance is built | Sandbox rule (Guardrail 4) |
| Hub decision paralysis | Waiting for a "perfect" architecture before deciding | Extract-capability approach (Option 3) remains available |
| Over-engineering the Intelligence Layer | Designing schema before real usage evidence exists | Logical Capability Objects first, schema deferred |
| Migration fatigue | Too many parallel changes overwhelm the team | Track B (parallel, low-risk) + Gated Track A (sequential, checked) |

## Roadmap Success Definition

The roadmap is complete not when Gate 3 resolves (explicitly deferred to real operating data), but when:
1. All Track B phases (O1-O4) are operating,
2. Gate 1 and Gate 2 have passed for at least AG-4.2 and AG-4.3,
3. The Success Metrics table shows movement on at least AI Governance, Memory, and Security rows.

Gate 3 (Hub Evolution) is explicitly **not** a roadmap completion criterion.
