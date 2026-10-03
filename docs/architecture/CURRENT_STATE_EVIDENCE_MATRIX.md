# AP Home Platform — Current-State Evidence Matrix

Snapshot: **2026-10-03**  
Scope: repository `main` static evidence. Runtime-only claims remain **UNVERIFIED**.

## Authority order
1. **Current code / current schema & migrations** — actual implemented structure.
2. **`docs/BUSINESS_MODEL.md`** — canonical business identity and platform scope.
3. **Latest accepted ADR** — approved decisions and supersession.
4. **Verified operational/recovery records** — point-in-time production evidence.
5. **Finnhouses Architecture Blueprint Final** — frozen architecture baseline, not current runtime truth.
6. **HANDOFF / incident records** — time-scoped operational evidence.
7. **memory, old audits, generated HTML/maps, research notes** — historical/derived; verify before reuse.

## Status vocabulary
- **IMPLEMENTED** — current code supports the capability/path.
- **PARTIAL** — implementation exists but boundary/integration/enforcement is incomplete.
- **CLOSED** — retained route/page but intentionally deactivated.
- **LEGACY** — code remains but is not part of current active business/platform surface.
- **PLANNED** — target/design only.
- **UNVERIFIED** — requires runtime/deployment/database/n8n evidence.

## Evidence matrix

| Capability | UI / entry | Server/API boundary | Data / automation | Status | Evidence / interpretation |
|---|---|---|---|---|---|
| OS Dashboard | `app/dashboard/page.tsx`, `DashboardOS.tsx` | mixed Next.js APIs | Hub + Supabase | IMPLEMENTED | Do not model as a single Hub-only path. |
| CRM | `app/crm/page.tsx`, `CRM.tsx` | `/api/leads` | Supabase service role | IMPLEMENTED + CONFLICT | Active code retains discontinued Unit-1 concepts. |
| AI Content | marketing/content components | `/api/chat` + publish APIs | Claude + content_frames + publishing | IMPLEMENTED + CONFLICT | Generic chat default persona still says Finnhouses is in home-building business. |
| Blog Runner | Dashboard/marketing | `/api/blog/*` | Hub v1 → n8n → WordPress/Supabase | IMPLEMENTED | v1 contract: `x-hub-token`, `/action/blog/*`. |
| FB queue/publish | marketing | `/api/fb/*` | Hub v1 → FB backend/automation | IMPLEMENTED | v1 production path. |
| Market Intelligence | `/market-intel` | market-intel APIs | n8n + Supabase | IMPLEMENTED | Active workflow revision remains runtime evidence. |
| Land Analyzer | `/land-analyzer` | `/api/projects` + Brains read | `projects` | IMPLEMENTED | Build-to-Sell; not Fix & Flip identity. |
| Fix & Flip Deals | `/deals` | `/api/deals` | `reno_deals` | IMPLEMENTED | Renovate-to-Resell; ADR-027 separation. |
| BOQ v1 | `/boq`, `BOQTreeBuilder.tsx` | `/api/boq/[...path]` → Hub | `boq.routes.js` → Supabase | IMPLEMENTED | Hub global auth protects router; quantity manual in v1. |
| Drawing/CAD auto takeoff | no active main UI proven | no complete execution path proven | none proven | PLANNED / NOT IMPLEMENTED | Data placeholders do not prove automatic takeoff. |
| Budget public tool | `/budget` | closure page | — | CLOSED | Unit-1 calculator intentionally closed. |
| Brains | Assistant/Land context | `/api/brains/context` | multiple Supabase domains | IMPLEMENTED / PARTIAL | Shared context aggregation, not autonomous learning brain. |
| Assistant | global `AssistantChat` | `/api/assistant` | Hub + Supabase + Brains + Claude | IMPLEMENTED / PARTIAL | Full mechanical evidence enforcement not proven. |
| Quality Gate | API/workflow | quality-gate APIs | n8n + `quality_gate_log` | IMPLEMENTED / RUNTIME POLICY UNVERIFIED | ADR-016 amendment needs active-workflow verification. |
| QC | QC APIs/workflow | Hub QC routes | OpenAI + Supabase + LINE/n8n | IMPLEMENTED | Runtime E2E remains separate evidence. |
| Ops / DLQ | operational paths | `/api/ops/*` → Hub | `hub_dlq` + health monitor | IMPLEMENTED | Real retry/DLQ implementation. |
| Hub v1 | server | `server.cjs` | Supabase/n8n/FB/WP/etc. | IMPLEMENTED / PRODUCTION ARCHITECTURE | Global Hub token except health/webhook exceptions. |
| Hub v2 | TypeScript service | v2 routes | shadow architecture | PARTIAL / SHADOW | Keep v1/v2 contracts separate. |
| Next.js auth | login + middleware | session/service token | env-driven | IMPLEMENTED / RUNTIME MODE UNVERIFIED | Production `AUTH_ENFORCE` not proven by repository. |

## Security boundary facts
- Hub v1 globally checks `x-hub-token == HUB_SECRET` before normal routes, including BOQ.
- Exceptions are `OPTIONS`, `/health*`, `/webhook/n8n`, and `/webhook/fb`; webhook flows use separate verification.
- `/health/config` and `/health/ready` expose configuration/dependency status metadata without Hub auth; no secret values are returned.
- Next.js middleware is the primary Vercel API boundary. Several service-role routes do not independently call `requireSession()`.
- Static code cannot establish the production value of `AUTH_ENFORCE`.

## Architecture rule
A connection may be labeled **IMPLEMENTED** only when this matrix has a concrete execution path. Conceptual adjacency is not evidence of integration.
