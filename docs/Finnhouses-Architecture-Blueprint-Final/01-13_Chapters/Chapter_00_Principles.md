# Chapter 0 — Architecture Principles & Design Philosophy

Status: **Final**
*(Reconstructed from session record — see README provenance note. Structural content and IDs preserved; exact original wording not re-derivable verbatim.)*

## Purpose

Before any chapter analyzes the current system, this chapter fixes the rules of analysis: the Architecture Principles the system is measured against, the Evidence Standard used to grade every claim, the Confidence scale used to express certainty, and the constraints under which this entire Blueprint was produced.

## Design Philosophy

- **Evidence-driven Architecture**: every conclusion must be traceable to Source Code, Database Schema, Documentation (CLAUDE.md, ADRs, decisions.md), or an explicit User Statement — never inferred from a diagram alone.
- **Non-Goal**: this Blueprint does not mandate specific technology choices. It identifies gaps and decision points; it does not pre-select vendors, frameworks, or products on Archi's behalf.
- Where evidence is insufficient, the Blueprint states "Unknown / Assumption / Requires Validation" rather than guessing.

## Architecture Principles (14, established before analysis began)

1. Business rules should live in data/code, not be implicit in prompts or scattered across services.
2. AI decisions must be auditable — traceable to a logged decision with reasoning.
3. Shared Knowledge Layer — intelligence artifacts produced by one part of the system should be reusable by others.
4. (Reserved — business/technology alignment)
5. (Reserved — service boundary clarity)
6. (Reserved — deployment consistency)
7. Module boundaries, once claimed, should be verifiable in code, not just asserted.
8. (Reserved — data ownership clarity)
9. Single Source of Truth — a given fact (e.g. an AI decision's outcome) should have exactly one authoritative record, not several structurally similar but disconnected ones.
10. (Reserved — API contract stability)
11. Loose Coupling — components should depend on abstractions, not on each other's internals (e.g. `AiGateway` as a provider abstraction).
12. (Reserved — testability)
13. No Hidden Business Logic — logic with business consequences must be discoverable, not buried inside a prompt string or an undocumented conditional.
14. Version Everything — architecturally significant artifacts (schemas, workflows, decisions) must be versioned and traceable over time, including this Blueprint's own evidence.

## Evidence Standard

| Level | Meaning |
|---|---|
| A | Direct, current read of source code, schema, or live system state |
| B | Documentation (CLAUDE.md, ADRs, decisions.md, issues-log.md) |
| C | Inference from indirect signals — not directly observed |
| D | Absence of evidence — explicitly noted, not assumed to mean absence of the thing itself |
| E | User statement — Archi's direct account, treated as evidence but distinct from code-level verification |

## Confidence Scale

High / Medium / Low — orthogonal to Evidence level. A High-confidence conclusion can rest on Evidence B if corroborated multiple ways; a Low-confidence conclusion can exist even with Evidence A if the scope of what was checked was narrow.

## Constraints Governing This Entire Blueprint

- **Architecture Freeze**: no code, SQL, migrations, APIs, n8n workflows, repository structure, or database schema changes during Blueprint production.
- Current system treated as a Production System throughout.
- Where the system conflicts with a stated Principle, the response is an **Architecture Decision Required (ADR Candidate)** — reasoning, impact, alternatives, trade-offs — never an immediate fix.
- No Big Bang Rewrite proposals.

## Output Format (applied to every chapter, Ch1 onward)

Facts → Evidence → Observations → Architectural Assessment → Recommendations → Open Questions → Architecture Decision Required (ADR Candidate)

## Standing Conventions (accumulated and applied retroactively across all chapters)

- Stable IDs for Figures/Tables (Figure X.Y, Table X.Y)
- Every Architectural Observation (AO-X.Y) ends with an Evidence tag
- Every Business Rule gets a Rule ID (BR-X.Y)
- Business Capabilities get IDs (BC-X.Y); Business Domains get IDs (BD-X.Y)
- From Chapter 4 onward, every chapter ends with a Trace Matrix
- ADR Candidates include a Decision Drivers subsection
- Language avoids unhedged absolutes ("ผิดหลักการ") in favor of precise, evidence-qualified statements ("ไม่สอดคล้องกับ Architecture Principle X")
- Business Capability and the Technology/Application implementing it are never conflated in tables
- Business Domains are named using ubiquitous business language, not folder/component names
- Cross-domain complexity is explicitly clarified as reflecting business nature, not a design defect, unless evidence indicates otherwise
- Boundary claims distinguish Code / Runtime / Deployment / Ownership levels rather than a blanket "no boundary" claim
- C4 model conventions: System Context (Level 1) kept separate from Container Diagram (Level 2)
