# ADR-005 Phase 4.1 — Diff Summary

**File changed**: `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v2 (ADR-005).json` (still the Phase 3 test-export file — not imported, not activated).

**Nodes changed**: `🤖 FB: Normalize + Parse`, `🤖 Manual: Normalize + Parse`, `💾 Supabase: content_frames`. No other nodes touched. `active: false` and the test webhook paths (`market-intel-v2/fb`, `market-intel-v2/manual`) are unchanged.

---

## 1. `🤖 FB: Normalize + Parse` and `🤖 Manual: Normalize + Parse` (same change applied to both)

### Before (Phase 3)

```js
// ADR-005: liquidity is NEVER LLM-generated, even if the model ignored the prompt rule above.
const signals = (parsed.signals && typeof parsed.signals === 'object') ? parsed.signals : {};
signals.liquidity = {
  level: null,
  confidence: 0,
  evidence: [],
  source_scope: 'area_aggregate',
  rubric_note: 'waiting for Hub historical aggregation — not implemented yet (ADR-005)',
};
for (const key of ['demand','price','offer','finance','value','location','urgency','seller_motivation']) {
  if (signals[key] && typeof signals[key] === 'object') {
    signals[key].source_scope = 'post';
  }
}

return [{ json: {
  ...
  area: parsed.area ?? area_hint ?? 'unknown',
  parse_ok: !!(parsed.area && parsed.insight && !parsed.error),
}}];
```

**Problems this had** (Phase 4 QA Findings 1 and 3): if the model omitted a signal key, or omitted `signals` entirely, that key just didn't exist in the final object — only keys the model happened to return got `source_scope: 'post'` stamped on them. Separately, `parse_ok` required `parsed.area` to be truthy, so the `?? 'unknown'` fallback two lines later was unreachable dead code — any response missing `area` was discarded as a parse failure even when `insight` was present and valid.

### After (Phase 4.1)

```js
// ADR-005 Phase 4.1: normalize + sanitize every signal so the shape written downstream is
// always trustworthy, regardless of what the model actually returned.
const VALID_LEVELS = ['low', 'medium', 'high', null];
function normalizeSignal(raw, sourceScope) {
  const s = (raw && typeof raw === 'object') ? raw : {};
  let level = (s.level === undefined) ? null : s.level;
  if (!VALID_LEVELS.includes(level)) level = null;
  let confidence = (typeof s.confidence === 'number' && isFinite(s.confidence)) ? s.confidence : 0;
  confidence = Math.min(Math.max(confidence, 0), 1);
  let evidence;
  if (Array.isArray(s.evidence)) evidence = s.evidence.map(String);
  else if (s.evidence != null) evidence = [String(s.evidence)];
  else evidence = [];
  const rubric_note = (typeof s.rubric_note === 'string') ? s.rubric_note : null;
  return { level, confidence, evidence, source_scope: sourceScope, rubric_note };
}

const rawSignals = (parsed.signals && typeof parsed.signals === 'object') ? parsed.signals : {};
const signals = {};
for (const key of ['demand','price','offer','finance','value','location','urgency','seller_motivation']) {
  signals[key] = normalizeSignal(rawSignals[key], 'post');
}
signals.liquidity = {
  level: null,
  confidence: 0,
  evidence: [],
  source_scope: 'area_aggregate',
  rubric_note: 'waiting for Hub historical aggregation — not implemented yet (ADR-005)',
};

return [{ json: {
  ...
  area: parsed.area ?? area_hint ?? 'unknown',
  parse_ok: !!(parsed.insight && !parsed.error),
}}];
```

**What changed, concretely**:
1. All 8 post-level signal keys are now always constructed via `normalizeSignal`, never conditionally copied from the model's raw output. A response missing `signals` entirely now produces all 8 keys as `{level:null, confidence:0, evidence:[], source_scope:'post', rubric_note:null}` instead of just having `liquidity` present.
2. `confidence` is clamped to `[0,1]` (`Math.min(Math.max(x,0),1)`); non-numeric/non-finite values default to `0`.
3. `evidence` is coerced to an array: a string becomes a 1-element array, anything else falsy becomes `[]`.
4. `level` is checked against `['low','medium','high',null]`; anything else (e.g. `"very_high"`) is silenced to `null` rather than passed through.
5. `parse_ok` no longer requires `parsed.area` — only `parsed.insight` and the absence of a parse error. The existing `area: parsed.area ?? area_hint ?? 'unknown'` fallback is now actually reachable.

## 2. `💾 Supabase: content_frames` (defense-in-depth layer)

### Before (Phase 3)

```js
const signals = (ctx.signals && typeof ctx.signals === 'object') ? { ...ctx.signals } : {};
signals.liquidity = {
  level: null,
  confidence: 0,
  evidence: [],
  source_scope: 'area_aggregate',
  rubric_note: 'waiting for Hub historical aggregation — not implemented yet (ADR-005)',
};
```

This node only re-enforced the liquidity override; it trusted whatever shape `ctx.signals` had for the other 8 keys, assuming the Parse node upstream had already normalized them.

### After (Phase 4.1)

The same `VALID_LEVELS` / `normalizeSignal` helper (duplicated inline — n8n Code nodes don't share modules) is applied here too, rebuilding all 8 post-level keys from `ctx.signals` before re-attaching the liquidity override. This means even if a future workflow edit ever wires a different upstream node into this one — bypassing the Parse node's normalization — the final `content_frames` insert still gets a fully sanitized `signals` object. This mirrors the file's existing philosophy of enforcing liquidity in two places rather than trusting a single point of enforcement.

---

## Not changed

- The Claude prompt / `SYSTEM` text in both Parse nodes — unchanged. The rubric text asking the model to follow the 9-signal contract and distinguish urgency/seller_motivation is exactly as it was in Phase 3.
- `💾 Supabase: market_insights`, `💾 buyer_context (conditional)`, `✨ Claude: Generate Content`, both Telegram nodes, both webhook nodes, the `✅ Parse OK?` IF node — untouched.
- `active: false`, webhook paths, credential placeholders (`REPLACE_WITH_YOUR_CREDENTIAL_ID`) — untouched.
