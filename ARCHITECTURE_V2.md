# ARCHITECTURE_V2.md — AP-Home Platform OS
*บจก.อาชิดา | Version 2.0 | Jun 5, 2026*

---

## Vision

**AI-native Human-Centered Real Estate Intelligence Operating System**

AP-Home Platform OS is the central nervous system of บจก.อาชิดา. It serves 4 Business Units, collects data across 7 Intelligence Layers, and closes the loop so each BU benefits from every other BU's data.

Finnhouses is the **marketing brand** — the platform is brand-agnostic infrastructure.

---

## Current Architecture (V1 — As-Built)

```
Browser (Dashboard)
    │
    ├── POST /api/chat ──────────────────────────────→ Anthropic API
    ├── POST /api/image ─────────────────────────────→ OpenAI / Gemini
    ├── POST /api/fb/* ──────────────────────────────→ Railway FB Backend
    │                                                      │
    │                                                      └──→ Facebook Graph API
    ├── POST /api/blog/* ────────────────────────────→ Railway Hub
    │                                                      │
    │                                                      └──→ n8n → WordPress
    ├── POST /api/market-intel/* ───────────────────→ n8n (direct — bypasses Hub)
    ├── POST /api/property/* ───────────────────────→ Railway Hub → WordPress
    └── Supabase JS Client (NEXT_PUBLIC) ──────────→ Supabase (direct from browser)

External inputs:
    LINE OA ──────────────────────────────────────→ n8n LINE Seller Intake → Supabase
    Telegram ─────────────────────────────────────→ n8n Market Intel → Supabase

n8n Schedule (09:05 daily):
    → POST ap-home-platform.vercel.app/api/fb/queue/run-next
    → POST primary-production-8158a.up.railway.app/webhook/blog-run (direct)
```

### V1 Problems

| Problem | Impact |
|---------|--------|
| Hub state in filesystem (hub-state.json) | Lost on every Railway redeploy |
| No auth on Hub or proxy routes | Any caller can trigger publishing |
| Hub wildcard CORS | Callable from any website |
| market-intel bypasses Hub | Inconsistent routing pattern |
| 46 manual deploy scripts | No CI/CD, error-prone |
| Mixed module systems (CJS + ESM) | No shared types between frontend and backend |
| 3 of 7 intelligence layers missing | Loop does not close |

---

## Target Architecture (V2)

### Design Principles

1. **Hub is the single entry point for all business operations.** Browser never calls Railway directly. Hub is the only service that calls n8n, WordPress, or FB Backend.
2. **Vercel API routes are thin authenticated proxies.** They validate the caller, then forward to Hub with a shared secret.
3. **All state lives in Supabase.** No filesystem state. Hub is stateless — can restart/redeploy without data loss.
4. **Intelligence Loop closes.** Every BU produces structured data that feeds other BUs automatically.
5. **Auth gates everything.** Dashboard requires login. All API routes validate session or shared secret.

### V2 System Diagram

```
                        ┌─────────────────────────────────┐
                        │        Browser (Dashboard)       │
                        │   Next.js 15 — Vercel           │
                        │   Auth: NextAuth session         │
                        └───────────────┬─────────────────┘
                                        │ HTTPS (all routes auth-gated)
                        ┌───────────────▼─────────────────┐
                        │      Vercel API Routes          │
                        │   Thin proxies — validate       │
                        │   session → add X-Hub-Token     │
                        └───────────────┬─────────────────┘
                                        │ X-Hub-Token header
                        ┌───────────────▼─────────────────┐
                        │        Backend Hub               │
                        │   Railway — Express + TypeScript │
                        │   Auth: validates X-Hub-Token   │
                        │   State: Supabase (not file)    │
                        └──┬──────────┬──────────┬────────┘
                           │          │          │
              ┌────────────▼──┐  ┌────▼────┐  ┌─▼──────────────┐
              │   n8n         │  │   FB    │  │   Supabase      │
              │ Railway       │  │ Backend │  │ PostgreSQL      │
              │ Workflows     │  │ Railway │  │ 7 Intel Tables  │
              └────────┬──────┘  └────┬────┘  └────────────────┘
                       │              │
              ┌────────▼──────┐  ┌────▼──────────────┐
              │  WordPress    │  │  Facebook Graph   │
              │  finnhouses   │  │  API              │
              │  .com         │  └───────────────────┘
              └───────────────┘

External inputs (unchanged):
    LINE OA ─────────────────→ n8n LINE Seller Intake → Supabase → Hub webhook
    Telegram ────────────────→ n8n Market Intel → Supabase
    AI Schedule (09:05) ────→ Hub /action/schedule/run (not direct n8n)
```

---

## V2 Service Responsibilities

### Dashboard (Vercel / Next.js)
- UI only — no business logic
- Auth gate (NextAuth or password session)
- All API calls go to `/api/*` routes (never directly to Railway)
- Supabase reads for display (leads, properties, intel tables) — read-only from browser

### Vercel API Routes
- Validate session/auth before forwarding
- Add `X-Hub-Token: HUB_SECRET` header on every Hub call
- No business logic — thin proxy only
- Exception: `/api/chat`, `/api/image` — call AI APIs directly (no Hub needed)

### Backend Hub (Railway)
- **Single orchestrator** for all business operations
- Validates `X-Hub-Token` on every request
- Owns all queue state → writes to Supabase `hub_queue` table
- Calls n8n, FB Backend, WordPress with proper auth
- Sends Telegram alerts for all significant events
- No filesystem state — fully stateless (restart-safe)

### FB Backend (Railway)
- Single responsibility: publish to Facebook Graph API
- Validates `X-Hub-Token` from Hub
- Returns structured result to Hub

### n8n (Railway)
- Automation workflows only — no direct calls from Dashboard
- Receives webhooks from Hub only (not from Vercel)
- Writes results back to Hub via webhook callbacks

### Supabase (PostgreSQL)
- Single source of truth for all persistent data
- All 7 intelligence tables live here
- RLS enabled and properly scoped on every table
- Hub uses service key (server-side). Browser uses anon key (read-only scoped).

---

## V2 Intelligence Layer Architecture

```
BU2 Brokerage ──→ leads table ──────────────────────────→ Buyer Intelligence
                   properties table ─────────────────────→ Property Intelligence
                   area_memory (from market intel) ───────→ Market Intelligence
                   seller_profiles (new) ────────────────→ Seller Intelligence
                                    │
                                    ▼
                            AP-Home Platform OS
                            (Intelligence Engine)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
            Content prompts    BU3 decisions    BU4 checklist
            (AI Content gen)   (Fix&Flip score) (QC standards)
                    │               │               │
BU1 Construction ←──┘   BU3 Reno ←─┘   BU4 QC ←───┘
    │                       │                │
    ▼                       ▼                ▼
construction_records    reno_deals       defect_log
(new table)             (new table)      (new table)
    │                       │                │
    └───────────────────────┴────────────────┘
                            │
                    Construction Intel
                    Renovation Intel
                    Quality Intel
                    (close the loop)
```

---

## V2 Database Schema (Target)

### Existing Tables (keep, fix RLS)
- `leads` — CRM, fix RLS to authenticated only
- `properties` — Seller intake, enable RLS
- `line_images` — JSONB, enable RLS
- `area_memory` — Market intel per area
- `buyer_profiles` — Buyer intelligence
- `buyer_context_signals` — Triggers and signals
- `fb_sellers`, `fb_listings`, `fb_listing_history` — Re-enable RLS

### New Tables (Phase 3+)
```sql
-- Hub operational state (replaces hub-state.json)
CREATE TABLE hub_state (
  key TEXT PRIMARY KEY,
  value JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Hub queue (replaces in-memory queue)
CREATE TABLE hub_queue (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  queue_type TEXT NOT NULL, -- 'fb' | 'blog'
  items JSONB DEFAULT '[]',
  current_index INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Construction records (BU1 intelligence)
CREATE TABLE construction_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_name TEXT,
  location TEXT,
  budget_estimated NUMERIC,
  budget_actual NUMERIC,
  timeline_days_estimated INTEGER,
  timeline_days_actual INTEGER,
  contractor_id UUID,
  style TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Renovation deals (BU3 intelligence)
CREATE TABLE reno_deals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  property_address TEXT,
  purchase_price NUMERIC,
  reno_cost NUMERIC,
  sale_price NUMERIC,
  roi_pct NUMERIC,
  area TEXT,
  reno_type TEXT[],
  days_to_sell INTEGER,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- QC defect log (BU4 intelligence)
CREATE TABLE defect_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_name TEXT,
  defect_type TEXT,
  severity TEXT, -- 'critical' | 'major' | 'minor'
  location TEXT,
  project_ref UUID REFERENCES construction_records(id),
  resolved BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seller profiles (Seller intelligence)
CREATE TABLE seller_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT,
  contact TEXT,
  motivation TEXT, -- 'urgent_cash' | 'relocation' | 'investment_exit' etc.
  price_sensitivity TEXT,
  area TEXT,
  property_id UUID REFERENCES properties(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

---

## V2 Deployment Architecture

### Target: GitHub Actions CI/CD (replace 46 .bat scripts)

```yaml
# .github/workflows/deploy.yml
on:
  push:
    branches: [main]
jobs:
  deploy-vercel:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: npx vercel --prod --token $VERCEL_TOKEN
  deploy-hub:
    runs-on: ubuntu-latest
    steps:
      - run: railway up --service backend-hub
  deploy-fb-backend:
    runs-on: ubuntu-latest
    steps:
      - run: railway up --service fb-backend
```

### Module System Unification
Hub should migrate from CommonJS to ESM TypeScript — enables shared type definitions between frontend and backend.

```
packages/
  shared-types/    -- TypeScript interfaces shared by frontend + backend
    Lead.ts
    Property.ts
    HubState.ts
    IntelRecord.ts
```

---

## V2 Migration Sequence

| Step | Change | Risk | Effort |
|------|--------|------|--------|
| 1 | Fix Hub CORS `*` → specific origin | Zero | 5 min |
| 2 | Fix next.config allowedOrigins | Zero | 5 min |
| 3 | Fix RLS on all Supabase tables | Low | 30 min |
| 4 | Add X-Hub-Token auth to Hub + FB Backend | Medium | 2 hrs |
| 5 | Add session auth to Dashboard | High | 4–8 hrs |
| 6 | Move hub-state.json → Supabase hub_state | Medium | 4 hrs |
| 7 | Consolidate market-intel routes | Low | 30 min |
| 8 | Remove server.js (keep server.cjs) | Low | 10 min |
| 9 | Archive 3 stale n8n workflows | Zero | 5 min |
| 10 | GitHub Actions CI/CD (replace .bat scripts) | Medium | 4 hrs |
| 11 | Hub TypeScript migration | High | 8–16 hrs |
| 12 | Create hub_queue + construction_records + reno_deals + defect_log tables | Low | 2 hrs |

---

*Architecture document | AP-Home Platform OS | Jun 5, 2026 | No code changes made*
