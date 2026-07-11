# AP-Home Platform — Claude Reference

อ่านก่อนทุก session ใหม่ อย่า assume ว่า system ทำงานอย่างไร — ดูที่นี่เท่านั้น

---

## ⚠️ Jul 1, 2026 — REVERTED กลับ Hub v1 (ตารางด้านล่างเก่า — ดู memory/Handoff/HANDOFF.md session 18)

Hub v2 cutover ถูก revert แล้วเพราะ `/api/fb/queue/*` และ `/api/blog/queue/*` **ไม่มี implement จริงบน Hub v2 เลย**
**ตอนนี้ระบบใช้ Hub v1 (`server.cjs`) เป็นหลัก** — `HUB_URL` ชี้กลับไป Hub v1 แล้ว, header คือ `x-hub-token` (ไม่ใช่ `x-hub-secret`), path ใช้ `/action/...` (ไม่ใช่ `/api/blog/queue/...`)

## Platform URLs (confirmed working)

| Service | URL | Notes |
|---|---|---|
| Hub v1 (LIVE — ใช้งานจริงตอนนี้) | `https://ap-home-platform-production.up.railway.app` | Railway — HUB_URL ชี้ที่นี่หลัง revert Jul 1 |
| Hub v2 (shadow, ยังไม่ครบ) | `https://exciting-creativity-production-4b85.up.railway.app` | ห้าม cutover จนกว่า fb/blog queue routes จะ implement ครบ |
| Dashboard | `https://ap-home-platform.vercel.app` | Vercel / Next.js |
| n8n | `https://primary-production-8158a.up.railway.app` | Railway |

**HUB_URL ใน Vercel env var** = `https://ap-home-platform-production.up.railway.app` (Hub v1, ไม่มี `/api` ต่อท้าย)

---

## Hub v1 Endpoints (ที่ใช้งานจริงตอนนี้ — server.cjs)

### Public (ไม่ต้องการ auth)
- `GET /health` — Railway healthcheck
- `POST /webhook/n8n?token=<hmac>` — WF1 callback หลัง publish (HMAC-SHA256)
- `POST /api/qc/webhook/line` — LINE signature

### Protected (`x-hub-token` header — ไม่ใช่ `x-hub-secret`)
- `GET /api/state` — ดู state ทั้งหมด (⚠️ ไม่ใช่ `/api/health/state` — path นั้น 404, เอกสารเก่าเขียนผิด แก้ session 19 Jul 2)
- `POST /action/blog/queue/run-next` — pop item ถัดไปจาก content_queue มารัน (คืน `{ok:true,skipped:true}` เงียบๆถ้า queue ว่าง — ไม่ error)
- `POST /action/blog/queue/build` — สร้าง/แทนที่ queue ทั้งหมด (body: `{items:[{date,slot,keyword,category,visual_hint}]}`)
- `POST /action/blog/queue/clear` — ล้าง queue
- `POST /action/fb/queue/{build,clear,run-next}` — เหมือนกันแต่สำหรับ FB queue
- `POST /webhook/image-done` — WF2 image callback
- `POST /api/qc/feedback` — บันทึกว่า inspector ยืนยันว่า AI ตรวจ QC ถูกหรือผิด (`{line_message_id, feedback: "correct"|"incorrect"}`) → เขียนลง `qc_inspections.human_feedback` + `human_feedback_at` (เพิ่ม session 19d, Jul 2)

### Hub v2 Endpoints (ยังไม่ live — ห้ามใช้จนกว่าจะ cutover)
เดิมตั้งใจให้ `/api/blog/queue/*` + `x-hub-secret`, แต่ยัง**ไม่มี route จริง**บน Hub v2 — ดู decisions.md "Hub v2 Migration + Git Hygiene"

---

## n8n Workflows

| Workflow | Trigger | Hub endpoint ที่ใช้ | ไฟล์ล่าสุด |
|---|---|---|---|
| Queue Auto-run | Schedule (ทุกวัน 09:00) | Vercel proxy → Hub v1 `/action/blog/queue/run-next` + `/action/fb/queue/run-next` | `Queue Auto-run (4).json` |
| WF1 — Article + Publish | Webhook จาก Hub v1 | Callback → Hub v1 `/webhook/n8n?token=` | `WF1 (8_wb_fix).json` |
| WF2 — Image + Patch | Webhook จาก WF1 | Callback → Hub v1 `/webhook/image-done` | `WF2 (5_hub_v2).json` ✅ |
| Wake-up | Schedule (ทุกวัน 09:02) | Hub v1 `/api/state` | `Wake-up workflow.json` |
| QC Line | Webhook จาก LINE OA (`/webhook/qc-line`) | Hub v1 `/api/qc/ingest` + `/api/qc/feedback` (ใหม่ session 19d) | `wf_qc_line (2).json` — **ตัวที่ active จริงตอนนี้คือ workflow ชื่อ "wf_qc_line 2" ใน n8n** (import แล้วสลับ active มาจากตัวเก่า Jul 2) ตัวเก่า `wf_qc_line` ปิดไว้เป็น backup เท่านั้น |
| Market Intelligence Collector v2 (ADR-005) | Webhook `market-intel/fb` + `market-intel/manual` (path เดิม ไม่เปลี่ยน) | Claude Haiku ผ่าน Dashboard `/api/chat` → native Supabase node เขียน `market_insights`/`buyer_context_signals`/`content_frames` → Telegram | `Finnhouses — Market Intelligence Collector v2 (ADR-005).json` — **live ตั้งแต่ Jul 8** (ID `lrLOjW4GPd5atYhz`) แทนที่ `v1(2)` (ID `F3i4dQMubgbm21d6`, unpublished เก็บไว้ rollback) — `maxTokens:3000` (เพิ่มจาก 1600 หลังเจอ truncation บน production จริง ดู Known Bugs #8) — ดู `docs/decisions.md` ADR-005 |

**Header ที่ใช้จริงตอนนี้ (Hub v1)**: `x-hub-token` — ⚠️ ไม่ใช่ `x-hub-secret` (นั่นคือ convention ของ Hub v2 ที่ revert ไปแล้ว)

---

## Environment Variables

### Vercel (Dashboard) — ⚠️ แก้แล้ว session 19 (ตารางนี้เคยเขียนผิดชี้ Hub v2 ค้างมาหลาย session)
- `HUB_URL` = `https://ap-home-platform-production.up.railway.app` (Hub v1, ไม่มี `/api`)
- `HUB_SECRET` = ตรงกับ `x-hub-token` ที่ Hub v1 ใช้ตรวจสอบ (ดู Smoke Test Commands ด้านล่างสำหรับค่าที่ใช้ตอนนี้)

### Railway (Hub v2 — shadow, ยังไม่ได้ใช้งานจริง)
- `HUB_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `N8N_WEBHOOK_BASE_URL`, `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`

---

## Hub v2 — สถานะจริง (audit session 19b, Jul 2)

Hub v2 backend สร้างไปไกลกว่าที่คิด — module ส่วนใหญ่มีจริงแล้ว (AiGateway multi-provider, BlogUseCase ครบ queue build/clear/run-next, QcUseCase, HealthMonitor, StateManager, EventBus) **จุดเดียวที่ขาดจริงและเป็นสาเหตุที่ revert Jul 1**: `fbRoutes.ts` มีแค่ `/api/fb/publish` + `/api/fb/state` — **ไม่มี** `/api/fb/queue/{build,clear,run-next}` เลย (blog มีครบ, fb ไม่มี — งานที่เหลือคือก็อปแพทเทิร์นเดียวกับ blog มาใช้กับ fb ไม่ใช่งานสร้างใหม่ทั้งหมด) ดู decisions.md / issues-log.md session 19b

---

## Known Bugs & Gotchas

### 1. Sandbox git add ตัดไฟล์ (CRITICAL)
**ปัญหา**: `git add` ใน Claude sandbox อาจ stage ไฟล์ที่ truncated เพราะ mount cache lag  
**อาการ**: commit มี deletions มากผิดปกติ, TypeScript build error หลัง deploy  
**แก้**: **ให้ user รัน `git add` + `git commit` + `git push` จาก PowerShell Windows เท่านั้น**  
Claude ทำได้แค่ edit ไฟล์ผ่าน Edit/Write tool

### 2. Vercel env var baking
**ปัญหา**: อัปเดต env var ใน Vercel แล้ว trigger redeploy ก่อน save → bake ค่าเก่า  
**แก้**: save env var → ยืนยันใน Vercel UI → แล้วค่อย redeploy

### 3. git HEAD.lock / index.lock
**อาการ**: `fatal: Unable to create '.git/HEAD.lock'`  
**แก้**:
```powershell
Remove-Item ".git\HEAD.lock" -Force
Remove-Item ".git\index.lock" -Force
```

### 4. PowerShell && operator
**ปัญหา**: PowerShell รุ่นเก่าไม่รู้จัก `&&`  
**แก้**: รันแยก หรือใช้ `;`

### 5. Emoji ใน TypeScript template literal
**ปัญหา**: emoji บางตัว (เช่น 🖼️) อาจ corrupt ผ่าน mount encoding  
**แก้**: ใช้ plain text แทน emoji ใน server.ts

### 6. Railway ไม่ auto-deploy
**ปัญหา**: บางครั้ง Railway ไม่ auto-deploy หลัง git push  
**แก้**: เปิด Railway dashboard → Redeploy ด้วยตนเอง

### 7. n8n Code node sandbox ไม่มี `URLSearchParams` global (พบ session 19d)
**ปัญหา**: Code node ที่เขียน `new URLSearchParams(str)` จะพัง `ReferenceError: URLSearchParams is not defined`
**สาเหตุ**: n8n รัน Code node ผ่าน task-runner แบบ sandboxed VM ที่ไม่ expose Node.js global ทุกตัว (ต่างจาก Node.js ปกติ)
**แก้**: parse query string เองด้วย `.split('&')` + `.split('=')` แทน ห้ามพึ่ง `URLSearchParams`/`fetch` ตัวเต็มของ browser หรือ Node global ที่ไม่ชัวร์ว่ามีจริงใน sandbox — ใช้ `require('https')` แบบที่ node อื่นๆ ใน repo นี้ทำอยู่แล้วได้ปกติ (นั่นคือ Node built-in module ไม่ใช่ browser/global API)

### 8. Claude Haiku maxTokens truncation บนโพสต์ยาว/ละเอียด (พบ session 22, Jul 8)
**ปัญหา**: Market Intel Parse node ตั้ง `maxTokens` ต่ำเกินไปสำหรับโพสต์จริงที่มีรายละเอียดเยอะ (ของแถม/ขนาด/โปรโมชัน) → Claude Haiku ตอบยาวจน JSON ถูกตัดกลางคำ → `JSON.parse` fail
**อาการ**: Telegram error "Expected ',' or '}' after property value in JSON at position ..." — เช็ค field `raw_model_text_debug` เพื่อยืนยันว่าเป็น truncation จริง (ข้อความคำสุดท้ายขาดกลางคำ) ไม่ใช่ bug ประเภทอื่น
**แก้**: เพิ่ม `maxTokens` ให้มี headroom กว้างกว่าที่ mocked test บ่งชี้ไว้มาก (ปรับจาก 1600 → 3000 ในรอบนี้) — ห้ามตั้งจากผลทดสอบสั้นๆอย่างเดียว เพราะ organic production traffic มีโพสต์ยาว/ซับซ้อนกว่าที่คาดเสมอ
**ดู**: `docs/issues-log.md` ISSUE-010

### 9. `.bat` deploy script — multi-line commit message พังเงียบ (พบ session 23, Jul 10)
**ปัญหา**: `.bat` ที่มี `git commit -m "บรรทัดแรก\n\n- บรรทัดขึ้นต้นด้วย -\n..."` (multi-line, มี `-` นำหน้า) → cmd.exe แยกแต่ละบรรทัดเป็นคำสั่งใหม่ → error `'-' is not recognized as an internal or external command` ซ้ำหลายครั้ง แต่ `git push` ท้าย script ยัง exit 0 (เพราะรันแยกจาก commit ที่ fail) → เห็นแค่ "Done" ที่ท้าย console ทำให้เข้าใจผิดว่าสำเร็จ ทั้งที่จริงไม่มีอะไรถูก push เลย (เจอพร้อมกับ `.git/index.lock` ค้าง — Known Bug #3 — ยิ่งบังปัญหาให้ดูเหมือนเป็นแค่ lock issue)
**วิธีตรวจพบ**: เช็ค Vercel `list_deployments` ตรงๆ เทียบ commit message ล่าสุดที่ deploy จริง กับ commit ที่ตั้งใจ push — อย่าเชื่อแค่ output "Done" ท้าย `.bat`
**แก้**: `.bat` ทุกไฟล์ที่ deploy ต้อง (1) `git commit -m "..."` เป็น **บรรทัดเดียวเท่านั้น** ห้าม multi-line ห้ามมีบรรทัดขึ้นต้นด้วย `-` (2) เพิ่ม `if exist ".git\index.lock" del /f ".git\index.lock"` ไว้ต้น script เสมอกันปัญหา lock ค้างจากรอบก่อน
**ป้องกัน**: หลัง user รัน `.bat` push แล้ว ให้ขอดู console output เต็มเสมอ (ไม่ใช่แค่ถามว่า "เสร็จหรือยัง") เพื่อเช็ค error message ที่อาจซ่อนอยู่ก่อนบรรทัด "Done"

### 10. ListingTab "Post to Facebook" คืน HTTP 500 — OPEN, ยังไม่แก้ (พบ session 23, Jul 10-11)
**ปัญหา**: กด "Post to Facebook" ใน AI Content → ListingTab → ได้ "❌ ผิดพลาด" (500) — เกิดซ้ำแม้เปลี่ยน `FB_PAGE_ACCESS_TOKEN` เป็น long-lived token ใหม่แล้ว (ผ่าน Graph API Explorer → extend → derived Page token จาก `/me/accounts`) และ redeploy Railway แล้ว
**ตัดสาเหตุออกแล้ว**: ไม่ใช่ STUB mode (`/health` ยืนยัน `fb_configured:true`), ไม่ใช่ token เก่าหมดอายุ (เปลี่ยนใหม่แล้วยังพัง)
**Root cause**: ยังไม่ทราบ — ยังไม่มี error body จริงจาก Facebook Graph API เพราะ Vercel `get_runtime_logs` เห็นแค่ status code, sandbox curl ยิง Railway ตรงไม่ได้ (network allowlist บล็อก), user ส่ง Console tab มาแทน Network tab (ไม่มี error body)
**ขั้นต่อไป**: ต้องขอ user เปิด DevTools → **Network tab** (ไม่ใช่ Console) → กด Post to Facebook → คลิกแถว `publish` (500) → แท็บ Response/Preview → เอา JSON error message เต็มมาก่อนถึงจะวินิจฉัยได้ ห้ามเดา fix
**ดู**: `docs/issues-log.md` ISSUE-011, `docs/HANDOFF.md` session 23

---

## Security Constraints (ห้ามละเมิด)

- ห้าม call Railway URL โดยตรงจาก client-side / Next.js browser code
- ห้าม store secrets ใน code — ใช้ env vars เท่านั้น
- n8n Webhook v2.1: ใช้ `$input.first().json.body || $input.first().json` เสมอ
- ห้าม revert fetch() ใน Code node
- Architectural decisions → ต้อง document และถามก่อน implement

---

## Hub v2 File Structure

```
services/backend-hub/src/
  core/application/ports/
    IStateRepository.ts     ← HubStateData type (รวม image fields)
    INotifier.ts
  modules/state/
    StateManager.ts         ← setBlogRunning/Completed/Failed/Idle, setImageDone, queue helpers
  infrastructure/
    supabase/SupabaseClient.ts
    supabase/SupabaseStateRepository.ts
    telegram/TelegramNotifier.ts
  presentation/
    middleware/auth.ts      ← requireHubSecret (checks x-hub-secret header)
    routes/blogRoutes.ts
    routes/stateRoutes.ts
  server.ts                 ← main entry, all webhook routes
```

---

## Smoke Test Commands

```powershell
# Health check (Hub v1 — live)
Invoke-RestMethod -Uri "https://ap-home-platform-production.up.railway.app/health"

# Full state (queue, blog status, fb status)
Invoke-RestMethod -Uri "https://ap-home-platform-production.up.railway.app/api/state" -Headers @{"x-hub-token"="b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c"}

# Queue run-next (direct — ตอบ {ok:true,skipped:true} เงียบๆถ้า queue ว่าง อย่าเข้าใจผิดว่า error)
Invoke-RestMethod -Method POST -Uri "https://ap-home-platform-production.up.railway.app/action/blog/queue/run-next" -Headers @{"x-hub-token"="b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c"; "Content-Type"="application/json"} -Body '{}'

# ⚠️ ถ้า body มีภาษาไทย ต้อง GetBytes() เสมอ ไม่งั้นเพี้ยนเป็น ????? (ดู issues-log session 19)
# $bytes = [System.Text.Encoding]::UTF8.GetBytes($jsonBody)
# Invoke-RestMethod ... -Body $bytes -ContentType "application/json; charset=utf-8"
```

---

## Pending Tasks

### Critical
- [x] QC LINE end-to-end test → **PASS Jul 2 (session 19b)** — ส่งรูปจริง 4 เคสจาก LINE OA, reply ภาษาไทยครบภายใน ≤15s, AI ใช้เกณฑ์ "cover block" จากรูปอ้างอิงใหม่ถูกต้อง (ดู qc_standards เพิ่ม 10 รูป/7 หมวด)
- [x] QC feedback loop (ปุ่ม "✅ ตรง / ❌ ไม่ตรง") → **DONE + tested Jul 2 (session 19d)** — เพิ่ม `human_feedback`/`human_feedback_at` ใน `qc_inspections`, endpoint `POST /api/qc/feedback`, n8n `wf_qc_line (2)` เพิ่ม Quick Reply + postback branch — สลับ active workflow แล้ว, user ทดสอบกดปุ่มผ่านจริง (แก้บั๊ก URLSearchParams ระหว่างทาง ดู Known Bugs #7) — **ยังไม่มี dashboard/query ดูสถิติ % ถูก/ผิดสะสม** เก็บแค่ raw data ในคอลัมน์ ต้องมาทำรายงานทีหลัง
- [ ] Verify FB token expiry (tokens.md มีข้อมูลขัดแย้ง: Jun 26 vs Aug 2) — health check ล่าสุด (Jul 2) บอก "เหลือ 30 วัน" ยังไม่ reconcile กับ tokens.md
- [ ] Import/verify WF1 v8 ACTIVE ใน n8n
- [ ] เอาเกณฑ์ตัวเลขจริงจาก `Check list/02 QC List Revise02 2018.xlsx` + `inspect โครงสร้าง.pdf` (`D:\Finnhouses brand\`) ไปเสริม `QC_SYSTEM_PROMPT` ใน server.cjs — สกัดไว้บางส่วนแล้ว (ดู decisions.md, issues-log.md session 19b) ยังไม่ได้ใส่จริง
- [ ] เช็ค Health Check "Blog Queue ว่าง" (พบ Jul 2) ทั้งที่เพิ่งเติม 7 รายการ (3-9 ก.ค.) — ยังไม่ verify ว่าเป็นปัญหาจริงหรือ timing เฉยๆ
- [ ] เพิ่มรูปอ้างอิง qc_standards หมวด structure, cleanliness — ยังไม่มีรูปเลยทั้งคู่ (structure พอมี PDF checklist ช่วยได้)

### Security
- [x] Enable RLS: sites, line_users, qc_inspections, qc_defects, qc_standards, qc_daily_usage → **DONE 2026-07-11 (session 23)** — verified via Supabase advisor before/after, zero impact on Hub (uses service_role, bypasses RLS)
- [x] REVOKE anon from `append_line_image_atomic` → **DONE 2026-07-11** — REVOKE per-role ไม่พอ ต้อง `REVOKE ... FROM PUBLIC` ด้วย (Postgres grants EXECUTE to PUBLIC by default) แก้แล้ว + verified ผ่าน `has_function_privilege`
- [x] DROP `hub_state` anon_update policy → **DONE 2026-07-11** — พร้อม anon_insert ด้วย (hub_state เขียนโดย Hub service_role เท่านั้น ยืนยันจาก `updated_at` ที่ยังขยับวันนี้แม้ตัด anon แล้ว)
- [x] **เพิ่มเติมนอกแผนเดิม (พบระหว่างแก้)**: ลบ `USING (true)`/`WITH CHECK (true)` policy ที่เปิดโล่งบน area_memory, buyer_context_signals, buyer_profiles, content_frames, market_insights, content_posts, properties + ปิด 4 ตารางที่ตายแล้ว (fb_listings, fb_sellers, fb_listing_history, agent_reports — ไม่มีการเขียนมา 30+ วัน) + fix `qc_inspections_view` SECURITY DEFINER → security_invoker + pin search_path 2 ฟังก์ชัน — ดู issues-log.md ISSUE-013
- [ ] **ใหม่ — ยังไม่แก้**: `leads` (CRM) และ `projects` (Land Analyzer) ยังเปิดให้ `anon` CRUD เต็มที่ผ่าน browser (`lib/supabase.ts` ใช้ `NEXT_PUBLIC_SUPABASE_ANON_KEY` ตรง) เพราะ**แพลตฟอร์มนี้ไม่มีระบบ login เลย** — ล็อกให้ปลอดภัยจริงต้องออกแบบ auth ก่อน (Supabase Auth + หน้า login) ไม่ใช่แค่แก้ policy เฉยๆ ไม่งั้น CRM/Land Analyzer จะพังทันที ต้องคุย scope กับ user ก่อนเริ่ม
- [x] `market_listings` anon insert — เช็คแล้วว่าเป็นของจริง (`scripts/scrape-market.js` ใช้ anon key ตรง, INSERT-only อยู่แล้ว) ไม่ต้องแก้

### Hub v2 Remaining
- [ ] TASK-303 CacheManager
- [ ] TASK-304 HistoryManager
- [ ] TASK-313 Property Use Cases
- [ ] Cutover TASK-601/602/603

### Market Intel v2 (ADR-005) — เพิ่ง live
- [x] Stage 1 dry run → PASS (session 22, Jul 8) — 3 บั๊กพบ+แก้ (native Supabase node, category whitelist, confidence clamp)
- [x] Stage 2 production cutover → DONE (session 22, Jul 8) — v2 live, 15/15 smoke test PASS
- [x] Same-day maxTokens truncation incident → FIXED + verified (session 22, Jul 8) — ดู ISSUE-010, Known Bugs #8
- [ ] Monitoring ต่อเนื่อง — spot-check ว่าไม่มี truncation ซ้ำบนโพสต์ที่ยาวกว่านี้อีก
- [ ] Phase 5 (INTEL-001/002/003, ADR-006 validation layer) — proposal only ใน `docs/ADR/2026-07-08-phase5-roadmap-proposal.md` รอ user ตัดสิน priority

### AI Content — ListingTab resale persona (ADR-007) — เพิ่ง done session 23
- [x] Inject resale persona + BRAND_FACTS + hook structure บังคับเข้า ListingTab prompt → deploy สำเร็จ + verify ผ่าน production จริง (Jul 10)
- [ ] **CRITICAL — OPEN**: "Post to Facebook" ใน ListingTab คืน 500 แม้เปลี่ยน token ใหม่แล้ว — root cause ยังไม่ทราบ, block อยู่ที่ต้องรอ error body จริงจาก browser Network tab (user ส่ง Console tab มาผิดแท็บ 2 รอบ) ดู `docs/issues-log.md` ISSUE-011, Known Bugs #10
- [ ] Option 2 (House Matching Engine เต็มรูป) / Option 3 (persona tag บน properties table) — พักไว้ตามที่ user ตกลง รอพัฒนาต่อวันหน้า
- [ ] `memory/tokens.md` ยังไม่ sync ด้วย FB token ใหม่ที่เพิ่งใส่ — รอแก้ ISSUE-011 ให้จบก่อน

Last updated: 2026-07-11 (session 23 — AI Content ListingTab resale persona fix DONE + deployed + verified; FB "Post to Facebook" 500 error ยังเปิดอยู่ ยังไม่ resolve รอ error body จาก user — ดู HANDOFF.md/decisions.md ADR-007/issues-log.md ISSUE-011/glossary.md session 23)

### Doc sync — 2026-07-04 (session 20)
`decisions.md` (+ADR-004), `issues-log.md` (+ISSUE-005/006/007), `HANDOFF.md` (rewritten), `glossary.md`, และ `AI_TEAM.md` เขียนไว้ตอน Jun 30 ก่อน Hub v2 revert — sync ตรงกับสถานะจริงแล้วทั้งหมด (Hub v1 live, `x-hub-token`, `/action/...` paths) ไม่มีการเปลี่ยน architecture หรือ code ใน session นี้ — เป็นแค่ doc maintenance
