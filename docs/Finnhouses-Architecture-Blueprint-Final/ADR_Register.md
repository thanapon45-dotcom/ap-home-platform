# Architecture Decision Log — Master ADR Register

Status: **Complete**

## Strategic Decisions (require Archi's judgment — not resolved by this Blueprint)

| ADR ID | Title | Chapter | Converges |
|---|---|---|---|
| ADR-Candidate-2.1 | Hub v1/v2 monorepo coexistence | Ch2 | Cluster B |
| ADR-Candidate-2.3 | Evaluate IaC for deployment-name clarity | Ch2 | — |
| ADR-Candidate-3.1 | Dashboard Value Stream representation | Ch3 | — |
| ADR-Candidate-4.1 | Should all agents route through AiGateway? | Ch4 | Cluster A |
| ADR-Candidate-4.2 | Move BR-3.3-class rules to data store | Ch4 | Cluster A |
| ADR-Candidate-4.3 | Extend decision logging to AG-4.1/4.5 | Ch4 | Cluster A |
| ADR-Candidate-4.4 | Shared AI Memory Layer | Ch4 | Cluster A |
| ADR-Candidate-5.1 | AI Decision & Feedback Data Model | Ch5 | Cluster A |
| ADR-Candidate-5.3 | Shared Intelligence Layer (data-level) | Ch5 | Cluster A |
| ADR-Candidate-5.4 | Business Rule data store | Ch5 | Cluster A |
| ADR-Candidate-6.1 | Hub v1/v2 cutover sequencing (FB-first/blog-first/partial) | Ch6 | Cluster B — **Decision #2** |
| ADR-Candidate-6.2 | Hub state schema reconciliation | Ch6 | Cluster B |
| ADR-Candidate-6.3 | Automation Governance Model (n8n) | Ch6 | Depends on Decision #1 |
| ADR-Candidate-6.4 | AI Execution Boundary | Ch6 | Cluster A — **Decision #1** |
| ADR-Candidate-7.1 | Content Agent reads buyer/market signals? | Ch7 | Cluster A |
| ADR-Candidate-7.2 | Learning mechanism (retrieval, not training) | Ch7 | Cluster A |
| ADR-Candidate-8.4 | AI agent data-access scoping | Ch8 | Cluster A |
| ADR-Candidate-13.1 | Governance role assignment given team size | Ch13 | Open |
| ADR-Candidate-13.2 | Governance Maturity Level threshold | Ch13 | Open |

## No-Regret Actions (actionable now, independent of strategic decisions)

| ADR ID | Title | Chapter |
|---|---|---|
| ADR-Candidate-8.1 | Standardize Hub v1/v2 auth header convention | Ch8 |
| ADR-Candidate-8.2 (Phase 1) | Credential Blast Radius Reduction (per-service keys) | Ch8/Ch10 |
| ADR-Candidate-8.2 (Phase 2 — deferred) | Fine-grained agent access scoping | Ch8/Ch10 |
| ADR-Candidate-8.3 | Recurring (not incident-only) security posture review | Ch8 |
| ADR-Candidate-9.1 | Hub v1 health-monitoring parity | Ch9 |
| ADR-Candidate-9.2 | Proactive alerting thresholds | Ch9 |
| ADR-Candidate-9.3 | Rollback playbook per service + Deployment Confidence Principle | Ch9 |
| ADR-Candidate-9.4 | Credential-compromise Response runbook | Ch9 |

## Resolved Amendments

| Item | Chapter | Resolution |
|---|---|---|
| Ch2 vs Ch5 table-count discrepancy (28 vs 26) | Ch2, Ch5 | **Resolved 2026-08-07** — live schema read confirms 28 tables (public schema, `ap-home-platform` project). Ch2 was correct; Ch5 superseded. See CHANGELOG.md Amendments. |

## Deferred Decisions (explicitly out of scope for this Blueprint)

| Item | Chapter | Reason Deferred |
|---|---|---|
| Gate 3 — Hub Runtime Evolution final choice | Ch11/12 | Deferred until Track A/B execution produces real operating data |
| ADR-Candidate-5.2 | `hub_state` JSON normalization | Depends on Cluster B outcome |
| ADR-Candidate-5.5 / 5.6 | Dormant table disposition, schema lifecycle metadata | Low urgency, non-blocking |

## Convergence Clusters (for Chapter 10/11 resolution)

- **Cluster A — Intelligence Governance**: ADR-4.1, 4.2, 4.4, 5.1, 5.3, 5.4, 6.3, 6.4, 7.1, 7.2, 8.4 — underlying question: "Is AI a Feature or an Operating System?"
- **Cluster B — Hub Evolution**: ADR-2.1, 6.1, 6.2 — underlying question: "Is Hub v2 a replacement or a capability source?"
- **Cluster C — Security Foundation**: ADR-8.1, 8.2, 9.4 — underlying question: "Is the system ready for production scale?"
- **Cluster D — Operational Excellence**: ADR-9.1, 9.2, 9.3 — underlying question: "Manual operation → self-monitoring platform?"

## Top 10 Architecture Decisions (ranked synthesis)

| # | Decision | Converges | Urgency |
|---|---|---|---|
| 1 | AI Execution Governance Strategy (Distributed/Control Plane/Hybrid) | 4.1, 5.1, 5.3, 6.4, 7.1, 7.2, 8.4 | Strategic — foundational |
| 2 | Hub v1/v2 Evolution Path | 2.1, 6.1, 6.2 | Strategic — not blocking Track B |
| 3 | Credential Isolation (Blast Radius Reduction) | 8.2 Phase 1 | No-regret — now |
| 4 | AI Decision & Feedback Data Model | 5.1 | Depends on #1 |
| 5 | Automation Governance Model (n8n) | 6.3 | Medium |
| 6 | Proactive Operations | 9.1, 9.2 | No-regret — now |
| 7 | Deployment Confidence | 9.3 | No-regret — now |
| 8 | Credential Compromise Runbook | 9.4 | No-regret — now, independent of #3 |
| 9 | Business Rule Data Store | 5.4, 4.2 | Depends on #1 |
| 10 | Header/Auth Convention Standardization | 8.1 | Low-cost, now |
