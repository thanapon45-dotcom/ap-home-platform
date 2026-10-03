# AP Home Platform — Conflict Register

Snapshot: **2026-10-03**

| ID | Finding | Classification | Resolution / authority |
|---|---|---|---|
| C-01 | `docs/context_brief.md` describes Finnhouses as a home-builder. | STALE DOC | `docs/BUSINESS_MODEL.md`: Unit 1 discontinued. |
| C-02 | CRM retains Budget Tool, `build` intent, showroom/newly-built-house/promotion language. | ACTIVE CODE CONFLICT | Remap to current Units 2/3/4. |
| C-03 | `/api/telegram` retains “Finnhouses Budget Tool” context. | LEGACY CODE | Not current business identity. |
| C-04 | DesignBoard/image-generation house-style capability remains but is absent from active Sidebar. | ORPHAN / LEGACY | Do not count as active module without current product decision. |
| C-05 | Older README/audits describe Budget Tool as live. | STALE DOC | `/budget` is intentionally CLOSED. |
| C-06 | Frozen Blueprint says no cross-domain/cross-agent reuse. | PARTIALLY SUPERSEDED | Brains aggregates multiple domains; autonomous/shared learning remains unproven. |
| C-07 | Older material can imply Hub v2 production. | SUPERSEDED | ADR-004/current evidence: Hub v1 production architecture; v2 shadow. |
| C-08 | Default-deny code exists, but production `AUTH_ENFORCE` is not repository evidence. | RUNTIME UNVERIFIED | Verify deployment environment/log behavior. |
| C-09 | Service-role Next.js APIs generally rely on middleware rather than route-level `requireSession()`. | SECURITY GAP | Defense-in-depth incomplete; not proof of bypass. |
| C-10 | `/api/blog/state` error response exposes Hub URL and secret length + first/last 4 characters. | SECURITY CLEANUP | Remove temporary debug metadata. |
| C-11 | BOQ v1 exists; automatic CAD/Drawing quantity takeoff has no proven complete execution path. | SCOPE CONFUSION | Separate IMPLEMENTED BOQ from PLANNED Drawing Engine. |
| C-12 | Historical Land Analyzer → Fix & Flip coupling remains in superseded material. | SUPERSEDED | ADR-027: `projects` ≠ `reno_deals`; no inferred identity/FK. |
| C-13 | `/api/chat` default prompt says Finnhouses is in the home-building business. | ACTIVE AI POLICY CONFLICT | Align AI persona with canonical business model. |
| C-14 | Hub `/health*` bypasses Hub auth; config/ready expose operational status. | SECURITY HARDENING | Separate public liveness from protected readiness/config metadata. |

## Closed finding
The earlier concern that the BOQ router lacked Hub authentication is **closed**: `server.cjs` global Hub-token middleware executes before `app.use('/api/boq', boqRouter)`.
