# AP Home Platform — Master Architecture

Evidence snapshot: **2026-10-03**.

This folder separates the current implementation from target architecture. Do not promote a PLANNED or UNVERIFIED item to IMPLEMENTED without code or runtime evidence.

## Status vocabulary
- **IMPLEMENTED** — supported by current repository code.
- **PARTIAL** — code exists but integration/enforcement is incomplete.
- **PLANNED** — documented target/proposal, not current behavior.
- **UNVERIFIED** — requires runtime/deployment/n8n/database evidence.

## Files
- `AP_HOME_PLATFORM_MASTER_ARCHITECTURE.html` — master readable document.
- `diagrams/00...08*.svg` — architecture views L0–L8.

## Critical interpretation rules
1. Hub v1 and Hub v2 are not interchangeable. Repository documentation identifies v1 as the production orchestration path and v2 as shadow/partial.
2. Brains is a context aggregation layer; do not describe it as an autonomous learning brain unless implementation changes.
3. Not every request flows Dashboard → Hub → Brain → AI. Assistant and several server routes have direct service/data paths.
4. Internal-only Assistant behavior is not equivalent to complete mechanical evidence enforcement.
5. Runtime state must be verified separately from static code.

## Primary evidence
`services/backend-hub/server.cjs`, `services/backend-hub/src/server.ts`, `app/api/assistant/route.ts`, `app/api/brains/context/route.ts`, `docs/context_brief.md`, `docs/glossary.md`, `CLAUDE.md`, `SECURITY_AUDIT.md`, accepted ADRs, and auth tests.
