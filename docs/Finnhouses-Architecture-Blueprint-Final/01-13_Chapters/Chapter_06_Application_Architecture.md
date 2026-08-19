# Chapter 6 — Application Architecture

Status: **Final**
Trace Matrix: AO-2.3 (Hub v1/v2 coexistence), AO-4.1 (AiGateway adoption), AO-5.2 (`hub_state` JSON blob), ADR-Candidate-2.1 (Hub migration decision)

## 1. Application Inventory

| ID | Application | Role |
|---|---|---|
| APP-6.1 | Next.js Dashboard/API Proxy | Presentation + server-side proxy, 22 route groups |
| APP-6.2 | Hub v1 Production | Express monolith, 34 routes, production traffic |
| APP-6.3 | Hub v2 Candidate | TypeScript layered rewrite, shadow-only |
| APP-6.4 | FB Backend Adapter | Single-purpose FB Graph API proxy |
| APP-6.5 | n8n Workflow Engine | Orchestration for blog/QC/market intel/CRM parsing |
| APP-6.6 | Supabase Data Platform | System of record (business + intelligence data) |

## 2. Boundary Map

Hub v2's `server.ts` shows `AiGateway` wired at startup with an explicit fallback chain (Claude → OpenAI → Gemini), `BlogUseCase`/`QcUseCase`/conditionally-instantiated `FbUseCase`, and routes mounted behind `requireHubSecret` except `/health`, `/api/health`, `/api/qc` (LINE-signature), and `/webhook/n8n` (HMAC-token). This is more disciplined (4 distinct trust levels) than Hub v1's single blanket middleware.

`blogRoutes.ts` confirms Hub v2's blog module implements `queue/build`, `queue/clear`, `queue/run-next` in full — i.e. the FB/blog queue asymmetry is FB-specific, not a blanket Hub v2 incompleteness: **AO-6.2** — Hub v2 is complete for blog, incomplete for FB.

**AO-6.6 — AI Capability/Application Boundary Misalignment**
Evidence: Ch4 AG-4.1–AG-4.5 + this chapter's Application Inventory.
Finding: The AI capability layer is distributed across three separate execution environments (APP-6.1, APP-6.5, APP-6.3), none of which is the application boundary that owns AI governance.
Impact: the AI Agent Registry cannot be implemented as a single service-level control; model routing decisions cannot be enforced centrally; audit/logging is fragmented along the same 3-way split.

## 3. Request/Data Flow Sequencing (representative — blog run)

```
Dashboard (Next.js) → /api/blog/queue/run-next (Vercel proxy, adds x-hub-token)
        → Hub v1 server.cjs /action/blog/queue/run-next  [PRODUCTION PATH]
        → n8n scheduled trigger → WF1 execution (AI Quality Gate, AG-4.2) → WordPress
        → callback → Hub v1 /webhook/n8n → hub_state.value (JSON blob, AO-5.2)
```

```
[SHADOW, NOT LIVE] Dashboard → /api/blog/... → Hub v2 /api/blog/queue/run-next
        → n8nAdapter.trigger("blog-run", {...}) → same n8n webhook
        → callback → Hub v2 /webhook/n8n → StateManager → SupabaseStateRepository
```

Both paths converge on the same n8n webhook — n8n is agnostic to which Hub triggered it. The Hub v1/v2 coexistence risk (ADR-Candidate-2.1) is isolated to the Hub layer and its state storage, not to n8n workflows themselves.

## 4. Coupling Analysis

**Major Finding 6.1 — AI Runtime is Outside Application Governance Boundary**
This finding threads through three chapters: Ch4 (governance artifacts exist per-agent, no lifecycle process), Ch5 (same 3 agents logged in 3 unrelated tables — Major Finding 5.1), Ch6 (those agents execute in 3 different runtimes with no shared execution boundary).

```
AI Logic
  ├── APP-6.1 (Next.js)   — AG-4.1
  ├── APP-6.5 (n8n)       — AG-4.2, AG-4.4, AG-4.5
  └── APP-6.3 (Hub v2)    — AG-4.3 (shadow only)
```

There is no runtime layer today that all AI execution passes through. Architecture Principle "Dashboard never talks directly to AI" remains true and unviolated — but that principle addresses client/server separation, not AI governance centralization. The two are different concerns; only the first is satisfied.

## 5. Architectural Observations

AO-6.1 (Hub v2 auth boundary more granular, but inert while shadow-only), AO-6.2 (FB-specific gap, not blanket), AO-6.3 (n8n decoupled from which Hub triggers it — cutover risk concentrated in state-schema reconciliation), AO-6.4 (`AiGateway` wired as startup dependency, but structurally unreachable by 4 of 5 agents), AO-6.5 (n8n workflows carry the most AI-governance-relevant logic yet fall outside any structural code convention), AO-6.6 (AI capability/application boundary misalignment, above).

## 6. ADR Candidates

**ADR-Candidate-6.1** (refines ADR-Candidate-2.1): Should the Hub v1→v2 cutover be sequenced FB-first or Blog-first, given blog routes are already complete on v2? Decision Drivers: which production traffic can tolerate a cutover window better; whether partial cutover is architecturally acceptable.

**ADR-Candidate-6.2**: Should Hub state (JSON blob vs. `SupabaseStateRepository` schema) be reconciled before cutover, or migrated live? Decision Drivers: downtime tolerance, risk of losing in-flight queue items, testing surface.

**ADR-Candidate-6.3 — Automation Governance Model** (rescoped from narrow "workflow versioning"): What governance model should apply to n8n — workflow versioning, approval process, secret management, environment promotion, rollback? Decision Drivers: n8n's built-in versioning maturity vs. external tracking, retrofit cost across ~16 workflows, the fact this environment hosts a Critical business rule (BR-3.3) with no review gate.

**ADR-Candidate-6.4 — AI Execution Boundary**: Should Finnhouses centralize AI execution behind a single Hub/AiGateway boundary, or continue distributed execution across Hub, Next.js, and n8n? Decision Drivers: governance consistency, model-switching capability, operational simplicity, migration cost across 4 of 5 agents, preserving n8n's authoring flexibility. Left deliberately undecided — a strategic architecture question, not resolvable from evidence gathered so far.

**Convergence note**: ADR-Candidate-6.1/6.2 form the operational half of ADR-Candidate-2.1; ADR-Candidate-6.4 is the third and highest-level form of the AI-centralization question (with 4.1 and 5.1) — all should converge into one decision cluster in Ch10/11.
