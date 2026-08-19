# Finnhouses Architecture Blueprint Changelog

## Version Final

**Date**: 2026-07-25
**Status**: Architecture Baseline Frozen

**Changes**:
- Chapters 0-13 consolidated
- Final Summary completed
- ADR Register consolidated
- Executive Brief generated
- Executive Reference DOCX generated and rendering-verified (cover, headings, tables)

**Known Limitations**:
- Chapters 0-3 are a **Reconstructed Reference**, not the Canonical Original Draft — produced from retained session summary rather than copied verbatim from their original review-approved text. Structural content (IDs, findings, AO/BR numbers, conclusions) is faithful; exact original sentence wording is not guaranteed.
- Chapters 4-13 are Original reviewed content — each chapter was drafted, reviewed, patched, and approved to Final status within direct view in this engagement.
- No implementation decisions are included in this Blueprint. It is diagnosis and options only, per the Architecture Freeze maintained throughout.

**Evidence Reliability Order** (for future Audit / ADR Review / Implementation Planning / Evidence Matrix reference):
1. Chapters 4-13 — Original reviewed content (highest reliability)
2. Chapters 0-3 — Reconstructed Reference (structurally faithful, wording not guaranteed verbatim)

**Next Artifact**: Finnhouses Intelligence Governance Implementation Plan v1.0

---

## Amendment Policy (from Version Final onward)

This Blueprint should not be edited except through one of the following:
- **Architecture Amendment** — a documented change to a chapter's findings when new evidence contradicts them
- **ADR Approved Change** — when Archi resolves a Strategic Decision (e.g. Decision #1 or #2), the resolution is appended as an amendment, not retrofitted into the original chapter text
- **Major Business Direction Change** — e.g. a change to business unit mix or Vision statement

Routine implementation work, engineering backlog, and execution sequencing belong in the separate **Implementation Plan** document, not in this Blueprint.

## Amendments

### Amendment 2026-08-07 — Table-count discrepancy resolved
**Type**: Architecture Amendment
**Affects**: ADR-Candidate register (Deferred Decisions), Final Summary (Open Question #5)
**Change**: Live query against the `ap-home-platform` Supabase project (public schema) confirms **28 tables**. Ch2's figure of 28 was correct; Ch5's figure of 26 was stale and is superseded. No architecture or schema change occurred — this amendment only corrects a factual count previously flagged as unresolved.
**Evidence**: Direct schema read (Evidence Standard A), via `list_tables` on project `omvpagvqyfmkkhzuuzda`.

## Version History

| Version | Date | Status | Notes |
|---|---|---|---|
| Final | 2026-07-25 | Architecture Baseline Frozen | Initial complete assembly — Ch0-13, Final Summary, ADR Register, Domain Dictionary, Executive Brief |
