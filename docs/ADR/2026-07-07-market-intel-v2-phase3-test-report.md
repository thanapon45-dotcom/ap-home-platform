# ADR-005 Phase 3 — test export report

**Status**: test export only. Not imported into n8n. Not activated. Production workflow untouched.

**File produced**: `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v2 (ADR-005).json`

**Base strategy** (per approval): content_frames column mapping + saveOk/saveError logic from **B** (`Finnhouses — Market Intelligence Collector v1(2).json`, the ISSUE-007 fix), credential-handling pattern from **A** (`scripts/.../v1 (fixed).json`, `this.getCredentials('supabaseApi')`). No plaintext secret was copied from either source file into the new one.

---

## 1. Node changes summary

| Node | Change |
|---|---|
| 📊 Webhook: FB Posts / ✍️ Webhook: Manual Input | Path changed to `market-intel-v2/fb` / `market-intel-v2/manual` and new `webhookId`s generated, so this workflow cannot collide with the live webhook paths even if it were accidentally activated. A `notes` field on each explains this and flags that the path must be changed back only during a governed cutover (AI_TEAM.md §12: deactivate old → import new → verify → activate new → delete old). |
| 🤖 FB / Manual: Normalize + Parse | Prompt's JSON contract extended with a `signals` object (`demand, price, offer, finance, value, location, urgency, seller_motivation`), each `{level, confidence, evidence[], rubric_note}`. Explicit rubric text added distinguishing `urgency` (surface language) from `seller_motivation` (inferred reason) per ADR-005. Explicit instruction telling the model **not** to output `liquidity`. All original fields (`area, insight, category, confidence, property_type, price, urgency, buyer_segment, timing_signal, emotional_keywords, positioned_hook`) kept unchanged so `market_insights`/`buyer_context_signals` writes are unaffected. |
| 💾 Supabase: market_insights | Hardcoded key → `this.getCredentials('supabaseApi')`. Now also returns `market_insight_saved`/`market_insight_error` (previously silent `console.log`-only on failure). |
| 💾 buyer_context (conditional) | Hardcoded key → `this.getCredentials('supabaseApi')`. Now returns `buyer_context_saved`/`buyer_context_error`/`buyer_context_skipped` (distinguishes "skipped, no timing signal" from "attempted and failed"). |
| 💾 Supabase: content_frames | Hardcoded key → `this.getCredentials('supabaseApi')`. Keeps B's real-schema mapping (`frame_text, frame_type, target_segment, target_context, keyword, channel`) unchanged. **Adds** `signals`, `positioned_content`, `ai_summary`, `collector_version: 'v2'` to the insert body. `signals.liquidity` is force-set in code (not trusted from the LLM) to `{level:null, confidence:0, source_scope:'area_aggregate', evidence:[]}` — this happens twice (once in the Parse node, once again here) as defense in depth. Continues to return `content_frame_saved`/`content_frame_error`. |
| ✨ Claude: Generate Content | Unchanged. |
| 📱 Telegram nodes | Unchanged except a "(v2 test)" label added to the notification text, and the success message now mentions `collector_version: v2`, so test notifications are visually distinguishable from production ones if this were ever pointed at the real Telegram bot. |

## 2. Credential changes

Both Supabase-writing Code nodes and the new content_frames node now declare `"credentials": {"supabaseApi": {"id": "REPLACE_WITH_YOUR_CREDENTIAL_ID", "name": "Supabase account"}}` (same placeholder pattern file A already used) and call `this.getCredentials('supabaseApi')` at runtime. **No service_role key appears anywhere in this file** — verified by grepping the produced JSON for the known key prefix; zero matches. The `id: "REPLACE_WITH_YOUR_CREDENTIAL_ID"` placeholder must be pointed at your actual "Supabase account" credential inside n8n's UI after import (n8n will prompt for this, since a placeholder ID can't resolve to a real credential).

## 3. Signal contract compliance

- 8 signals (`demand, price, offer, finance, value, location, urgency, seller_motivation`) come from the LLM, each with `level/confidence/evidence/rubric_note`.
- `liquidity` is **never** requested from the LLM and is force-written as the `area_aggregate` placeholder in code, at two separate points in the pipeline (Parse node and content_frames insert node), so even if a future prompt edit accidentally asks for it, the code overwrites whatever the model returns.

## 4. Sample execution output

I can't execute n8n directly or call the live Anthropic/Supabase endpoints from this sandbox (no outbound network access here). Instead, I extracted the **actual jsCode from the produced workflow file** and ran it for real in a Node.js harness, with only two things mocked: (1) the Claude API response for the Parse node, and (2) the Supabase HTTP call (which just needed to not throw). Every other line — the `signals` construction, the `target_context` composite, `positioned_content`/`ai_summary` derivation, the liquidity enforcement — is the real production code executing, not hand-written by me.

**Input** (simulated manual observation):
> "บ้านทาวน์เฮ้าส์ลำลูกกา 2 ชั้น เจ้าของขายด่วนเพราะย้ายไปทำงานต่างจังหวัดสิ้นเดือนนี้ ราคา 2.85 ล้าน ต่อรองได้ ใกล้ตลาด"

**Actual Supabase `content_frames` INSERT payload produced by the real code**:
```json
{
  "frame_text": "มองหาบ้านลำลูกกา ใกล้ตลาด พร้อมอยู่? เจ้าของย้ายด่วน ต่อรองได้เลย ทักมาปรึกษาเลย 0627946152",
  "frame_type": "fb_post",
  "target_segment": "resale",
  "target_context": "ลำลูกกา | source:observation",
  "keyword": "บ้านพร้อมอยู่ ใกล้ตลาด เจ้าของย้ายด่วน ต่อรองได้",
  "channel": "facebook",
  "signals": {
    "demand": { "level": "medium", "confidence": 0.6, "evidence": ["มีคนทักถามราคาแล้ว 3 คน"], "source_scope": "post" },
    "price": { "level": "medium", "confidence": 0.7, "evidence": ["ราคา 2.85 ล้าน ใกล้เคียงเรทตลาดแถวนั้น"], "source_scope": "post" },
    "offer": { "level": "high", "confidence": 0.75, "evidence": ["ต่อรองได้ พร้อมโอนเร็ว"], "source_scope": "post" },
    "finance": { "level": null, "confidence": 0, "evidence": [], "source_scope": "post" },
    "value": { "level": "medium", "confidence": 0.5, "evidence": ["บ้านพร้อมอยู่ ใกล้ตลาด"], "source_scope": "post" },
    "location": { "level": "medium", "confidence": 0.5, "evidence": ["ใกล้ตลาด"], "source_scope": "post" },
    "urgency": { "level": "high", "confidence": 0.85, "evidence": ["ขายด่วน", "ต้องการปิดการขายภายในสิ้นเดือน"], "source_scope": "post" },
    "seller_motivation": { "level": "high", "confidence": 0.7, "evidence": ["ต้องย้ายไปทำงานต่างจังหวัด"], "source_scope": "post" },
    "liquidity": { "level": null, "confidence": 0, "evidence": [], "source_scope": "area_aggregate", "rubric_note": "waiting for Hub historical aggregation — not implemented yet (ADR-005)" }
  },
  "positioned_content": {
    "hook": "บ้านพร้อมอยู่ ใกล้ตลาด เจ้าของย้ายด่วน ต่อรองได้",
    "signal_refs": ["demand", "price", "offer", "value", "location", "urgency", "seller_motivation"],
    "channel": "facebook",
    "example_copy": "มองหาบ้านลำลูกกา ใกล้ตลาด พร้อมอยู่? เจ้าของย้ายด่วน ต่อรองได้เลย ทักมาปรึกษาเลย 0627946152"
  },
  "ai_summary": {
    "text": "เจ้าของบ้านโพสต์ขายด่วนเพราะต้องย้ายไปทำงานต่างจังหวัดภายในสิ้นเดือน",
    "confidence": 0.8,
    "model": "claude-haiku-4-5-20251001"
  },
  "collector_version": "v2"
}
```

Confirms: `liquidity` was never asked of the mock LLM response (I deliberately omitted it from the mock) and the code still filled it in correctly with the safe placeholder — the enforcement works even when the model is silent on it, not just when it tries to override it. `urgency` and `seller_motivation` came through as distinct signals with different evidence, not duplicates of each other, in this example. All 6 real production columns are populated exactly as before; all 4 new columns are additive.

## 5. What's still needed before any real import

1. Point the `REPLACE_WITH_YOUR_CREDENTIAL_ID` placeholder at the real "Supabase account" credential inside n8n after import (manual step, cannot be done from a file).
2. Phase 4 — build the ≥10-example QA dataset and run it against the **real** Claude Haiku call (not the mock used here) to check the model actually follows the signal-format and urgency/seller_motivation rubric under real conditions, not just that the surrounding code handles a well-formed response correctly.
3. When ready to go live: change the webhook paths back to `market-intel/fb` / `market-intel/manual`, then follow the governed swap (deactivate old → import this → verify → activate → archive old), never running both active at once.

No workflow was activated, imported, or connected to the production webhook. No secret was copied into the new file or into this report.
