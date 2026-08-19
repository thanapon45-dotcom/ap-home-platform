# Document Manifest — Finnhouses / AP-Home Platform OS
*Generated 2026-08-08. Scope: Claude Project files + files uploaded this
conversation. Local `D:\ARCHI\...` paths are included where referenced inside
documents, but their actual current content was **not verified** — I cannot
browse your local disk. Those rows are marked "Unverified" and need you to
confirm before acting on them.*

**Evidence key**: 🟢 Verified (I read the actual file) · 🟡 Referenced only
(mentioned in another doc's path, content not seen) · 🔴 Confirmed stale
(content contradicts a more recent, verified source)

---

## 1. Critical — Confirmed Stale / Needs Reconciliation

| File | Evidence | Issue | Action |
|---|---|---|---|
| `CLAUDE.md` (Claude Project) | 🔴 | Business Units table still listed Unit 1 (รับสร้างบ้าน) as active. **I already fixed this in-session** — corrected copy exists in this conversation's outputs. | Replace the Project's `CLAUDE.md` with the corrected version. If `D:\ARCHI\01_PROJECTS\memory\CLAUDE.md` is a separate physical copy, it needs the same fix applied — I have not touched that file. |
| `CHANGELOG.md`, `ADR_Register.md`, `Final_Summary.md`, `Chapter_02_Current_State.md`, `Chapter_05_Data_Architecture.md`, `Chapter_08_Security_Governance.md` (Blueprint set, uploaded) | 🔴 | Original uploads had the Ch2-vs-Ch5 table-count discrepancy (28 vs 26). **I already fixed all 6 files in-session** (amendment logged, count corrected to 28 everywhere). | The originals you uploaded are now superseded by the corrected copies already in this conversation's outputs. If these files also exist locally, the local copies still have the stale 26-count and need the same patch. |
| `blog-bridges-cta.md`, `content-plan-june2026.md` (uploaded) | 🔴 | Both originally contained "ไม่มีค่าใช้จ่าย" wording, which violates the no-free-consultation brand rule in `decisions.md`. **I already fixed both in-session.** | Same pattern — corrected copies exist in outputs; any local/other copies of these two files still have the violation. |
| `Finnhouses — Market Intelligence Collector v1.json` (Claude Project) | 🔴 | This workflow's Code nodes use `$env.SUPABASE_SERVICE_KEY`. Per `issues-log.md` (2026-06-08 entry) and `decisions.md`, this was diagnosed as broken (`$env` blocked in n8n queue mode) and fixed by **hardcoding** the key in a differently-named file: `Finnhouses — Market Intelligence Collector v1 (hardcoded).json`. That hardcoded file is **not** among the files I have. | The Project file is the pre-fix, non-working version. Find and use the `(hardcoded)` version as canonical; the Project should probably not keep the broken one active in the same location without a clear "superseded" label. |
| `Finnhouses WF1 — Article + Publish (2).json` (Claude Project) | 🟡→🔴 | `HANDOFF.md` (2026-06-12 entry) describes a newer file, `WF1_fixed_keyword_lock.json`, created to fix a keyword-lock bug in WF1, with an explicit instruction to "import → deactivate old version → activate new." That file is **not** among the files I have, and `HANDOFF.md`'s own urgent TODO list still shows this import as **not yet done**. | Confirm whether `WF1_fixed_keyword_lock.json` was ever imported to n8n. If yes, the Project's `Finnhouses WF1 — Article + Publish (2).json` is stale and should be replaced/archived. If no, this is still an open task, not a manifest issue. |

---

## 2. High Confusion-Risk — Similar Names, Different Content

| File A | File B | Risk |
|---|---|---|
| `content-plan-jun2026-inspect.md` (Claude Project) | `content-plan-june2026.md` (uploaded, edited this session) | **Not duplicates — actively different content plans.** A is the "Finnhouses Consultant — ตรวจงานก่อสร้าง" QC-themed calendar (Project ชนิดา photos). B is the "Lead Generation Sprint" personal-profile calendar from the Jun 1 pivot. Near-identical filenames make these easy to mix up when searching. Recommend renaming one, e.g. `content-plan-jun2026-qc-inspect.md` vs `content-plan-jun2026-leadgen.md`. |
| `HANDOFF.md` | `HANDOFF_2026-04-21.md`, `HANDOFF_2026-05-22.md` | Not duplicates — `HANDOFF.md` is explicitly the live, overwritten-every-session file (per its own header). The two dated files are point-in-time snapshots. Fine to keep, but they should live in an `archive/` subfolder, not beside the live file, or future sessions may read a stale one by mistake. |
| `SUMMARY_2026-04-21.md` | `SESSION_2026-*.md` (7 files), `SUMMARY_2026-05-31.md` | Naming is inconsistent — some session logs use `SESSION_`, some use `SUMMARY_`, one uses lowercase `session_`. Not a content problem, but worth standardizing on one prefix + consistent casing before this grows further. |

---

## 3. Net-New This Session — Not Yet Reconciled Anywhere

| File | Status |
|---|---|
| `AI_TEAM.md` (v1.1.0) | Newly created per the two governance docx files. No prior version exists anywhere I have visibility into. Target location per its own spec: `/docs/AI_TEAM.md`. |
| `docs/ADR/0000-template.md` | Newly created per AI_TEAM.md Revision Request §B1. No ADR directory previously existed. |
| `docs/v2/07-departments/` (22 files) | Newly created from the Ollama coverage audit + `CLAUDE.md` + Blueprint. **Not yet cross-checked against `06-modules/`** — you mentioned you can't currently locate that folder. Cross-links inside these files are best-effort until `06-modules/` is found. |

---

## 4. Verified Current — No Action Needed

`decisions.md`, `issues-log.md`, `glossary.md`, `qc-line-system-blueprint.md`, all Chapter files not listed in §1 (Ch0, Ch1, Ch3, Ch4, Ch6, Ch7, Ch9-13), `Domain_Dictionary.md`, `README.md` (Blueprint), `Finnhouses_Brand_Messaging_3T.md`, `finnhouses_full_intelligence_framework.md`, all n8n workflow JSONs not flagged in §1, `Welcome.md` (looks like an unused Obsidian default note — candidate for deletion, not a Finnhouses doc at all).

---

## 5. Local-Only References I Cannot Verify

These paths are mentioned *inside* documents I've read, but I have never seen
their actual current content. Treat this list as "things to check yourself,"
not confirmed facts:

- `D:\ARCHI\01_PROJECTS\memory\` — described as "single source of truth" (per `CLAUDE.md`'s own File Structure note, May 1 2026 entry). If this is truly the canonical copy, **it should take priority over the Claude Project files** wherever they conflict — meaning the Claude Project may itself be the stale copy in some cases, not just local.
- `D:\ARCHI\01_PROJECTS\CORE\ap-home-platform\` — application source code, referenced constantly, never uploaded.
- `D:\ARCHI\01_PROJECTS\CORE\threme web\finnhouses-theme\finnhouses-theme\` — WordPress theme source.
- `D:\ARCHI\02_MEDIA\บทความลงBlog\` — SEO article HTML files (SEO-01 through SEO-05).
- `D:\ARCHI\03_DOCUMENTS\` — misc docs including a Jun 11 Ahrefs fix file.
- `memory/n8n-workflows/` (relative path used inside several docs — likely under the `D:\ARCHI\01_PROJECTS\memory\` root above) — described as holding the "hardcoded" Market Intelligence Collector and `WF1_fixed_keyword_lock.json` flagged in §1.

**Recommendation**: since `CLAUDE.md` itself calls `D:\ARCHI\01_PROJECTS\memory\` the single source of truth, the cleanest fix is to make *that* folder the one real copy, and treat whatever's in this Claude Project as a working/session copy that gets synced from it — not the other way around. Right now it's ambiguous which direction is authoritative, which is exactly how the Unit 1 and table-count staleness happened in the first place.

---

## Suggested Next Step

Pick one:
1. I package every corrected file from this conversation into one zip, organized to mirror the real target structure (`memory/`, `memory/n8n-workflows/`, `docs/`, `docs/v2/07-departments/`) — you drop it into `D:\ARCHI\01_PROJECTS\memory\` and overwrite.
2. You paste/upload the actual current content of the `D:\ARCHI\...` files I flagged as "Unverified," and I diff them against what I have here for real, rather than working from path mentions.
