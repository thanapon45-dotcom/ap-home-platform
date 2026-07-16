# ADR-005 Phase 4 — QA Report

**Scope**: 15 test cases run against the **real** code extracted from `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v2 (ADR-005).json` (the test-export file from Phase 3, still not imported/activated). Same method as Phase 3's sample execution: only the Claude API response and the Supabase HTTP call are mocked; every line of validation logic (signal enforcement, liquidity override, `target_context` building) is the actual production code, executed for real in Node.js.

**Known limitation, stated plainly**: this sandbox has no outbound network access, so none of these 15 cases involved a real call to Claude or Supabase. What's validated here is "does the code handle a given model response correctly" — not "does the real Claude Haiku model actually produce compliant output under the new prompt." That second question can only be answered by running real cases through the actual n8n workflow with live API access, which I can't do from here. Treat this as a strong pre-import code check, not a substitute for a real dry run.

---

## Results summary

| # | Test | Status |
|---|---|---|
| TC01 | High urgency + distinct seller motivation (relocation) | PASS |
| TC02 | Calm listing, no urgency, no timing | PASS |
| TC03 | Model wrongly includes liquidity with fake high confidence | PASS — override confirmed |
| TC04 | Urgency/seller_motivation collapsed into identical evidence | PASS — violation correctly detected |
| TC05 | Truncated/invalid JSON from model | PASS — correctly rejected, routed to error branch |
| TC06 | Model omits `signals` entirely (legacy-style response) | **FAIL — real gap, see below** |
| TC07 | Signal confidence out of range (1.5) | FAIL (known gap — see below) |
| TC08 | Evidence returned as a string, not an array | FAIL (known gap — see below) |
| TC09 | Signal level outside enum (`"very_high"`) | FAIL (known gap — see below) |
| TC10 | No area anywhere (input or model) | Exposed a **pre-existing** quirk, not new — see below |
| TC11 | Timing signal present — buyer_context must attempt, not skip | PASS |
| TC12 | Empty input text | PASS — correctly rejected |
| TC13 | FB ingestion path (different node) | PASS |
| TC14 | English-only input (robustness) | PASS |
| TC15 | Adversarial fake liquidity with fabricated area-level evidence | PASS — override confirmed |

**10 clean PASS, 1 real gap requiring a fix (TC06), 3 known-gap FAILs that were deliberately constructed to probe for missing validation (TC07–09), 1 pre-existing quirk exposed but not caused by this work (TC10).**

---

## Finding 1 (blocking) — TC06: missing signal keys aren't filled with placeholders

**What happens today**: the Parse node only force-fills `signals.liquidity`. If the model's response omits the `signals` object entirely (e.g. an older-style response, or the model just forgets), the other 8 keys (`demand, price, offer, finance, value, location, urgency, seller_motivation`) simply don't exist in the object written to `content_frames.signals` — only `liquidity` would be present.

**Why it matters**: any dashboard or query expecting all 9 keys to always exist (e.g. `signals.demand.level`) would need defensive null-checks everywhere, and it silently degrades data completeness exactly the way ISSUE-007's silent failures did — not a crash, just quietly incomplete data.

**Recommended fix** (not yet applied — needs your go-ahead): in both Parse nodes, after the existing liquidity-enforcement block, loop over all 8 post-level keys and fill in the same `{level:null, confidence:0, evidence:[], source_scope:'post'}` placeholder for any that are missing, mirroring exactly what's already done for liquidity. Small, low-risk, additive change to the same file.

## Finding 2 (non-blocking, flagged for a future hardening pass) — TC07/08/09: no per-signal schema validation at insert time

The code trusts whatever shape the model returns for `level`, `confidence`, and `evidence` on the 8 post-level signals — nothing clamps confidence to `[0,1]`, nothing checks `evidence` is actually an array, nothing checks `level` is one of `low|medium|high|null`. Postgres won't catch this either since `signals` is a JSONB column with no schema constraint. In practice, Claude Haiku following the prompt correctly should rarely produce these, but "rarely" isn't "never" — recommend a small sanitization function (clamp confidence, coerce non-array evidence to `[String(evidence)]`, drop unrecognized levels to `null`) at the same point where liquidity is already enforced. Not blocking Phase 4 completion since real-world frequency is unknown until Phase 4.5 (live dry run) — recommend deciding after seeing real model behavior rather than guessing at validation rules now.

## Finding 3 (pre-existing, unrelated to ADR-005) — TC10: `parse_ok` requires the model to return `area` even though a fallback exists

If the model's response has no `area` field, `parse_ok` becomes `false` (computed from `!!(parsed.area && parsed.insight && !parsed.error)`) and the record is discarded via the error branch — even though a few lines later the same code has `area: parsed.area ?? area_hint ?? 'unknown'`, a fallback that never gets reached because `parse_ok` gated it first. **This logic already existed before ADR-005** (present in the original v1 file too) — Phase 4 testing just happened to expose it. Not something Phase 3 introduced, and not something I'd recommend changing as part of this ADR without a separate decision, since it may be intentional (reject anything the model can't even name an area for, rather than accumulate a pile of "unknown" rows). Flagging for awareness only.

---

## Recommendation

Fix Finding 1 (blocking) before any import — it's small and directly affects data completeness, which is the whole point of ADR-005. Finding 2 can wait for real-world signal from a live dry run. Finding 3 is out of scope for this ADR.

I have not patched the file yet — want me to apply the Finding 1 fix now, or leave it as a documented known-issue for this review cycle?
