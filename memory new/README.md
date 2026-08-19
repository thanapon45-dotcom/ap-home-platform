# docs/v2/07-departments/

Business-function view of AP-Home Platform OS, organized by the 3 active AI
Departments (Marketing, Construction, Investment) rather than by technical
component. Cross-links to the existing `06-modules/` (technical) docs where a
production module already exists.

> **Provenance note**: This structure was assembled from the Ollama coverage
> audit (2026-08) plus `CLAUDE.md`, `decisions.md`, and the Architecture
> Blueprint chapters — not from the live `06-modules/` source files, which
> were not available at assembly time. Before replacing any existing docs,
> cross-check each overview against the real `06-modules/` content and
> reconcile any drift.

## Departments

| Department | Coverage (Ollama audit) | Status |
|---|---|---|
| [01 — Marketing AI](./01-marketing-ai/overview.md) | 85% | Strong |
| [02 — Construction AI](./02-construction-ai/overview.md) | 15% | Mostly intentional gap (Unit 1 discontinued, ADR-010) |
| [03 — Investment AI](./03-investment-ai/overview.md) | 80% | Strong |

## Revenue vs. Coverage (per CLAUDE.md Business Units, Jun 6 2026)

| Business Unit | Revenue share | Primary Department |
|---|---|---|
| Unit 3 — Fix & Flip | 60% | Investment AI |
| Unit 4 — Consulting/Inspection | 30% | Construction AI (QC only) |
| Unit 2 — Brokerage | 10% | Marketing AI |
| Unit 1 — Home Building | Discontinued (ADR-010) | Construction AI (not building further) |

Coverage is not proportional to revenue: Investment (60% of revenue) is
well-covered; Marketing (10% of revenue) is the most fully built department.
This is flagged, not treated as a defect — Marketing content infrastructure
serves lead generation across all business units, not just Brokerage.

## Cross-Department Components

Some components are hubs, not department-owned modules:

- **`DashboardOS.tsx`** — spans all 3 departments (Overview + Sales Analytics
  + Market Intel + Investment metrics). Do not file this under one department.
- **`OperationalDashboard.tsx`** — same cross-department nature.

See `cross-reference.md` for the full component-to-department mapping.
