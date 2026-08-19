# Chapter 2 — Current Architecture

Status: **Final**
*(Reconstructed from session record — see README provenance note.)*

## Figure 2.1 — System Context (C4 Level 1)

Actors and external systems only: Archi (Business Owner/Operator), Buyers/Sellers (via Facebook, LINE, WordPress site), Construction site workers (via LINE), and external systems (Facebook Graph API, LINE Platform, WordPress/finnhouses.com, Anthropic/OpenAI/Google AI APIs, Telegram).

## Figure 2.2 — Container Diagram (C4 Level 2)

Internal containers: Next.js Dashboard (Vercel), Hub v1 (Railway, `server.cjs`, production), Hub v2 (Railway, TypeScript, shadow), FB Backend (Railway, separate service), n8n (Railway, ~16 workflows), Supabase (Postgres + Storage).

## Deployment View

| Observed Runtime Name | Logical Role |
|---|---|
| `ap-home-platform-production.up.railway.app` | Hub v1 — production |
| `exciting-creativity-production-4b85.up.railway.app` | Hub v2 — shadow |
| `easygoing-friendship-production-e663.up.railway.app` | FB Backend |
| `primary-production-8158a.up.railway.app` | n8n |
| `ap-home-platform.vercel.app` | Dashboard |

## Runtime Flow Legend

Sync (HTTP request/response) / Async (webhook, fire-and-forget + later callback) / Queue (n8n internal scheduling) — applied throughout the runtime flow diagrams in this chapter and referenced again in Ch6-7.

## Domain Boundary Observation

Boundary claims are distinguished by level: **Code boundary** (separate files/modules — largely present), **Runtime boundary** (separate processes — present between Next.js/Hub/n8n), **Deployment boundary** (separate services — present), **Ownership boundary** (a named owner accountable for a component's evolution — largely absent). It would be imprecise to claim "no boundary exists at all" — the more accurate statement is that Code/Runtime/Deployment boundaries exist while Ownership boundaries mostly do not (this is picked up again in Ch5 AO-5.5 and Ch13 Section 6).

## Table Count Note

This chapter recorded 28 Supabase tables at the time of its evidence-gathering. Chapter 5, produced later in this engagement with a fresh `list_tables` call, recorded 26 — a discrepancy originally flagged per Architecture Principle 14 (Version Everything) rather than silently reconciled.

**Resolved 2026-08-07** (Architecture Amendment, see CHANGELOG.md): a live `list_tables` read against the `ap-home-platform` Supabase project (public schema, Evidence A) confirms **28 tables**. This chapter's original figure was correct. Chapter 5's 26 was stale — it was missing `agent_reports` and `line_users`, both present in the schema at the time of this amendment. See Chapter 5 §1 for the corresponding update.

## Architectural Observations

**AO-2.3** — Hub v1 and Hub v2 coexist within the same repository and package (`services/backend-hub/package.json` defines both `main: server.cjs` for v1 and `dev:v2`/`start:v2` scripts for v2). This is a Code/Deployment-level coexistence, not merely a conceptual one.

## ADR Candidates

**ADR-Candidate-2.1 — Hub v1/v2 monorepo coexistence**: Decision Drivers: deployment complexity, operational risk, merge cost, long-term maintainability. (Resolved into concrete options in Chapter 10, Cluster B.)

**ADR-Candidate-2.3**: Evaluate whether Infrastructure-as-Code would reduce the observed-name/logical-role ambiguity in the Deployment View — framed neutrally, not presupposing IaC is needed.
