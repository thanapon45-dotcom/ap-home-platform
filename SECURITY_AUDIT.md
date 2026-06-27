# SECURITY_AUDIT.md — AP-Home Platform OS
*บจก.อาชิดา | Audit Date: Jun 5, 2026 | No code changes made*

---

## Scope

- `app/api/` — all Vercel server-side routes
- `services/backend-hub/server.cjs` — Hub Express server
- `services/fb-backend/server.js` — FB Backend Express server
- `lib/supabase.ts` — Supabase client
- `next.config.ts`, `vercel.json` — framework config
- `supabase-migration.sql` — DB schema + RLS
- Deployment: Railway, Vercel, Supabase env vars

Severity scale: 🔴 Critical | 🟠 High | 🟡 Medium | 🟢 Low | ℹ️ Info

---

## FINDING S-01 — Hub: Wildcard CORS
**Severity:** 🔴 Critical  
**Location:** `services/backend-hub/server.cjs` lines 231–234

```js
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
```

**Risk:** Any website in the world can make authenticated cross-origin requests to all Hub endpoints. Since Hub has no auth, this effectively makes all 25 Hub endpoints public APIs callable from any browser.

**Fix:** Restrict to `DASHBOARD_ORIGIN` (already defined as env var). Replace `"*"` with `process.env.DASHBOARD_ORIGIN` and optionally `https://ap-home-platform.vercel.app`.

---

## FINDING S-02 — Zero Authentication on Hub Endpoints
**Severity:** 🔴 Critical  
**Location:** All 25 endpoints in `services/backend-hub/server.cjs`

No route requires any token, API key, IP allowlist, or session. Anyone who knows the Railway URL can:
- Trigger blog publishing: `POST /action/blog/run`
- Post to Facebook: `POST /action/fb/publish`
- Clear the content queue: `POST /action/fb/queue/clear`
- Publish a property to WordPress: `POST /action/property/publish`
- Dismiss a property under review: `POST /action/property/dismiss`

Railway URL is publicly discoverable (visible in browser network tab when Dashboard loads).

**Fix:** Add a shared secret middleware. Vercel API routes include `X-Hub-Token: process.env.HUB_SECRET` header. Hub validates this header before processing any request.

```js
// Hub middleware
app.use((req, res, next) => {
  const token = req.headers["x-hub-token"];
  if (token !== process.env.HUB_SECRET) return res.status(401).json({ error: "Unauthorized" });
  next();
});
```

---

## FINDING S-03 — Zero Authentication on Vercel API Proxy Routes
**Severity:** 🔴 Critical  
**Location:** `app/api/fb/`, `app/api/blog/`, `app/api/property/`, `app/api/market-intel/`

All Vercel proxy routes accept POST from any caller without authentication. Vercel API routes are internet-accessible. Anyone can:
- `POST https://ap-home-platform.vercel.app/api/fb/publish` with arbitrary content → posts to Finnhouses Facebook page
- `POST /api/blog/queue/run-next` → triggers blog publish + WordPress + AI cost
- `POST /api/market-intel` → sends arbitrary data to n8n

Since Dashboard is an internal tool, all API routes should be protected.

**Fix:** Add session/cookie-based auth (NextAuth.js or simple password gate) or at minimum a shared API secret checked in each route handler.

---

## FINDING S-04 — Hub State Not Durable (hub-state.json)
**Severity:** 🟠 High  
**Location:** `services/backend-hub/server.cjs` — `STATE_FILE = path.join(__dirname, "hub-state.json")`

State is written to the local filesystem inside the Railway container. Every Railway redeploy (which happens on every git push) wipes the container and loses all in-progress state: current blog run, FB queue position, property review state.

**Risk:** Silent data loss. A blog run in progress becomes orphaned. Queue position resets to 0 silently.

**Fix:** Persist state to Supabase. Hub already has Supabase credentials — add a `hub_state` table and read/write state there instead of the filesystem.

---

## FINDING S-05 — RLS Disabled on 3 Supabase Tables
**Severity:** 🟠 High  
**Location:** `decisions.md` — confirmed disabled: `fb_sellers`, `fb_listings`, `fb_listing_history`

**Stated reason:** No `SUPABASE_SERVICE_KEY` in n8n env — anon key needed for direct write.

**Risk:** Anyone with the Supabase project URL and anon key (which is `NEXT_PUBLIC` — exposed in browser bundle) can read, write, and delete all market intelligence data in these tables.

**Fix Option A:** Enable RLS + add policy `FOR INSERT TO anon WITH CHECK (true)` — allow insert, deny delete/update from anon.  
**Fix Option B:** Use Supabase service key in Hub (server-side only) for these writes. Already feasible since Hub is server-side.

---

## FINDING S-06 — Supabase Anon Key Exposed in Browser Bundle
**Severity:** 🟡 Medium (by design, acknowledged)  
**Location:** `lib/supabase.ts`, `next.config` — `NEXT_PUBLIC_SUPABASE_ANON_KEY`

The `NEXT_PUBLIC_` prefix causes Next.js to embed the key in the client-side JavaScript bundle. Any visitor to the Dashboard can extract it from browser DevTools.

**This is Supabase's intended design** — anon key is meant to be public, and RLS is the protection layer. The risk exists because RLS is either disabled (S-05) or configured as `allow_all` (S-07).

**Fix:** This finding is acceptable IF RLS is properly configured on all tables.

---

## FINDING S-07 — Supabase `leads` Table: allow_all Policy
**Severity:** 🟠 High  
**Location:** `supabase-migration.sql`

```sql
CREATE POLICY "allow_all" ON leads FOR ALL USING (true) WITH CHECK (true);
```

The `leads` table contains real CRM data: customer names, phone numbers, budgets, notes, stage. The policy allows any anon-key caller to SELECT, INSERT, UPDATE, and DELETE any lead.

**Fix:** Restrict to authenticated users only, or at minimum restrict DELETE and UPDATE to service role. Since Dashboard is internal, add row-level auth tied to a login session.

---

## FINDING S-08 — n8n API Keys Hardcoded in Workflow JSON
**Severity:** 🟠 High  
**Location:** `memory/n8n-workflows/FB_Market_Intelligence_v4_fixed.json`, `wf_market_intelligence_collector.json`

Due to n8n v2.21.4 blocking `$env` in Code nodes (confirmed architectural constraint), API keys are hardcoded directly in workflow node bodies. If these JSON files are ever:
- Committed to git
- Shared externally
- Exported from n8n UI

...the keys are exposed.

**Current mitigation:** Files stored in `memory/` folder locally, not committed.  
**Fix:** Migrate to n8n Credentials system — keys stored encrypted in n8n DB, not in workflow node bodies. This works even with the `$env` block.

---

## FINDING S-09 — next.config.ts: allowedOrigins Wildcard
**Severity:** 🟡 Medium  
**Location:** `next.config.ts`

```ts
experimental: { serverActions: { allowedOrigins: ["*"] } }
```

Allows Server Actions to be invoked from any origin. Since Server Actions can mutate data, this is overly permissive.

**Fix:** Restrict to `["ap-home-platform.vercel.app"]` or the actual production domain.

---

## FINDING S-10 — FB Backend: No Auth on /api/fb/publish
**Severity:** 🟠 High  
**Location:** `services/fb-backend/server.js`

The FB Backend publish endpoint has no auth. If the Railway URL is known, anyone can post arbitrary content to the Finnhouses Facebook page.

```js
app.post("/api/fb/publish", async (req, res) => {
  const runId   = String(req.body?.runId || "");
  const content = String(req.body?.content || "");
  // No auth check
```

**Fix:** Same shared secret pattern as S-02. Hub already knows FB_BACKEND_URL — add `X-Hub-Token` to calls from Hub, validate in FB Backend.

---

## FINDING S-11 — No Rate Limiting on Any Endpoint
**Severity:** 🟡 Medium  
**Location:** All routes

No rate limiting on `/api/chat`, `/api/image`, or any Hub endpoint. Risks:
- Runaway AI API costs if endpoint is discovered and abused
- `/api/image` calls OpenAI gpt-image-1 — expensive per call

**Fix:** Add `express-rate-limit` to Hub. Add Vercel Edge Rate Limiting or simple IP-based counter on `/api/chat` and `/api/image`.

---

## FINDING S-12 — FB Token Manual Rotation Risk
**Severity:** 🟡 Medium  
**Location:** Railway easygoing-friendship → `FB_PAGE_ACCESS_TOKEN`

Token expires ~Aug 2, 2026. No automated reminder or monitoring. If missed → all Facebook publishing silently fails.

**Fix:** Add n8n scheduled workflow that checks token validity weekly and sends Telegram alert 14 days before expiry.

---

## FINDING S-13 — market-intel Route: Hardcoded External Webhook URL
**Severity:** 🟢 Low  
**Location:** `app/api/market-intel/route.ts`

```ts
const N8N_WEBHOOK = "https://primary-production-8158a.up.railway.app/webhook/market-intel/manual";
```

URL is hardcoded — not an env var. If n8n URL changes, requires code deploy.

**Fix:** Move to `process.env.N8N_MARKET_INTEL_WEBHOOK` in Vercel environment variables.

---

## FINDING S-14 — Duplicate API Routes
**Severity:** 🟢 Low  
**Location:** `app/api/market-intel/route.ts` and `app/api/market-intel/submit/route.ts`

Both routes call the same n8n webhook. Different body field handling creates inconsistent behaviour. Risk: future edits update one but not the other.

**Fix:** Delete one, consolidate to a single canonical route.

---

## Summary Table

| ID | Finding | Severity | Effort to Fix |
|----|---------|---------|--------------|
| S-01 | Hub wildcard CORS | 🔴 Critical | Low |
| S-02 | No auth on Hub endpoints | 🔴 Critical | Medium |
| S-03 | No auth on Vercel proxy routes | 🔴 Critical | Medium |
| S-04 | Hub state not durable | 🟠 High | Medium |
| S-05 | RLS disabled on 3 tables | 🟠 High | Low |
| S-06 | Anon key in browser bundle | 🟡 Medium | Acceptable if RLS fixed |
| S-07 | leads allow_all policy | 🟠 High | Low |
| S-08 | API keys hardcoded in n8n JSON | 🟠 High | Medium |
| S-09 | allowedOrigins wildcard | 🟡 Medium | Low |
| S-10 | FB Backend no auth | 🟠 High | Low |
| S-11 | No rate limiting | 🟡 Medium | Medium |
| S-12 | FB token rotation risk | 🟡 Medium | Low |
| S-13 | Hardcoded webhook URL | 🟢 Low | Low |
| S-14 | Duplicate market-intel routes | 🟢 Low | Low |

---

## Priority Fix Order (Quick Wins First)

1. **S-01** — Hub CORS: change `"*"` to `DASHBOARD_ORIGIN` — 5 minutes, 1 line change
2. **S-09** — next.config allowedOrigins: specify domain — 5 minutes, 1 line change
3. **S-05 + S-07** — RLS fixes in Supabase SQL Editor — 15 minutes, no code deploy
4. **S-13 + S-14** — Env var + delete duplicate route — 20 minutes
5. **S-02 + S-10** — Shared secret on Hub + FB Backend — 1–2 hours
6. **S-03** — Auth on Vercel proxy routes — 2–4 hours (depends on auth strategy)
7. **S-04** — Hub state to Supabase — 4–8 hours
8. **S-08** — Migrate n8n keys to Credentials system — 1–2 hours per workflow
9. **S-11** — Rate limiting — 2–3 hours
10. **S-12** — Token expiry monitoring workflow — 1–2 hours

---

*Audit by Claude | AP-Home Platform OS | Jun 5, 2026 | Read-only — no code changes made*
