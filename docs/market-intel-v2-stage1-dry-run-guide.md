# Stage 1 — Import + Dry Run Execution Guide

**Updated 2026-07-07 (Phase 4.1b)** — the workflow file has been rebuilt. The 3 Supabase writes are no longer done inside Code nodes at all. Both previous approaches failed on live testing:
- `this.getCredentials()` in a Code node → real error `this.getCredentials is not a function` (Code nodes never support this).
- `$env.SUPABASE_SERVICE_KEY` in a Code node → real error `access to env vars denied`, even with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false` set and the service fully restarted. This matches a currently open, unresolved n8n bug ([n8n-io/n8n#29603](https://github.com/n8n-io/n8n/issues/29603)) — not something fixable by us on this n8n version.

**Fix**: the 3 Supabase writes now use n8n's native **Supabase node** (`n8n-nodes-base.supabase`), which uses n8n's real credential system and is unaffected by either bug. This required restructuring around the writes (see "What changed" below), but nothing about the parsing logic, the signal contract, or the webhook paths changed.

**Re-import required.** If you already imported the old version of this file, delete that workflow and import this corrected one fresh — too much of the node graph changed for safe manual patching in the UI.

---

## What changed structurally

- **`💾 Supabase: market_insights`** — same name, now a native Supabase node directly (was a Code node). Nothing downstream reads its output, so this was a straight swap.
- **`💾 buyer_context (conditional)`** — split into 4 nodes: `💾 buyer_context: prep` (Code — decides skip vs. write, same logic as before) → `🔀 Has Timing Signal?` (IF node) → `💾 buyer_context: insert` (native Supabase, only runs on the true branch) → **`💾 buyer_context (conditional)`** (Code — merge node, deliberately kept the *original name* so every existing downstream reference — Claude Generate Content, content_frames, both Telegram messages — still resolves without any other edits).
- **`💾 Supabase: content_frames`** — split into 3 nodes: `💾 content_frames: prep` (Code — all the signal normalization / target_context / positioned_content / ai_summary computation, unchanged logic) → `💾 content_frames: insert` (native Supabase) → **`💾 Supabase: content_frames`** (Code — merge node, original name kept so both Telegram messages still resolve `$json.content_frame_saved` / `$json.content_frame_error` / `$json.text` unchanged).

Why the merge nodes exist: a native Supabase node's output is *only* the row it just inserted (or an error object) — it replaces the incoming JSON entirely. The merge nodes reconstruct the full context (original parse fields + save status) that downstream nodes expect, by referencing the earlier prep node via `$('node name')`.

`continueOnFail: true` is set on all 3 native Supabase nodes, matching the original try/catch-and-continue behavior — a Supabase error routes into the merge node's error branch instead of stopping the execution.

## Step 1 — Import (n8n UI)

1. If you previously imported this workflow, **delete that workflow first** (too much of the graph changed for in-place editing to be safe).
2. Open n8n → Workflows → Import from File.
3. Import: `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v2 (ADR-005).json`
4. Confirm `active` shows as **off/false** after import.

## Step 2 — Configure the Supabase credential (the actual fix this time)

1. In n8n, go to **Credentials → Add Credential → Supabase API** (if you don't already have one for this instance).
2. Fill in:
   - **Host**: your Supabase project URL, e.g. `https://omvpagvqyfmkkhzuuzda.supabase.co`
   - **Service Role Secret**: the `service_role` key from Supabase Dashboard → Settings → API (the long `eyJ...` JWT behind "Reveal" — **not** the project ref `omvpagvqyfmkkhzuuzda`, and not the `anon` key).
3. Save the credential (name it whatever you like, e.g. "Supabase account").
4. Open each of the 3 native Supabase nodes — `💾 Supabase: market_insights`, `💾 buyer_context: insert`, `💾 content_frames: insert` — and select this credential in the node's Credential dropdown (the file ships with a placeholder `REPLACE_WITH_YOUR_SUPABASE_CREDENTIAL_ID` that n8n will ask you to resolve on open).
5. Open `📱 Telegram: แจ้งเตือน` and `❌ Telegram: Error` — confirm the `Telegram Intel Bot` credential (id `ImDBxePys7cyMDCW`) still resolves.

## Step 3 — Dry run against the v2 test paths only

Webhook paths are `market-intel-v2/fb` and `market-intel-v2/manual` — deliberately different from production, so this cannot touch live traffic even while active.

Easiest method (no PowerShell needed): open `✍️ Webhook: Manual Input`, click **"set mock data"**, paste one of the JSON bodies below, then click **Execute workflow** (choosing "Execute workflow from Manual Input" if prompted, not the FB trigger). Repeat with different mock bodies for each case below. This runs the real pipeline — real Claude Haiku calls, real Supabase writes — without needing to activate the workflow or send actual HTTP requests.

```json
{ "body": { "text": "บ้านทาวน์เฮ้าส์ลำลูกกา 2 ชั้น เจ้าของขายด่วนเพราะย้ายไปทำงานต่างจังหวัดสิ้นเดือนนี้ ราคา 2.85 ล้าน ต่อรองได้ ใกล้ตลาด", "area": "ลำลูกกา" } }
```
```json
{ "body": { "text": "คอนโดห้องมุมวิวสวย ต่อรองได้ ผู้ขายให้ราคาดี" } }
```
```json
{ "body": { "text": "ด่วนมาก! ต้องขายภายในอาทิตย์นี้ ย้ายไปทำงานเชียงใหม่ เจ้าของยอมลดราคาให้คนที่ตัดสินใจเร็ว", "area": "รังสิต" } }
```
```json
{ "body": { "text": "บ้านเดี่ยว 3 ห้องนอน สภาพดี ทำเลปกติ ไม่รีบขาย", "area": "บางบัวทอง" } }
```
```json
{ "body": { "text": "", "area": "" } }
```

Also try one via `📊 Webhook: FB Posts` mock data:
```json
{ "body": { "post_text": "มองหาบ้านใกล้ตลาด ราคาต่อรองได้ เจ้าของอยากขายเร็วเพราะย้ายบ้าน", "area": "ธัญบุรี" } }
```

If you'd rather use real HTTP calls instead of mock data, activate the workflow temporarily and use the same PowerShell pattern as before, pointed at `/webhook/market-intel-v2/manual` and `/webhook/market-intel-v2/fb` on your n8n instance's webhook base URL — deactivate again right after.

## Step 4 — What to send back to me (or just tell me you're done)

Once these run, tell me and I'll query `content_frames`, `market_insights`, and `buyer_context_signals` directly via Supabase MCP, filtering on `collector_version = 'v2'` / recent `created_at`, and check:
- All 9 signal keys present with valid shapes in `content_frames.signals`
- `liquidity` always `{level: null, confidence: 0, source_scope: 'area_aggregate'}` under a *real* Claude response
- Whether `urgency` and `seller_motivation` come back genuinely distinct under real model conditions (the 3rd test case is designed to probe this)
- `target_context`, `positioned_content`, `ai_summary` populated correctly
- The empty-text case produced no new row and routed to the error Telegram message instead
- `market_insights` and `buyer_context_signals` got real rows too, confirming the native Supabase nodes actually authenticate and write correctly

## Step 5 — Deactivate

If you activated the workflow for real HTTP testing, turn it back to `active: false` after the dry run, regardless of outcome.
