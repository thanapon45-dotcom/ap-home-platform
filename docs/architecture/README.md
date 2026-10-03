# AP Home Platform — Master Architecture

Evidence snapshot: **2026-10-03**.

This directory is an audited current-state architecture workspace. The Frozen Architecture Blueprint remains a historical architecture baseline and is not modified here.

## Read these first
1. `CURRENT_STATE_EVIDENCE_MATRIX.md` — controls what may be shown as current/implemented.
2. `CONFLICT_REGISTER.md` — known code/document/runtime conflicts and superseded assumptions.
3. `AP_HOME_PLATFORM_MASTER_ARCHITECTURE.html` + `diagrams/*` — visual layer. **Draft until rebuilt from the matrix.**

## Authority order
Current code/schema → canonical `docs/BUSINESS_MODEL.md` → latest accepted ADR → verified operational evidence → Frozen Blueprint → handoff/incidents → memory/old audits/generated views.

## Status vocabulary
- **IMPLEMENTED** — supported by current repository code.
- **PARTIAL** — code exists but integration/enforcement is incomplete.
- **CLOSED** — retained but intentionally deactivated.
- **LEGACY** — code remains outside the active product/business surface.
- **PLANNED** — documented target/design, not current behavior.
- **UNVERIFIED** — requires runtime/deployment/n8n/database evidence.

## Critical interpretation rules
1. Hub v1 and Hub v2 are not interchangeable. Hub v1 is the production architecture in current repository evidence; v2 is shadow/partial.
2. Brains is shared context aggregation, not an autonomous learning brain or separate source of truth.
3. Not every request flows Dashboard → Hub → Brains → AI. Next.js routes use mixed Hub, Supabase-direct, automation, and external-service paths.
4. Land Analyzer (`projects`, Build-to-Sell) and Fix & Flip (`reno_deals`, Renovate-to-Resell) are distinct domains; do not infer identity/FK.
5. BOQ v1 is implemented. Automatic CAD/Drawing interpretation and quantity takeoff are not proven implemented.
6. Internal-only Assistant policy is not equivalent to complete mechanical evidence enforcement.
7. Runtime state must be verified separately from static code.
8. The current visual files were created before the full document/code audit and remain **DRAFT / DO NOT MERGE AS FINAL ARCHITECTURE** until rebuilt from the Evidence Matrix.

## Frozen baseline policy
Do not rewrite `docs/Finnhouses-Architecture-Blueprint-Final/*` for routine implementation drift. Record current-state deltas here; amend the frozen baseline only through its stated amendment/ADR governance process.
