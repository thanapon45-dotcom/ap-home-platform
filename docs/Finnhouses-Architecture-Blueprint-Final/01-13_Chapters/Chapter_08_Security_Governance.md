# Chapter 8 — Security & Governance Architecture

Status: **Final**
Trace Matrix: AO-2.3, Major Finding 6.1, BR-3.3, prior resolved security items (ISSUE-013, ADR-024)

## 1. Authentication vs Authorization

**Authentication ("who are you")**:

| Boundary | Mechanism |
|---|---|
| Hub v1 | `x-hub-token` header vs `HUB_SECRET` |
| Hub v2 | `x-hub-secret` header vs `HUB_SECRET` (different header name, same secret — AO-8.1) |
| n8n → Hub callback | HMAC-SHA256(`HUB_SECRET`, runId) |
| LINE webhook | LINE signature verification |
| Next.js → Hub | Server-side only, secret never reaches browser |

**Authorization ("what can you do")**: No evidence of any authorization layer beyond binary authenticated/not-authenticated. `SUPABASE_SERVICE_KEY` grants full RLS-bypass uniformly to Hub, Next.js, and n8n — no service identity, no scoped permission, no per-agent access boundary anywhere (relates directly to AO-8.4).

## 1a. Security Boundary Model

| Layer | Current State | Assessment |
|---|---|---|
| Client Security | Browser never holds secrets | Good |
| API Boundary | Hub token authentication | Partial (two header conventions, AO-8.1) |
| Service Authentication | Multiple conventions across v1/v2 | Risk |
| Database Security | RLS enabled on all 28 tables (confirmed 2026-08-07) | Good |
| Secret Management | Environment-variable based, no rotation/isolation | Weak |
| AI Access Control | No registry, no scoped permissions | Missing |

**Conclusion**: Security controls exist at infrastructure boundaries, but governance controls around privileged access and AI execution remain immature.

## 2. Secrets Management

**Major Finding 8.1 — Privileged Database Credential Exposure**
Evidence: `SUPABASE_SERVICE_KEY` observed in plaintext inside n8n workflow JSON and inside each service's `.env`.
Finding: Not a configuration-hygiene issue — a **privilege boundary issue**. The credential bypasses RLS entirely and lives inside the least-governed artifact class in the system (n8n workflow JSON, per Ch6 AO-6.5).
Impact: A leaked workflow artifact could provide full database bypass capability, including access beyond every RLS policy protecting the 28 tables (table count corrected 2026-08-07 — see Ch2/Ch5 amendment note).

## 3. Row-Level Security Posture

All 28 tables have RLS enabled (count corrected 2026-08-07 — see Ch2/Ch5 amendment note). Historical fixes (ISSUE-013, ADR-024) show a working remediation pattern, but every discovery was reactive/incidental, not from a recurring scheduled check.

**AO-8.3** (Evidence: A/B; Confidence: Medium) — No recurring, scheduled security posture check found documented; every RLS fix in the historical record was triggered by investigating an unrelated problem.

## 4. AI-Specific Governance Gaps

**AI Security Risk Matrix**:

| Risk | Current Control | Gap |
|---|---|---|
| Prompt Injection | Prompt-embedded rules only (BR-3.3) | No external/data-backed rule enforcement |
| Data Overexposure | Full content passed to AG-4.2 | No data-minimization step observed |
| Wrong AI Decision | Human feedback (audit-only) | No learning loop to reduce recurrence |
| Model Change Risk | Manual model selection at call sites | No model registry or change-review process |
| Agent Permission | None observed | No AI access policy |

**AO-8.4** (Evidence: A/B) — AI inherits all existing authorization gaps without any AI-specific compensating control.

## 5. Architectural Observations

AO-8.1 (header inconsistency), Major Finding 8.1 (credential exposure), AO-8.3 (reactive-only security discovery), AO-8.4 (no AI data-access governance).

## 6. ADR Candidates

**ADR-Candidate-8.1** (AO-8.1): Should Hub v1/v2 standardize on one auth header convention now, independent of cutover timing? Low-effort, low-risk, actionable immediately.

**ADR-Candidate-8.2 — Secrets Isolation and Credential Ownership**: Should secrets move out of n8n workflow JSON into n8n's native credential store, and should credential ownership be formally assigned? Decision Drivers: precedent already works (Telegram credential); credential ownership, rotation responsibility, audit access, environment separation (dev/shadow Hub v2 and production Hub v1 currently likely share `HUB_SECRET`).

**ADR-Candidate-8.3** (AO-8.3): Should a scheduled (not incident-triggered) security posture review become standing practice?

**ADR-Candidate-8.4** (AO-8.4): Should AI agent data access be explicitly scoped as part of the AI Agent Registry/Control Plane design in Chapter 10? Recommend folding into the same decision cluster as ADR-Candidate-4.1/6.4.

**Note**: ADR-Candidate-8.1/8.2/8.3 are low-risk, actionable-now items; ADR-Candidate-8.4 converges with the strategic AI Execution Boundary decision.
