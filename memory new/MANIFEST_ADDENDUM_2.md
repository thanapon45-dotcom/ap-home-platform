# Document Manifest — Addendum 2 (2026-08-08)
*Covers: Audit.zip, content-service.zip, Decisions.zip, Glossary.zip, Handoff.zip,
qc-line-system.zip. Read together with the original `DOCUMENT_MANIFEST.md`.*

## Major structural finding

This batch reveals the project maintains **two parallel documentation layers**:

1. **`memory/`** — an older, periodically-summarized layer (what the Claude Project's
   files and each zip's plain-named file reflect)
2. **`CORE/ap-home-platform/docs/`** — the canonical layer embedded in the actual repo,
   updated every session (what each zip's `(2)`-named file reflects)

`HANDOFF.md`'s own header confirms this directly: *"รายละเอียดเต็มอยู่ที่
`CORE/ap-home-platform/docs/HANDOFF.md` (canonical ตั้งแต่ Jul 4)"*.

**Implication**: the plain-named files across every zip you send are likely to keep
being stale by design (they're a different, slower-updating layer), not accidents.
The `(2)` files are the ones to treat as source of truth going forward — but confirm
this holds for future zips too, since the `CLAUDE_md.zip` batch didn't follow this
same pattern (there, `CLAUDE (2).md` was my own prior edit, not a canonical-layer file).
**Always verify per-file rather than assuming the numbering convention.**

## Resolved this round — promoted to canonical

| File | Was (stale) | Now (canonical, promoted to outputs) |
|---|---|---|
| `decisions.md` | Jul 13, session 24 — 1 ADR heading matched, ends at ADR-005 | **`decisions (2).md` → Jul 23, session 30 — 23 ADR headings, ends at ADR-024** |
| `glossary.md` | Matches Claude Project's stale copy word-for-word (old CRM 5-stage model) | **`glossary (2).md` → Jul 23, session 30 — Hub v1/v2 revert, BUYER_SEGMENTS (2-group), ADR-024 proxy-hop pattern** |
| `issues-log.md` | Ends at the empty template stub, no real entries visible in tail | **`issues-log (2).md` → ends at ISSUE-017 (Hub-bypass bug + data-flow graph verification), session 30** |
| `HANDOFF.md` | Jul 13, session 24 — self-describes as a non-canonical summary pointer | **`HANDOFF (2).md` → Jul 23, session 30 — the actual canonical file it points to** |

All four canonical versions are now in this conversation's outputs, ready to replace
both the Claude Project copies and (once you confirm the local mirror) the
`memory/` copies on disk.

## Verified identical — no action

- `qc-line-system-blueprint.md` — byte-for-byte identical to the Claude Project's copy.

## Needs your confirmation, not a doc fix

- **`wf_qc_line.json` (11 nodes) vs `wf_qc_line_hardcoded.json` (12 nodes)** — neither
  filename matches "wf_qc_line 2," which `CLAUDE.md` (the real one) says is the
  workflow currently active in n8n. The hardcoded file (12 nodes) is the closer
  candidate — it likely corresponds to the human-feedback-loop addition from session
  19d — but I can't confirm without seeing the actual n8n workflow list. Please check
  n8n directly (`python3` node-listing approach per `decisions.md`'s own rule: never
  suggest an n8n fix without inspecting real nodes first) rather than trusting either
  uploaded file as "the" active version.

## Historical, not stale — no action needed

- `PROJECT_AUDIT.md`, `SECURITY_AUDIT.md` (Jun 5, 2026) and `audit_2026-06-29.md` (Jun
  29, 2026) — point-in-time audit snapshots, valid for their dates. A lot has changed
  since (ADR-010 through ADR-024), so don't read these as current-state — but they're
  not "wrong," just dated. `DOCUMENT_AUDIT.md` and `CODE_AUDIT.md` have placeholder/no
  dates — lower confidence on when these were produced; treat with more caution than
  the dated ones.
- `content-service/` (proposal HTML + 3 sample content files) — sales pitch collateral
  for the Content Service side business (ipropertyagent.in.th, หทัยราษฎร์ agent),
  referenced in `HANDOFF_2026-05-22.md`. Not platform documentation; no reconciliation
  needed unless that side business itself has changed status (not indicated anywhere
  I've seen).

## Still outstanding from Addendum 1

- `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v1 (hardcoded).json`
  — not yet seen (note: `CLAUDE.md` real version reveals this was actually superseded
  by **v2, ADR-005**, live since Jul 8 — the "v1 (hardcoded)" file may itself now be
  obsolete; lower priority to chase down than previously stated).
- `WF1_fixed_keyword_lock.json` — not yet seen; per `CLAUDE.md` real, WF1 has since
  moved through several more versions (`WF1 (8_wb_fix).json`, `WF1 (9_queue_sync_fix).json`)
  — the keyword-lock fix this file was for is likely folded into one of those later
  versions already. Same downgrade in priority applies.
- Local copies of `blog-bridges-cta.md` / `content-plan-june2026.md` for direct diff
  against my in-session edits — still open, no update this round.
