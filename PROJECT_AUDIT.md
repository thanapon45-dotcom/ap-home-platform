# PROJECT_AUDIT.md — AP-Home Platform OS
*บจก.อาชิดา | Audit Date: Jun 5, 2026 | No code changes made*

---

## 1. Platform Overview

| Item | Value |
|------|-------|
| Company | บจก.อาชิดา (Achida Co., Ltd.) |
| Platform | AP-Home Platform OS |
| Marketing Brand | Finnhouses (marketing only — not the platform name) |
| Vision | AI-native Human-Centered Real Estate Intelligence Operating System |
| Audit Scope | Full codebase + infrastructure + intelligence layers + deployment |

---

## 2. Runtime Services Map

| Service | Host | URL | Tech |
|---------|------|-----|------|
| Dashboard (Frontend) | Vercel | ap-home-platform.vercel.app | Next.js 15, TypeScript |
| Backend Hub | Railway | ap-home-platform-production.up.railway.app | Node.js, Express, CommonJS |
| FB Backend | Railway | easygoing-friendship-production-e663.up.railway.app | Node.js, Express |
| n8n Primary | Railway | primary-production-8158a.up.railway.app | n8n v2.21.4 |
| n8n Worker | Railway | (internal) | n8n worker mode |
| Database | Supabase | omvpagvqyfmkkhzuuzda (ap-south-1) | PostgreSQL |
| Website | External hosting | finnhouses.com | WordPress + custom dark theme |

---

## 3. Module Status

| Module | Route | Status | Notes |
|--------|-------|--------|-------|
| OS Dashboard | /dashboard | ✅ Live | Supabase live counts, Market Intel tab, Property Review tab |
| CRM | /crm | ✅ Live | Kanban 4-stage, Supabase-backed |
| AI Content | /ai-content | ✅ Live | FB post gen, Image Engine v6, Blog Convert, Market Intel tab, 3T tone |
| Blog Runner | /marketing | ✅ Live | n8n pipeline → WordPress |
| Land Analyzer | /land-analyzer | ✅ Live | AI Vision land analysis |
| Budget Tool | /budget | ✅ Live | Lead capture → Supabase + Telegram |
| Property Review | /dashboard tab | ✅ Live | LINE seller intake → WP publish |
| Market Intel Page | /market-intel | ✅ Live | Standalone page + Telegram input |
| Properties | /properties | ✅ Live | Property listing view |
| QC Line | LINE OA | ✅ Live | QC ingestion and inspection flow backed by qc_inspections |
| Fix & Flip Module | /deals | ✅ Live | Native Renovate-to-Resell deal pipeline backed by reno_deals |

---

## 4. Vercel API Routes (server-side proxies)

| Route | Destination | Auth Guard |
|-------|-------------|-----------|
| POST /api/chat | Anthropic API | API key server-side ✅ |
| POST /api/image | Anthropic → OpenAI → Gemini | API keys server-side ✅ |
| POST /api/telegram | Telegram Bot API | Bot token server-side ✅ |
| POST /api/fb/publish | FB Backend Railway | None ❌ |
| POST /api/fb/queue/* | Hub Railway | None ❌ |
| POST /api/blog/* | Hub Railway | None ❌ |
| POST /api/market-intel | n8n webhook direct | None ❌ |
| POST /api/market-intel/submit | n8n webhook direct | None ❌ |
| POST /api/market-intel/insights | Supabase | Anon key ⚠️ |
| POST /api/property/* | Hub Railway | None ❌ |
| POST /api/fetch-blog | External HTTP fetch | None ❌ |

**Duplicate route found:** `/api/market-intel/route.ts` and `/api/market-intel/submit/route.ts` both forward to the same n8n webhook with slightly different body handling. Should be consolidated.

---

## 5. Hub Endpoints (Railway — 25 total, all unauthenticated)

- GET /health, GET /api/state
- POST /action/blog/run — triggers n8n blog pipeline
- POST /action/blog/queue/build, /run-next, /clear
- POST /action/fb/publish — posts to Facebook
- POST /action/fb/queue/build, /run-next, /clear
- POST /action/property/publish — pushes property to WordPress
- POST /action/property/upload-image — uploads image to WP media
- POST /action/property/dismiss
- POST /action/property/append-line-image
- POST /action/land-lead — saves land inquiry + Telegram
- POST /webhook/n8n, /webhook/fb, /webhook/image-done
- POST /webhook/blog-published, /webhook/property-saved
- POST /webhook/property-line-intake
- GET /api/properties/pending, /api/properties/wp-published

All 25 endpoints are open — no token, no IP allowlist, no auth middleware.

---

## 6. n8n Workflows

| File | Status | Notes |
|------|--------|-------|
| Finnhouses FULL PRO MASTER FLOW V3.2 FIXED.json | Active | Main blog + image pipeline |
| Finnhouses_WF1_Article_Publish.json | Active | Article publish to WordPress |
| Finnhouses_WF2_Image_Patch.json | Active | Vision rate limit fix applied Jun 2 |
| Finnhouses_LINE_Seller_Intake_v6.json | Active | LINE → Supabase property intake |
| FB_Market_Intelligence_v4_fixed.json | Active | Market intel collector (manual only) |
| wf_market_intelligence_collector.json | Active | Market intel data processor |
| wf_telegram_market_intel.json | Active | Telegram trigger for market intel |
| Finnhouses_V3.2_CALLBACK_FIXED.json | ⚠️ STALE | Old version — should be archived |
| Finnhouses_V3.2_HTTP_UPLOAD_FIXED.json | ⚠️ STALE | Old version — should be archived |
| Finnhouses_V3.2_SANITIZE_UPLOAD_FIXED.json | ⚠️ STALE | Old version — should be archived |

**n8n limitation:** v2.21.4 blocks `$env` in Code nodes even with `N8N_BLOCK_ENV_ACCESS_IN_NODE=false`. API keys must be hardcoded in workflow JSON — a known architectural constraint.

---

## 7. Database — Supabase Tables

| Table | Purpose | RLS | Policy |
|-------|---------|-----|--------|
| leads | CRM leads | Enabled | allow_all (open read/write) ⚠️ |
| properties | Seller intake | Unknown | Unknown |
| line_images | LINE photos (JSONB) | Unknown | Unknown |
| area_memory | Market intel by area | Unknown | Unknown |
| buyer_profiles | Buyer intelligence | Unknown | Unknown |
| buyer_context_signals | Buyer triggers | Unknown | Unknown |
| fb_sellers | FB market data | DISABLED ⚠️ | Open |
| fb_listings | FB market data | DISABLED ⚠️ | Open |
| fb_listing_history | FB market data | DISABLED ⚠️ | Open |

---

## 8. Technical Debt Register

### Critical
| ID | Debt | Risk |
|----|------|------|
| D1 | Hub CORS: `Access-Control-Allow-Origin: *` | Any origin can call all Hub endpoints |
| D2 | Zero auth on all Hub/Vercel proxy endpoints | Unauthenticated FB publish, queue ops, blog triggers |
| D3 | Hub state stored in `hub-state.json` on disk | Lost on every Railway redeploy — state not durable |
| D4 | RLS disabled on 3 Supabase tables | Market data open to public read/write |
| D5 | `leads` table policy is `allow_all` | Anyone with anon key can CRUD all CRM leads |

### High
| ID | Debt | Risk |
|----|------|------|
| D6 | 46 manual `push-*.bat` deploy scripts | No CI/CD — human error on every deploy |
| D7 | `server.js` + `server.cjs` both exist in backend-hub | Unclear which is canonical |
| D8 | Duplicate market-intel API routes | Inconsistent behaviour, maintenance confusion |
| D9 | n8n API keys hardcoded in workflow JSON | If workflow JSON exported/shared, keys leak |
| D10 | Zero test coverage | No unit, integration, or e2e tests |

### Medium
| ID | Debt | Risk |
|----|------|------|
| D11 | No rate limiting on any endpoint | AI cost runaway, DoS risk |
| D12 | `next.config.ts` `allowedOrigins: ["*"]` | Over-permissive server actions |
| D13 | Hardcoded n8n webhook URL in market-intel route | URL change requires code deploy |
| D14 | QC Line documented as active in memory — not built | Memory drift, incorrect status |
| D15 | 3 stale n8n workflow JSON files | Import confusion |
| D16 | FB token rotation is manual every ~60 days | Outage risk if missed |
| D17 | Hub is CommonJS, Frontend is TypeScript/ESM | Mixed module systems, no shared types |

---

## 9. Intelligence Layer Status

| Layer | Tables | Input Method | AI Analysis | Feeds Back | Status |
|-------|--------|-------------|-------------|-----------|--------|
| Market Intelligence | area_memory | Telegram + Manual | n8n Claude | Content prompts | 🟡 Partial |
| Property Intelligence | properties, line_images | LINE Seller Intake | Manual review | Fix&Flip | 🟡 Partial |
| Buyer Intelligence | buyer_profiles, buyer_context_signals | Manual + CRM | BRAND_FACTS | Content prompts | 🟡 Started |
| Seller Intelligence | properties | LINE Seller Intake | None | Brokerage | 🟡 Partial |
| Construction Intelligence | — | — | — | — | ❌ Missing |
| Renovation Intelligence | — | — | — | — | ❌ Missing |
| Quality Intelligence | — | — | — | — | ❌ Missing |

**Loop closure:** 4 of 7 layers partially active. Loop does NOT close — no data flows from Construction/QC back to platform. BU3 and BU4 produce zero intelligence data.

---

## 10. Business Unit Platform Coverage

| BU | Modules | Data Layer | Intel Produced | Loop Connected |
|----|---------|-----------|----------------|---------------|
| BU1 รับสร้างบ้าน | Budget Tool, AI Content | leads only | None | ❌ |
| BU2 รับฝากขาย | CRM, Property Review | properties, leads | Property + Buyer + Seller (partial) | 🟡 |
| BU3 รีโนเวทเพื่อขาย | None | None | None | ❌ |
| BU4 ที่ปรึกษา/QC | None | None | None | ❌ |

---

## 11. Token & Credential Expiry

| Credential | Stored At | Expires | Action |
|-----------|----------|---------|--------|
| FB_PAGE_ACCESS_TOKEN | Railway easygoing-friendship | ~Aug 2, 2026 | Run get-fb-page-token.bat |
| ANTHROPIC_API_KEY | Vercel env + D:\\.keys\\.env.local | No expiry | Monitor usage |
| OPENAI_API_KEY | Vercel env | No expiry | Monitor usage (gpt-image-1 cost) |
| GEMINI_API_KEY | Vercel env | No expiry | Fallback only |
| SUPABASE_ANON_KEY | Vercel + Railway Hub + .env.local | No expiry | Rotate manually if needed |
| WP_APP_PASS | Railway Hub | No expiry | WordPress Application Password |

---

## 12. WordPress & SEO Status

| Item | Status |
|------|--------|
| Theme | Custom dark luxury (finnhouses-theme) — float-based layout |
| Ahrefs Health Score | 22% (was 13%) — target 80%+ |
| Broken internal links | 66 identified — .htaccess fix pending |
| SEO plugin | ❌ Not installed (Yoast/RankMath pending) |
| Contact page (slug: contact) | ❌ Not created |
| /lamlukkha landing page | ❌ Not created |
| .htaccess redirect rules | ❌ Not uploaded (wrong folder previously) |
| Image compression (Smush) | ❌ Not installed |
| Live blog articles | 5 articles (Jun 2026) |
| Organic keyword rankings | ~0 currently |

---

## 13. Deployment Process

Current process: manual `push-*.bat` scripts (46 total).  
No CI/CD pipeline. No staging environment. No rollback mechanism beyond git revert.  
Every deploy is a direct push to production.

WordPress deploys via cPanel File Manager only — no FTP, SSH, or WP CLI access.  
PHP OPcache means changes may take up to 5 minutes to appear after upload.

---

*Audit by Claude | AP-Home Platform OS | Jun 5, 2026 | Read-only — no code changes made*
