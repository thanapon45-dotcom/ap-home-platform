# Market Intel Collector — n8n workflow source-of-truth report

Written 2026-07-07 as part of ADR-005 Phase 2.5 (Reality Alignment Pass). All three files below share the same n8n workflow `id: AANzjecqbBwlBCrR` (`Finnhouses — Market Intelligence Collector v1`) — they are export snapshots of the same workflow at different points in time, not different workflows.

## Files compared

| Label | Path |
|---|---|
| **A** | `ap-home-platform/scripts/Finnhouses — Market Intelligence Collector v1 (fixed).json` |
| **B** | `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v1 (2).json` |
| **C** (bonus, also checked) | `ap-home-platform/scripts/Finnhouses — Market Intelligence Collector v1 (env-fixed).json` |

## Node-by-node diff (A vs B)

| Node | Result |
|---|---|
| 🤖 FB: Normalize + Parse | Identical |
| 🤖 Manual: Normalize + Parse | Identical |
| ✨ Claude: Generate Content | Identical |
| 💾 Supabase: market_insights | Differs — only in how the Supabase key is obtained (see Security below). Insert body identical. |
| 💾 buyer_context (conditional) | Differs — only in how the Supabase key is obtained + comment removal. Insert body identical. |
| 💾 Supabase: content_frames | **Differs substantially** — this is the important one. |

### The content_frames insert node — the actual difference that matters

**A** (`scripts/.../(fixed).json`) inserts:
```js
{
  area:           ctx.area ?? 'unknown',
  target_segment: ctx.buyer_segment ?? 'general',
  keyword:        ctx.positioned_hook ?? ctx.insight ?? '',
  frame_text:     d.text ?? '',
  timing_signal:  ctx.timing_signal ?? 'none',
  source_type:    ctx.source_type ?? 'manual',
}
```
`area`, `timing_signal`, `source_type` are **not real columns** in production `content_frames`. This insert has been failing on every single run since the workflow went live — rejected by PostgREST, swallowed silently by the bare `try/catch`. This is exactly ISSUE-007.

**B** (`memory/n8n-workflows/.../(2).json`) inserts:
```js
{
  frame_text:     d.text ?? '',
  frame_type:     'fb_post',
  target_segment: ctx.buyer_segment ?? 'general',
  target_context: target_context || null,   // composite: area | timing:X | source:Y
  keyword:        ctx.positioned_hook ?? ctx.insight ?? '',
  channel:        'facebook',
}
```
Every key here (`frame_text, frame_type, target_segment, target_context, keyword, channel`) is a real column, confirmed directly against the live `content_frames` schema via Supabase MCP. B is explicitly commented as the session 19d/19e fix for ISSUE-007, and also now tracks `saveOk`/`saveError` instead of only logging to console — better observability than A.

**C** (`scripts/.../(env-fixed).json`) has the **same broken payload as A** (`area/timing_signal/source_type`) — only the credential-fetch method differs (`$env.SUPABASE_SERVICE_KEY` instead of `getCredentials()`). C is not closer to correct than A; it's a same-generation sibling.

## Which one matches current production schema

**B.** Confirmed directly against the live database (Supabase MCP, project `omvpagvqyfmkkhzuuzda`, table `content_frames`, 2026-07-07). A and C do not — they would both fail on every insert if run as-is against the current schema.

## Security note — do not carry this forward as-is

None of the three files is the "correct" one to copy wholesale:

- **A** uses `this.getCredentials('supabaseApi')` — the safe pattern, no secret in the file.
- **C** uses `$env.SUPABASE_SERVICE_KEY` — depends on n8n's `EXECUTIONS_MODE=own` behavior (per AI_TEAM.md §12, `$env` access is not guaranteed in `queue` mode), but still no secret committed to the file.
- **B** — the one with the *correct column mapping* — has the Supabase **service_role key hardcoded in plaintext directly in the JSON** across all three of its Supabase-writing nodes (`market_insights`, `buyer_context`, `content_frames`). This violates AI_TEAM.md §8 ("Never hardcode secrets") and creates a live exposure risk since this key has full service-role access and is sitting in a project folder as plain text.

**Recommendation**: Phase 3 must **not** import B as-is. It must merge B's column mapping (the only part that's correct against production) with A's `getCredentials('supabaseApi')` credential pattern (the only part that's secure). Additionally, since the service_role key is already exposed in plaintext in file B, recommend rotating it per AI_TEAM.md §13 Secret Rotation Policy regardless of what else happens in Phase 3 — it should be treated as compromised the moment a plaintext copy exists in a project folder, even one not committed to a public remote.

**Unresolved question**: static files don't prove what's actually imported and active inside n8n right now. Recommend confirming in the n8n UI (workflow `AANzjecqbBwlBCrR`) which version is truly live before Phase 3 edits are built on an assumption — if the live workflow already matches B's column mapping (plausible, since ISSUE-007 says it was fixed and backfilled 26 posts), then Phase 3 is "add signals fields to what's already live," not "replace a broken insert." If the live workflow still matches A/C, then ISSUE-007's fix was documented but never actually deployed, which would be a second silent-failure finding on top of the first.
