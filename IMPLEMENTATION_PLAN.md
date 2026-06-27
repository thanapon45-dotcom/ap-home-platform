# IMPLEMENTATION_PLAN.md — AP-Home Platform OS
*บจก.อาชิดา | Jun 5, 2026 | No code changes made*

---

## Objective

Close all gaps identified in PROJECT_AUDIT.md and SECURITY_AUDIT.md, complete the 7-layer Intelligence Loop, and migrate to the architecture defined in ARCHITECTURE_V2.md.

Work is organized into 5 phases. Each phase is independent and delivers value on its own. Phases do not need to be completed in order, but dependencies are noted.

---

## Phase A — Quick Security Wins (1 day, zero regression risk)

These are 1-liner or SQL-only changes. Do these first.

### A1 — Fix Hub CORS wildcard
**File:** `services/backend-hub/server.cjs` line 232  
**Change:** `"*"` → `process.env.DASHBOARD_ORIGIN || "https://ap-home-platform.vercel.app"`  
**Deploy:** push-hub-fix.bat (or new CI/CD)  
**Risk:** Zero — DASHBOARD_ORIGIN already defined as env var

### A2 — Fix next.config allowedOrigins
**File:** `next.config.ts`  
**Change:** `allowedOrigins: ["*"]` → `allowedOrigins: ["ap-home-platform.vercel.app"]`  
**Deploy:** git push → Vercel auto-deploy  
**Risk:** Zero

### A3 — Fix RLS on fb_sellers, fb_listings, fb_listing_history
**Where:** Supabase SQL Editor  
**SQL:**
```sql
ALTER TABLE fb_sellers ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_listings ENABLE ROW LEVEL SECURITY;
ALTER TABLE fb_listing_history ENABLE ROW LEVEL SECURITY;

-- Allow anon insert (needed for n8n), deny delete/update from anon
CREATE POLICY "anon_insert_only" ON fb_sellers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_only" ON fb_listings FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon_insert_only" ON fb_listing_history FOR INSERT TO anon WITH CHECK (true);
```
**Risk:** Low — test n8n market intel workflow after applying

### A4 — Fix leads RLS policy
**Where:** Supabase SQL Editor  
**Change:** Replace `allow_all` with insert-only for anon, full access for authenticated  
```sql
DROP POLICY IF EXISTS "allow_all" ON leads;
CREATE POLICY "anon_insert" ON leads FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "auth_all" ON leads FOR ALL TO authenticated USING (true) WITH CHECK (true);
```
**Note:** If Dashboard reads leads via anon key (browser), add `FOR SELECT TO anon USING (true)` temporarily until Dashboard auth is added.

### A5 — Consolidate duplicate market-intel routes
**Action:** Delete `app/api/market-intel/submit/route.ts` — keep `app/api/market-intel/route.ts`  
**Check:** Confirm no component calls `/api/market-intel/submit` — search codebase first  
**Risk:** Low

### A6 — Move n8n webhook URL to env var
**File:** `app/api/market-intel/route.ts`  
**Change:** `const N8N_WEBHOOK = process.env.N8N_MARKET_INTEL_WEBHOOK`  
**Add to Vercel:** `N8N_MARKET_INTEL_WEBHOOK=https://primary-production-8158a.up.railway.app/webhook/market-intel/manual`  
**Risk:** Zero

### A7 — Archive stale n8n workflow files
**Action:** Move these 3 files from `memory/n8n-workflows/` → `memory/archive/n8n/`:
- `Finnhouses_V3.2_CALLBACK_FIXED.json`
- `Finnhouses_V3.2_HTTP_UPLOAD_FIXED.json`
- `Finnhouses_V3.2_SANITIZE_UPLOAD_FIXED.json`  
**Risk:** Zero

### A8 — Remove duplicate server.js from backend-hub
**Check:** Confirm `server.cjs` is what Railway runs (check Railway start command)  
**Action:** Delete `services/backend-hub/server.js` if confirmed unused  
**Risk:** Low — confirm before deleting

---

**Phase A Estimate: 2–4 hours total | All can be done in one session**

---

## Phase B — Authentication Layer (2–3 days)

Adds auth to Dashboard + Hub + FB Backend. Biggest security improvement.

### B1 — Hub: Add X-Hub-Token middleware
**File:** `services/backend-hub/server.cjs`  
**Add env var:** `HUB_SECRET=<generate: openssl rand -hex 32>`  
**Add to Railway Hub:** `HUB_SECRET` env var  
**Add to Vercel:** `HUB_SECRET` env var  
**Code:**
```js
// After app.use(express.json())
app.use((req, res, next) => {
  if (req.path === "/health") return next(); // allow health check
  const token = req.headers["x-hub-token"];
  if (!process.env.HUB_SECRET || token !== process.env.HUB_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});
```
**Add to all Vercel proxy routes that call Hub:**
```ts
headers: { "Content-Type": "application/json", "x-hub-token": process.env.HUB_SECRET! }
```

### B2 — FB Backend: Add X-Hub-Token validation
Same pattern as B1. Hub already calls FB Backend — add token to Hub's FB calls + validate in FB Backend.

### B3 — Dashboard: Add simple auth gate
**Option A (faster):** Environment variable password check
```ts
// middleware.ts
import { NextResponse } from "next/server";
export function middleware(req) {
  const session = req.cookies.get("session");
  if (!session && !req.nextUrl.pathname.startsWith("/login")) {
    return NextResponse.redirect(new URL("/login", req.url));
  }
}
```

**Option B (better):** NextAuth.js with Google OAuth — login with archida.15@gmail.com only  
**Recommendation:** Option B — takes 4 hours, much more secure long-term

---

**Phase B Estimate: 1–2 days | Significant security improvement**

---

## Phase C — State Durability (1 day)

Moves Hub state from filesystem to Supabase.

### C1 — Create hub_state and hub_queue tables
**Where:** Supabase SQL Editor
```sql
CREATE TABLE hub_state (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE hub_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL,
  items JSONB DEFAULT '[]',
  current_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE hub_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE hub_queue ENABLE ROW LEVEL SECURITY;
-- Service role only (Hub uses service key)
```

### C2 — Hub: Replace file reads/writes with Supabase calls
**File:** `services/backend-hub/server.cjs`  
**Change:** All `fs.readFileSync(STATE_FILE)` → `supabaseSelect("hub_state", key)`  
**Change:** All `fs.writeFileSync(STATE_FILE)` → `supabaseUpsert("hub_state", {key, value})`  
**Add:** `SUPABASE_SERVICE_KEY` to Railway Hub (use service key, not anon — Hub is server-side)

---

**Phase C Estimate: 1 day | Prevents silent data loss on every redeploy**

---

## Phase D — Intelligence Loop Completion (4–8 weeks)

Builds the 3 missing intelligence layers and connects all 4 BUs.

### D1 — Construction Intelligence (BU1)
**Goal:** Capture BOQ vs actual cost, timeline vs actual, contractor performance

**Steps:**
1. Create `construction_records` table in Supabase (see ARCHITECTURE_V2.md schema)
2. Add "Project Tracker" module to Dashboard (`/projects` route)
   - Input: project name, location, start date, estimated budget, estimated timeline
   - Track: per-phase actual cost entry, completion dates
   - Output: feeds Construction Intelligence
3. Add contractor rating — after each project, rate contractor 1–5 + notes → `defect_log`

**n8n:** Add weekly digest — aggregate construction_records → Claude summary → Telegram

### D2 — QC Line (BU4) — finally build it
**Goal:** Site supervisor sends photos via LINE → AI Vision → structured QC report

**Steps:**
1. Create n8n workflow: LINE webhook → classify message type (photo/text)
   - If photo: send to OpenAI Vision → extract defect_type, severity, location
   - Write to `defect_log` Supabase table
   - Reply Thai: "บันทึกแล้ว: [defect summary]"
   - Send Telegram alert to Archi
2. **LINE OA conflict:** Current LINE webhook handles Seller Intake.
   - Solution: Add IF node — if text starts with `qc:` or has photo → QC flow, else → Seller flow
3. Add QC Dashboard tab: view defect_log by project, contractor, severity

### D3 — Renovation Intelligence (BU3)
**Goal:** Track Fix & Flip deals — purchase, renovation cost, sale price, ROI

**Steps:**
1. Create `reno_deals` table (see ARCHITECTURE_V2.md schema)
2. Add "Fix & Flip Tracker" to Dashboard (`/flipper` route)
   - Input: property address, purchase price, renovation cost items, target sale price
   - Auto-calculate: ROI%, days-to-sell, cost per sqm
3. Pull `area_memory` + `properties` to suggest which areas/properties to target
4. After 5+ records: train prompt for "best areas for Fix & Flip" based on real data

### D4 — Seller Intelligence Enhancement
**Goal:** Capture why sellers sell, motivation, price sensitivity

**Steps:**
1. Create `seller_profiles` table
2. Add seller intake fields to PropertyReview module: motivation dropdown, urgency score
3. n8n: after LINE Seller intake → Claude extract motivation signal from notes → write to seller_profiles

### D5 — Intelligence Loop Automation
**Goal:** Data from one BU automatically improves prompts for other BUs

**Steps:**
1. Weekly n8n job: aggregate area_memory + reno_deals + construction_records → Claude analysis
2. Output: updated `buyer_profiles` signal weights, content topic recommendations
3. AIContent.tsx: add "AI Recommendation" section — "Based on intelligence data, post about X this week"

---

**Phase D Estimate: 4–8 weeks (can be done incrementally)**

---

## Phase E — DevOps & Code Quality (2–3 days)

Eliminates 46 manual deploy scripts and adds safety nets.

### E1 — GitHub Actions CI/CD
Replace all `push-*.bat` scripts with:
```yaml
# .github/workflows/deploy.yml
name: Deploy
on:
  push:
    branches: [main]
jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Deploy to Vercel
        run: npx vercel --prod --token ${{ secrets.VERCEL_TOKEN }}
```
Railway: enable GitHub integration for auto-deploy on push.

### E2 — Rate Limiting
Add to Hub:
```js
const rateLimit = require("express-rate-limit");
app.use("/action/blog/run", rateLimit({ windowMs: 60000, max: 5 }));
app.use("/action/fb/publish", rateLimit({ windowMs: 60000, max: 10 }));
```

Add to Vercel `/api/chat` and `/api/image`:
```ts
// Simple in-memory rate limit per IP
```

### E3 — FB Token Expiry Monitoring
Add n8n workflow:
- Schedule: every Monday 09:00
- Check: call FB Graph API `/me?access_token=...` → if error or expiry < 14 days → Telegram alert
- Message: "⚠️ FB Token หมดอายุใน X วัน — รัน get-fb-page-token.bat"

### E4 — Hub TypeScript Migration (optional, high effort)
Convert `server.cjs` to TypeScript + ESM. Enable shared type definitions with frontend.  
**Estimate:** 1–2 days. Low priority but enables much better DX long-term.

---

## Summary Roadmap

| Phase | What | Duration | Priority |
|-------|------|---------|---------|
| **A** | Quick security fixes (CORS, RLS, routes) | 1 day | 🔴 Do now |
| **B** | Auth layer (Hub token + Dashboard login) | 2–3 days | 🔴 High |
| **C** | Hub state durability (Supabase) | 1 day | 🟠 High |
| **D1** | Construction Intelligence + Project Tracker | 1–2 weeks | 🟡 Phase 3 |
| **D2** | QC Line (finally build it) | 1 week | 🟡 Phase 3 |
| **D3** | Renovation Intelligence + Fix&Flip Tracker | 1–2 weeks | 🟡 Phase 3 |
| **D4** | Seller Intelligence enhancement | 3–5 days | 🟡 Phase 3 |
| **D5** | Auto-loop (intelligence feeds prompts) | 2–3 weeks | 🟢 Phase 4 |
| **E** | CI/CD + rate limiting + monitoring | 2–3 days | 🟡 Medium |

---

## Immediate Next Session Checklist

Before any code changes — confirm these first:

1. ✅ Read CLAUDE.md, HANDOFF.md, decisions.md (done this session)
2. Confirm `server.js` in backend-hub is unused (check Railway start command)
3. Confirm no component calls `/api/market-intel/submit` before deleting
4. Confirm Supabase service key is available before Phase C

**First PR to make:** Phase A1 + A2 + A6 — 3 one-liner changes, zero regression risk, deploy together.

---

*Implementation plan | AP-Home Platform OS | Jun 5, 2026 | No code changes made*
