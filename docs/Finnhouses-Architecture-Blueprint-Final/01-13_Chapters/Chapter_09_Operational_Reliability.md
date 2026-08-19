# Chapter 9 — Operational Architecture / Reliability

Status: **Final**
Trace Matrix: AO-2.3, Major Finding 6.1, Major Finding 8.1

## 1. Monitoring & Health Inventory

| Mechanism | Scope | Evidence |
|---|---|---|
| `GET /health` (both Hubs) | Liveness only | Evidence A |
| n8n "Wake-up" workflow (09:02 daily) | Pings finnhouses.com, Hub, FB Backend | Evidence A/B |
| `HealthMonitor` (Hub v2, background poll every 5 min) | Internal Hub v2 state health | Evidence A, shadow-only |
| Telegram error alerts | 4 points in Hub v1 (`withRetry` failures) + n8n workflow failures | Evidence B |
| `/api/ops/summary`, `/api/ops/dlq` (Next.js) | Operational dashboard views | Evidence A |

**AO-9.1** — The issue is not that Hub v1 lacks a `HealthMonitor`; it is that the platform's *best* operational capability is attached to the *non-production* runtime — **"Operational maturity exists but is attached to the wrong runtime."** Same structural pattern as Chapter 6's AI-capability-on-wrong-boundary finding.

## 2. Incident History as Evidence

Reviewing the documented incident log (CLAUDE.md, 15 Known Bugs entries): **13 of 15 were discovered reactively** — a user-visible symptom or incidental discovery during unrelated work, not a monitoring alert firing.

**Major Finding 9.1 — Reactive Operations Model** (elevated from AO-9.2)
The platform currently operates under a reactive reliability model: failures are detected primarily through user observation or manual investigation rather than automated detection. Monitoring components exist, but they are not yet the primary feedback mechanism of operations.
Impact: as feature surface grows, unknown failure modes grow with it, and human-detection cannot scale at the same rate.

## 3. Deployment & Rollback

Next.js (Vercel) and Hub/n8n (Railway) deploy via git push auto-deploy, with one documented gotcha: Vercel's "Redeploy" button rebuilds the same commit it's invoked from rather than pulling latest (discovered via a stale-production incident, fixed via empty commits).

**AO-9.3 — Deployment Confidence Gap** (expanded): Deploy success ≠ system confidence. Current verification is limited to confirming the correct commit reached production — no automated smoke test, integration health check, or post-deploy functional verification exists.

## 4. Recovery & Blast Radius

Given Major Finding 8.1 (shared, unscoped `SUPABASE_SERVICE_KEY` across Hub v1, Hub v2, and Next.js), a credential compromise in any one surface has full database blast radius — no compartmentalization exists to revoke access to one service without breaking all three.

**AO-9.4** (Evidence: A/B; Confidence: Medium) — No incident response runbook specific to a credential-compromise scenario was found, corresponding to the single highest-blast-radius risk identified in the Blueprint.

## 5. Architectural Observations

AO-9.1 (mature monitoring on non-production Hub), Major Finding 9.1 (reactive-only detection, hours-scale), AO-9.3 (Deployment Confidence Gap), AO-9.4 (no credential-compromise runbook against the highest-blast-radius risk).

## 6. ADR Candidates

**ADR-Candidate-9.1** (AO-9.1): Should Hub v1 receive equivalent self-monitoring to Hub v2, independent of cutover timeline? Low cost, immediate benefit.

**ADR-Candidate-9.2** (Major Finding 9.1): Should the platform introduce proactive alerting thresholds (e.g. "blog run running >X hours" → alert) rather than daily pings and incidental discovery?

**ADR-Candidate-9.3** (AO-9.3): Should a written rollback playbook be created per service, and should the **Deployment Confidence Principle** be adopted — *"A deployment is successful only when: (1) correct artifact deployed, (2) runtime healthy, (3) critical path verified, (4) automation flows operational"* — covering future artifacts beyond code (agents, workflows, prompts, policies)?

**ADR-Candidate-9.4 — Credential Compromise Runbook (Response)**: Explicitly separate from ADR-Candidate-8.2 (Prevention). Skeleton: disable affected key → generate replacement → update Railway Hub/n8n/Vercel → verify RLS/API/workflows → post-incident review. Can be written now, independent of Prevention's completion.

**Note on classification**: ADR-Candidate-9.1, 9.2, and 9.4 are lower-risk, actionable-now items, not strategic decisions requiring Ch10/11 synthesis.

## Cross-Cutting Pattern Noted in This Chapter

**Maturity Inversion Pattern**: recurs twice independently — AI architecture (Ch6, AiGateway/QC Vision on Hub v2) and operational monitoring (Ch9, HealthMonitor on Hub v2) both show the more mature capability existing outside the active production boundary. The organization is not short on capability; it is short on a mechanism to migrate/govern capability into production. Reserved for the Final Summary's cross-chapter synthesis.
