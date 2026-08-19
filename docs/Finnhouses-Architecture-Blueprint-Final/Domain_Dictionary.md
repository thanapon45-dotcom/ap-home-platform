# Appendix — Domain Dictionary

Status: **Complete**

| Term | Definition | First Defined |
|---|---|---|
| Intelligence Layer | A shared substrate (memory, decision history, policy) allowing AI agents to reuse each other's output as context — currently absent | Ch4/5 |
| Decision Ledger | A unified log of every AI decision (currently fragmented across `market_insights`, `qc_inspections`, `quality_gate_log`) | Ch5, Major Finding 5.1 |
| Agent Contract | Minimum required definition of a production AI agent: Identity, Purpose, Input, Output, Decision Impact, Evaluation Method, Owner | Ch13 |
| Memory Artifact | A logical (not yet schema-bound) object representing accumulated agent knowledge, distinct from a database table | Ch11 |
| Governance Contract | The output of Phase S0 — an agreement defining an agent's identity/access/evaluation, prior to implementation | Ch12 |
| AI Control Plane | The fuller governance architecture (Agent Registry + Policy Engine + Decision Ledger + Evaluation Dataset + Memory Layer + Access Control) — explicitly **not** the same as AiGateway | Ch10 |
| AiGateway | The Hub v2 component providing model-routing abstraction (Claude→OpenAI→Gemini fallback) — one component of, not equal to, an AI Control Plane | Ch4/6 |
| Maturity Inversion Pattern | The recurring finding that the most architecturally mature version of a capability exists outside the production boundary | Ch9, Final Summary |
| Intelligence Loop Maturity Model (L0-L5) | Scale used to assess platform maturity: L0 Generate-only → L5 Autonomous Improvement; current state L1-L2 | Ch7 |
| Value Stream | A structurally distinct path from demand to revenue; Finnhouses has 2 (CRM-routed vs. Fix & Flip, which bypasses CRM entirely) | Ch3, AO-3.1 |
| Business Capability (BC-x.x) / Business Domain (BD-x.x) | Stable IDs distinguishing what the business does from which application implements it | Ch3 |
| Architecture Decision Required (ADR Candidate) | A flagged conflict between current system state and a stated Architecture Principle, recorded with reasoning/drivers rather than resolved immediately | Ch0 |
| Evidence Standard (A/B/C/D/E) | Source-type classification: A = direct code/schema read, B = documentation, C = inference, D = absence of evidence, E = user statement | Ch0 |
| Confidence (High/Medium/Low) | Separate from Evidence — how certain a conclusion is, independent of source type | Ch0 |
| Fragmentation Pattern | Agents, Data, Runtime, and Governance all splitting along the same silo lines independently — one root cause appearing four times | Final Summary |
| Capability > Governance Gap | The platform accumulates data volume, not compounding intelligence — the precise gap between current state and Vision | Ch7 Major Finding 7.1, Final Summary |
| Logical Capability Object | A named governance concept (Agent Identity, Decision Record, Memory Artifact, Evaluation Case, Feedback Event) deliberately kept independent of database schema design until an execution-boundary decision is made | Ch11 |
| No-Regret Action | Work that reduces real risk or improves reliability without depending on any unresolved strategic decision | Ch9/10/11/12 |
| Value Stream (Two Value Streams) | See "Value Stream" above — the specific finding that Fix & Flip and CRM-routed leads never intersect | Ch3, AO-3.1 |
