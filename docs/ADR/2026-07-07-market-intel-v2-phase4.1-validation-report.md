# ADR-005 Phase 4.1 — Validation Report

**Scope**: same 15 test cases from the Phase 4 QA report (`2026-07-07-market-intel-v2-phase4-qa-report.md`), re-run against the patched code from Phase 4.1 (signal normalization, schema sanitization, area-fallback fix). Same method as Phase 3/4: the real `jsCode` is extracted from the workflow file and executed for real in Node.js, mocking only the two true external I/O boundaries (`this.helpers.request` for the Claude/Supabase HTTP calls, `this.getCredentials`). Every line of validation/enforcement logic that runs is the actual production code.

**Same known limitation as Phase 4, stated again for clarity**: this sandbox has no outbound network access, so none of these cases involved a real Claude or Supabase call. This validates "does the patched code handle a given model response correctly," not "does live Claude Haiku actually produce compliant output under the prompt." That second question still requires the real dry run described in the import checklist.

**Note on tooling**: the live-mounted `memory/n8n-workflows/` folder lagged behind the actual file content during this session (a stale cached read returned a truncated copy, consistent with the mount-cache-lag behavior already documented in `CLAUDE.md` §"Known Bugs #1", previously only observed for `git add`). The three edits were confirmed correctly applied to the real file via direct `Read` tool calls (the authoritative view), then a byte-for-byte copy of that confirmed-correct content was written into the sandbox to run the harness against, since the sandbox's own mount view of the file was stale. The file on disk itself was never affected by this — only the sandbox's cached read of it.

---

## Results summary

| # | Test | Phase 4 status | Phase 4.1 status |
|---|---|---|---|
| TC01 | High urgency + distinct seller motivation (relocation) | PASS | PASS |
| TC02 | Calm listing, no urgency, no timing | PASS | PASS |
| TC03 | Model wrongly includes liquidity with fake high confidence | PASS | PASS — override confirmed |
| TC04 | Urgency/seller_motivation collapsed into identical evidence | PASS | PASS — violation correctly detected |
| TC05 | Truncated/invalid JSON from model | PASS | PASS — correctly rejected |
| TC06 | Model omits `signals` entirely | **FAIL** | **PASS** — all 9 keys now present with safe placeholders |
| TC07 | Signal confidence out of range (1.5) | FAIL (known gap) | **PASS** — clamped to 1 |
| TC08 | Evidence returned as a string, not an array | FAIL (known gap) | **PASS** — coerced to a 1-element array |
| TC09 | Signal level outside enum (`"very_high"`) | FAIL (known gap) | **PASS** — sanitized to `null` |
| TC10 | No area anywhere (input or model) | FAIL (pre-existing quirk) | **PASS** — `parse_ok: true`, `area: 'unknown'` |
| TC11 | Timing signal present — buyer_context must attempt | PASS | PASS |
| TC12 | Empty input text | PASS | PASS |
| TC13 | FB ingestion path | PASS | PASS |
| TC14 | English-only input | PASS | PASS |
| TC15 | Adversarial fake liquidity with fabricated evidence | PASS | PASS — override confirmed |

**15/15 PASS, 0 FAIL.**

---

## What changed under the hood for the previously-failing cases (spot-checked directly, not just via the harness)

**TC06** (model omits `signals` entirely): the parsed output now contains all 9 keys — `demand` through `seller_motivation` each as `{level:null, confidence:0, evidence:[], source_scope:'post', rubric_note:null}`, plus `liquidity` as the usual area-aggregate placeholder. Previously only `liquidity` existed.

**TC07** (`demand.confidence: 1.5` in the mock): output shows `demand.confidence: 1` — clamped into range, not rejected or passed through raw.

**TC08** (`demand.evidence: "ยังไม่มีคนถาม"`, a string in the mock): output shows `demand.evidence: ["ยังไม่มีคนถาม"]` — coerced into a 1-element array. Fields that were already valid arrays elsewhere in the same response (e.g. `value.evidence`) passed through unchanged.

**TC09** (`demand.level: "very_high"` in the mock, not in the enum): output shows `demand.level: null`. Note `demand.confidence` stayed at its original value (`0.95`) — the sanitizer treats level and confidence as independently validated fields; an invalid level doesn't zero out an otherwise-valid confidence number. This is a deliberate, narrow interpretation of "sanitize, don't fabricate": we don't invent a fake confidence for a rejected level, but we also don't punish a valid confidence value for an unrelated field's violation.

**TC10** (no `area` anywhere): output shows `parse_ok: true` and `area: 'unknown'` — the fallback that was previously dead code now executes as intended. This is the Finding 3 fix; per the original Phase 4 report this was flagged as a pre-existing quirk (present in the v1 file too, not introduced by ADR-005), and the fix was explicitly approved as in-scope for Phase 4.1.

## Liquidity override — re-confirmed under Phase 4.1 code

TC03 and TC15 (adversarial cases where the mocked model fabricates a fake `liquidity` object with invented high-confidence evidence) both still show the override succeeding in the final Supabase insert payload: `liquidity` is always `{level: null, confidence: 0, source_scope: 'area_aggregate', ...}` regardless of what the model returned. This enforcement point was untouched by Phase 4.1 (only the other 8 signals gained normalization) and continues to work correctly.

## Rubric distinctness — re-confirmed

TC04 (urgency and seller_motivation given identical evidence in the mock) is still correctly flagged by the harness's soft rubric check as a detected violation — this check is diagnostic only (it doesn't block the record, since a determined model could produce this and the current design accepts that as a quality issue to catch via review, not a hard rejection rule). No change in Phase 4.1.

## Full raw harness output

Saved at `/tmp/qa/results-phase41.json` in the working sandbox (not a project file — available on request if needed for the record, otherwise this report is the durable artifact).
