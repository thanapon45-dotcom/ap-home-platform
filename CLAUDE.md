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

### 10. ListingTab "Post to Facebook" คืน HTTP 500 — RESOLVED (พบ session 23 Jul 10-11, แก้จริง session 23 ต่อ, cross-check session 25 Jul 16)
**ปัญหา**: กด "Post to Facebook" ใน AI Content → ListingTab → ได้ "❌ ผิดพลาด" (500)
**Root cause จริง**: `app/api/fb/publish/route.ts` proxy ไปยัง service แยกต่างหากชื่อ `services/fb-backend` (Railway alias "easygoing-friendship") ที่**ไม่เคยถูกบันทึกไว้ใน CLAUDE.md เลย** — ไม่ใช่ Hub v1/v2 — Vercel ขาด env var `FB_BACKEND_URL` ทำให้ route คืน `{error:"FB_BACKEND_URL not configured"}` status 500 ตัว token ไม่ใช่สาเหตุตั้งแต่แรก (เสียเวลาไล่ผิดทางไปหนึ่งรอบเพราะ assume ว่าเป็น token)
**วิธี diagnose ที่ได้ผลจริง**: ไม่ต้องพึ่ง DevTools Network tab เลย — `ListingTab` (`components/AIContent.tsx` บรรทัด ~1240) มี state `postError` ที่ render ข้อความ error สีแดงใต้ปุ่มโพสต์อยู่แล้วในหน้าจอปกติ กดปุ่มแล้วอ่านข้อความแดงตรงนั้นได้เลย
**Fix**: เพิ่ม `FB_BACKEND_URL=https://easygoing-friendship-production-e663.up.railway.app` ใน Vercel Environment Variables (Production + Preview) → redeploy → โพสต์ผ่านจริง ยืนยันจาก screenshot ปุ่มขึ้น "✅ โพสต์แล้ว!" และเห็นโพสต์บน Facebook Page จริง
**ดู**: `docs/issues-log.md` ISSUE-011 (มี root cause + fix ครบอยู่แล้ว — CLAUDE.md เคยไม่ sync ตามให้ถูกต้อง แก้ไว้ตรงนี้แล้ว session 25)

### 11. WF1 Publish Guard บล็อกเงียบ — slug fallback สั้นเกินไป + ไม่มี node แจ้งเตือน — FIXED (session 24, Jul 13)
**ปัญหา**: node "Edit Fields" มี fallback `article_slug = ... || 'post'` เวลา AI model ไม่คืนค่า slug มา แต่ node "Publish Guard + Dedupe History" เช็คว่า slug ต้องยาว ≥6 ตัวอักษร — "post" มีแค่ 4 ตัว **ไม่มีทางผ่านได้เลย** (fallback ขัดแย้งกับกฎของตัวเอง) → เดินไปทาง "Blocked Log" ซึ่งไม่มี node ไหน callback กลับ Hub เลย → `content_queue` item + `state.blog` ค้าง "running" ตลอดไป จนกว่า Health Check จะเตือนทาง Telegram (ค้างไป 11+ ชม.ก่อนพบ)
**วิธีตรวจพบ**: เช็ค execution ใน n8n เห็นว่า "Succeeded" ทุก node เขียว (ไม่มี error) — แต่ดูที่ node ไหน**เดินผ่านจริง**ไม่ใช่แค่ดูสถานะรวม พบว่าไปทาง "Blocked Log" ไม่ใช่ "Create a post"
**แก้**: (1) เปลี่ยน slug fallback เป็น chain: slug จากโมเดล → derive จาก title ถ้าสั้นเกิน → `post-<timestamp>` ถ้ายังสั้นอีก (การันตีผ่าน guard เสมอ) (2) เพิ่ม node "Notify Hub Blocked" ต่อจาก Blocked Log ให้ callback กลับ Hub ด้วย `status:"failed"` + `queue_item_id` เสมอ (3) เพิ่ม `queue_item_id` เข้า "Notify Hub Published" ด้วย (เดิมไม่มี ทำให้ item ที่ publish สำเร็จก็ค้าง "running" เหมือนกัน)
**ไฟล์**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (9_queue_sync_fix).json`
**กฎใหม่**: (1) ห้ามตั้ง fallback value ที่สอบตกกฎ validation ที่ตามมาทันที — เช็คทุก fallback เทียบกับทุก guard/validation ที่อยู่ downstream (2) ทุก branch ที่จบ workflow แบบไม่ publish (blocked/error/skip) ต้อง callback กลับ Hub เสมอ ห้ามจบเงียบๆ — ไม่งั้น state ค้างและไม่มีใครรู้จนกว่า Health Check จะจับได้
**ดู**: `docs/issues-log.md` ISSUE-014 (⚠️ แก้ cross-reference session 25 — เดิมเขียนผิดเป็น ISSUE-012 ซึ่งจริงๆ คือคนละเรื่อง คือบั๊ก "AI เขียนประเภทบ้านผิด" จาก session 23 เลข ISSUE-012 ถูกใช้ไปแล้ว ไม่เคยมีการบันทึกบั๊กนี้ลง issues-log.md จริงๆ จนกระทั่งเพิ่มเป็น ISSUE-014 ใน session 25)

### 12. Vercel ปุ่ม "Redeploy" rebuild commit เดิม ไม่ดึง commit ล่าสุด — RESOLVED (session 26, Jul 20)
**ปัญหา**: หลัง push commit ใหม่ขึ้น `main` แล้ว auto-deploy webhook ดูเหมือนไม่ทำงาน (production ยัง serve UI เก่าอยู่) — กดปุ่ม "Redeploy" ใน Vercel dashboard เพื่อแก้ แต่ build log ที่ได้กลับโชว์ `Commit: d53de6f` (commit เก่า) ไม่ใช่ commit ล่าสุดที่เพิ่ง push
**Root cause**: ปุ่ม "Redeploy" ของ Vercel rebuild **commit เดียวกับ deployment ที่กดมาจาก** เสมอ (พฤติกรรมมาตรฐานสำหรับ rollback/retry) ไม่ได้ pull commit ล่าสุดจาก branch ที่ track อยู่ — ไม่ใช่ bug ของ Vercel แต่เข้าใจผิดได้ง่ายเพราะดูเหมือนควรจะดึงล่าสุด
**วิธีตรวจพบ**: เทียบ `git log origin/main --oneline` (commit จริงบน GitHub) กับ `meta.githubCommitSha` ของ deployment ล่าสุดผ่าน Vercel API/MCP (`list_deployments`) — ถ้าไม่ตรงกันคือเจอปัญหานี้
**แก้**: `git commit --allow-empty -m "..."` แล้ว `git push` — สร้าง push event ใหม่จริงๆที่ trigger GitHub→Vercel webhook ตามปกติ (ห้ามใช้ปุ่ม Redeploy เพื่อหวังดึง commit ใหม่)
**กฎใหม่**: ถ้า production ไม่อัปเดตตาม commit ที่เพิ่ง push ให้เช็ค `git log origin/main` เทียบ Vercel deployment commit ก่อนเสมอ ก่อนจะสรุปว่า deploy พัง — ถ้า commit ไม่ตรงและใช้ปุ่ม Redeploy ไปแล้วไม่ช่วย ให้ push empty commit แทน
**ดู**: `docs/issues-log.md` ISSUE-015, `docs/glossary.md` (Dev Workflow Rules table)

---

## Security Constraints (ห้ามละเมิด)

- ห้าม call Railway URL โดยตรงจาก client-side / Next.js browser code
- ห้าม store secrets ใน code — ใช้ env vars เท่านั้น
- n8n Webhook v2.1: ใช้ `$input.first().json.body || $input.first().json` เสมอ
- ห้าม revert fetch() ใน Code node
- Architectural decisions → ต้อง document และถามก่อน implement

---

## FB Backend Service (พบว่าไม่เคยบันทึกไว้ — เพิ่ม session 25, Jul 16)

`services/fb-backend/server.js` — Express service แยกต่างหาก deploy บน Railway (alias **"easygoing-friendship"**), **ไม่ใช่ Hub v1 หรือ Hub v2**
- Endpoint: `POST /api/fb/publish` — โพสต์เข้า Facebook Graph API จริง (`/{page_id}/photos` ถ้ามี public image URL, `/{page_id}/feed` ถ้าไม่มี)
- Auth: header `x-hub-token` เทียบกับ env var `HUB_SECRET` ของ **service นี้เอง** (Railway) — คนละตัวกับ `HUB_SECRET`/`HUB_TOKEN` ของ Hub v1
- Next.js เรียกผ่าน `app/api/fb/publish/route.ts` (proxy) ซึ่งต้องมี Vercel env var `FB_BACKEND_URL` ชี้มาที่ Railway URL ของ service นี้ — **ถ้า env var นี้หายไป Next.js route คืน 500 ทันที** (ดู Known Bugs #10 / ISSUE-011)
- STUB mode: ถ้า `FB_PAGE_ACCESS_TOKEN`/`FB_PAGE_ID` ไม่ตั้งค่าใน Railway ของ service นี้ → log แล้วตอบสำเร็จเฉยๆ ไม่โพสต์จริง (เช็คผ่าน `GET /health` → `fb_configured`)

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
- [x] Verify FB token expiry → **RESOLVED session 25 (Jul 16)** — tokens.md เคยขัดแย้งกันเอง (Jun 26 vs Aug 2) แก้แล้วทั้ง 2 ไฟล์ (`memory/tokens.md` + `CORE/ap-home-platform/memory/tokens.md`) ยืนยัน **~Aug 2, 2026 ถูกต้อง** จากหลักฐานที่โพสต์ FB สำเร็จจริงวันนี้ (ถ้าหมดตั้งแต่ Jun 26 จะโพสต์ไม่ผ่าน) — ตั้ง reminder renew ล่วงหน้า ~25 Jul 2026
- [ ] เอาเกณฑ์ตัวเลขจริงจาก `Check list/02 QC List Revise02 2018.xlsx` + `inspect โครงสร้าง.pdf` (`D:\Finnhouses brand\`) ไปเสริม `QC_SYSTEM_PROMPT` ใน server.cjs — สกัดไว้บางส่วนแล้ว (ดู decisions.md, issues-log.md session 19b) ยังไม่ได้ใส่จริง
- [ ] เพิ่มรูปอ้างอิง qc_standards หมวด structure, cleanliness — ยังไม่มีรูปเลยทั้งคู่ (structure พอมี PDF checklist ช่วยได้)

### Blog Runner — WF1 Publish Guard fix (session 24, Jul 13) — DONE
- [x] Blog Runner ค้าง "running" 11+ ชม. (runId `blog_0134d26d`) → root cause: slug fallback `'post'` (4 ตัว) สอบตกกฎ Publish Guard (≥6 ตัว) เสมอ → บล็อกเงียบไม่ callback กลับ Hub → **FIXED**: slug fallback chain ใหม่ + เพิ่ม node "Notify Hub Blocked" + เพิ่ม `queue_item_id` เข้า "Notify Hub Published" ด้วย (เดิมก็ไม่มี ทำให้ item ที่ publish สำเร็จค้าง "running" เหมือนกัน) → ไฟล์ `Finnhouses WF1 — Article + Publish (9_queue_sync_fix).json` import + active แล้ว
- [x] Unblock ของค้างวันนี้ + backfill queue item เก่า (07-11, 07-12) ให้ status ตรงความจริง → ผ่าน Supabase MCP ตรง
- [ ] Monitor ต่อเนื่อง — spot-check ว่า Publish Guard ไม่บล็อกซ้ำ และ `content_queue` status sync ถูกต้องทุกวันหลังจากนี้ (ดู `docs/issues-log.md` ISSUE-012)

### Security
- [x] Enable RLS: sites, line_users, qc_inspections, qc_defects, qc_standards, qc_daily_usage → **DONE 2026-07-11 (session 23)** — verified via Supabase advisor before/after, zero impact on Hub (uses service_role, bypasses RLS)
- [x] REVOKE anon from `append_line_image_atomic` → **DONE 2026-07-11** — REVOKE per-role ไม่พอ ต้อง `REVOKE ... FROM PUBLIC` ด้วย (Postgres grants EXECUTE to PUBLIC by default) แก้แล้ว + verified ผ่าน `has_function_privilege`
- [x] DROP `hub_state` anon_update policy → **DONE 2026-07-11** — พร้อม anon_insert ด้วย (hub_state เขียนโดย Hub service_role เท่านั้น ยืนยันจาก `updated_at` ที่ยังขยับวันนี้แม้ตัด anon แล้ว)
- [x] **เพิ่มเติมนอกแผนเดิม (พบระหว่างแก้)**: ลบ `USING (true)`/`WITH CHECK (true)` policy ที่เปิดโล่งบน area_memory, buyer_context_signals, buyer_profiles, content_frames, market_insights, content_posts, properties + ปิด 4 ตารางที่ตายแล้ว (fb_listings, fb_sellers, fb_listing_history, agent_reports — ไม่มีการเขียนมา 30+ วัน) + fix `qc_inspections_view` SECURITY DEFINER → security_invoker + pin search_path 2 ฟังก์ชัน — ดู issues-log.md ISSUE-013
- [x] `leads` (CRM) / `projects` (Land Analyzer) anon exposure → **RESOLVED session 25 (Jul 16)** — user เลือกทางแก้แบบไม่ต้องสร้าง auth เต็มรูป: ย้าย CRUD ทั้งหมดไปทำฝั่ง server (`/api/leads/*`, `/api/projects/*` ใช้ `SUPABASE_SERVICE_KEY`) แก้ `CRM.tsx`/`LandAnalyzer.tsx`/`DashboardOS.tsx`/`budget/page.tsx` ให้เรียก API แทน แล้ว lock RLS anon SELECT/INSERT ทิ้งทั้ง 2 ตาราง — verify ผ่าน `get_advisors` แล้ว ดู `docs/issues-log.md` ISSUE-013
  - **เหลืออยู่ (ยอมรับความเสี่ยงนี้ตามที่ user เลือก scope)**: หน้า `/crm` และ `/land-analyzer` เองยังไม่มี login gate — ปิดช่องโหว่ "ยิง Supabase ตรงด้วย anon key" ได้แล้ว แต่ยังไม่ใช่ auth เต็มรูป ถ้าต้องการล็อกหน้าเว็บเองต้องคุย scope Supabase Auth ใหม่
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
- [x] "Post to Facebook" ใน ListingTab คืน 500 → **RESOLVED session 23 ต่อ, cross-checked session 25 (Jul 16)** — root cause คือ Vercel ขาด env var `FB_BACKEND_URL` (proxy ไปยัง service `services/fb-backend` ที่ไม่เคยบันทึกไว้) ไม่ใช่ token ดู `docs/issues-log.md` ISSUE-011, Known Bugs #10
- [ ] Option 2 (House Matching Engine เต็มรูป) / Option 3 (persona tag บน properties table) — พักไว้ตามที่ user ตกลง รอพัฒนาต่อวันหน้า
- [x] `memory/tokens.md` sync กับ FB token — unblocked แล้ว (ISSUE-011 ปิดแล้ว), ยังต้องเช็คว่าไฟล์ tokens.md ถูกอัปเดตจริงหรือยัง (ดู pending "Verify FB token expiry" ด้านบน)

### AI Content Studio — Business model correction + segment decoupling (ADR-009/ADR-010, session 26, Jul 20) — DONE
- [x] Archi ยืนยันธุรกิจจริงมีแค่ 2 กลุ่มลูกค้า: (1) ซื้อ/ฝากขายบ้าน (2) ที่ปรึกษา/ตรวจสอบงานก่อสร้าง — **ไม่ทำธุรกิจรับเหมาก่อสร้าง** → รื้อ `BRAND_FACTS`, `KEYWORDS`, `BUYER_SEGMENTS` (3→2 กลุ่ม), `FB_QUEUE_TEMPLATES` ทั้งหมดใน `components/AIContent.tsx` ให้ตรงความจริง + ลบ `STYLES` selector ออกทั้งหมด (ไม่เกี่ยวกับธุรกิจแล้วตามที่ Archi ยืนยัน) → deploy + verify ผ่าน production จริง (commit `d53de6f`) — ดู ADR-010
- [x] Decouple Buyer Segment selector ออกจาก Positioned tone (เดิม nested อยู่ใต้ tone นั้นเท่านั้น) ให้เลือกได้อิสระทุก tone + ย้าย UI ไปไว้ก่อน Keyword ตามที่ Archi ขอ (commit `0dc0c42`) — ดู ADR-009
- [x] Taste Library (⭐) เพิ่ม segment tag ต่อ reference post + filter ให้ prompt ใช้เฉพาะ reference ที่ตรงกลุ่มลูกค้าที่เลือกอยู่ (fallback ใช้ทั้งหมดถ้ายังไม่มีตัวไหน tag ตรง) (commit `e1d73cc`) — ดู ADR-009
- [x] Vercel deploy ค้าง production เก่าแม้ push แล้ว → root cause: ปุ่ม "Redeploy" rebuild commit เดิม ไม่ดึงล่าสุด → แก้ด้วย empty commit (commit `27387fb`) → verify ผ่าน screenshot จริง (UI order ถูก + FB post content ไม่มีภาษา "รับสร้างบ้าน" หลงเหลือ) — ดู Known Bugs #12, ISSUE-015
- [x] ยืนยันสถานะ Business Unit 3 (Fix & Flip) → **DONE (session 26 ต่อ)** — Archi ยืนยัน Unit 3 ยังทำอยู่จริง เป็นหน่วยธุรกิจหลัก สัดส่วนธุรกิจจริงคือ **Develop/Fix & Flip 60% · ที่ปรึกษา/ตรวจสอบ (Unit 4) 30% · โบรกเกอร์ (Unit 2) 10%** — Unit 1 (รับสร้างบ้านใหม่) ยัง discontinued เหมือนเดิม ไม่กระทบ — ดู `docs/BUSINESS_MODEL.md`, `docs/decisions.md` ADR-011
- [ ] **ใหม่**: AI Content Studio ยังไม่มี buyer segment/keyword สำหรับ Fix & Flip เลย ทั้งที่เป็น 60% ของธุรกิจ — ต้องถาม Archi ว่าต้องการให้ content engine ครอบคลุมด้วยหรือไม่ก่อนเริ่มงาน (ขนาดงานเทียบเท่า ADR-010)

Last updated: 2026-07-20 (session 26 — AI Content Studio: (1) decouple Buyer Segment selector จาก Positioned tone + segment-tag Taste Library reference posts ให้ filter ตามกลุ่มลูกค้า (ADR-009) (2) Archi ยืนยันธุรกิจจริงมีแค่ 2 กลุ่มลูกค้า (ซื้อ/ฝากขายบ้าน + ที่ปรึกษาตรวจสอบงานก่อสร้าง) ไม่ทำรับเหมาก่อสร้าง → รื้อ BRAND_FACTS/KEYWORDS/BUYER_SEGMENTS/FB_QUEUE_TEMPLATES ทั้งหมด + ลบ STYLES selector ออก (ADR-010) + sync `docs/BUSINESS_MODEL.md` ทำเครื่องหมาย Unit 1 (รับสร้างบ้าน) เป็น DISCONTINUED (3) เจอ+แก้ Vercel gotcha ใหม่: ปุ่ม "Redeploy" rebuild commit เดิมเสมอไม่ดึง commit ล่าสุด แก้ด้วย `git commit --allow-empty` (Known Bugs #12, ISSUE-015) — โค้ดทั้งหมด deploy+verify ผ่าน production จริงแล้ว 4 commits (`e1d73cc`, `d53de6f`, `0dc0c42`, `27387fb`) — เอกสารที่ sync วันนี้: decisions.md (+ADR-009/010), issues-log.md (+ISSUE-015), HANDOFF.md (+Session 26), glossary.md (+4 entries, +Dev Workflow Rules row), BUSINESS_MODEL.md (Unit 1 DISCONTINUED note), CLAUDE.md (นี้), memory/Claude md/CLAUDE.md — ค้างไว้: ยืนยันสถานะ Business Unit 3 (Fix & Flip) กับ Archi)

### Doc sync — 2026-07-04 (session 20) — doc sync: CLAUDE.md เคยไม่ตรงกับ issues-log.md ในหลายจุด แก้แล้ว (1) ISSUE-011 "Post to Facebook" 500 ปิดจริงตั้งแต่ session 23 แล้ว (root cause: ขาด Vercel env var `FB_BACKEND_URL`, ไม่ใช่ token) แต่ CLAUDE.md ยังเขียนว่า OPEN ค้างมา — แก้ Known Bugs #10 + Pending Tasks ให้ตรง (2) Known Bugs #11 cross-reference ผิด — เขียนว่า ISSUE-012 ทั้งที่เลขนั้นถูกใช้กับบั๊กคนละเรื่องไปแล้ว (AI เขียนประเภทบ้านผิด, session 23) เพิ่มเป็น ISSUE-014 ใน issues-log.md แล้วแก้ reference (3) เพิ่มเอกสาร `services/fb-backend` (Railway "easygoing-friendship") ที่ไม่เคยถูกบันทึกไว้เลยทั้งที่เป็น service จริงที่ใช้งานอยู่ — ดู FB Backend Service section ด้านบน (4) FB token expiry conflict (Jun 26 vs Aug 2) reconciled → ~Aug 2, 2026 ยืนยันแล้ว ตั้ง reminder renew ~25 Jul 2026 (5) `leads`/`projects` anon-key exposure ปิดแล้ว — ย้าย CRUD ไปทำฝั่ง server (`/api/leads/*`, `/api/projects/*`) + lock RLS anon SELECT/INSERT ทิ้ง — verify ผ่าน `get_advisors` และทดสอบจริงบน production (6) ระหว่างทดสอบเจอ+แก้บั๊กเดิม 2 จุดที่ไม่เกี่ยวกับงานนี้: `leads.area` เป็น numeric แต่ CRM AddLeadModal ส่ง text เข้าไป, และ `projects` insert ส่งคอลัมน์ที่ไม่มีอยู่จริง (`type`/`pin`/`form`/`result`) — ดู issues-log.md ISSUE-013 ท้ายสุด — ทดสอบจริงบน production ผ่านทั้งคู่แล้ว (CRM เพิ่ม Lead, Land Analyzer บันทึก))

### Doc sync — 2026-07-04 (session 20)
`decisions.md` (+ADR-004), `issues-log.md` (+ISSUE-005/006/007), `HANDOFF.md` (rewritten), `glossary.md`, และ `AI_TEAM.md` เขียนไว้ตอน Jun 30 ก่อน Hub v2 revert — sync ตรงกับสถานะจริงแล้วทั้งหมด (Hub v1 live, `x-hub-token`, `/action/...` paths) ไม่มีการเปลี่ยน architecture หรือ code ใน session นี้ — เป็นแค่ doc maintenance
