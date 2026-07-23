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

### 13. AI Content Studio ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ — RESOLVED (session 27, Jul 20)
**ปัญหา**: FB post ที่ generate จาก AI Content Studio มี hashtag ตัดกลางคำ (`#ความมั่นใ`) และคำเพี้ยนกลางประโยค (`วัใจ` แทน "วางใจ") พร้อม hook ที่ผสมภาษาคนละกลุ่มลูกค้าปนกัน
**Root cause**: 2 อย่างซ้อนกัน — (1) `callClaude()` ส่ง `maxTokens: 800` fixed ต่ำเกินไปสำหรับเนื้อหาไทย ~220 คำ + hashtag 6-8 อัน (ภาษาไทย tokenize หนักกว่าอังกฤษมาก) → ตัดท้ายข้อความ (2) `KeywordTab.generate()` เรียก `callClaude()` โดยไม่ระบุ model → หลุดไปใช้ default Haiku แทน Sonnet ที่อีก 2 tab ใช้อยู่แล้ว — Haiku ภายใต้ prompt ซับซ้อนหนาแน่นผลิตคำเพี้ยนกลางประโยคได้แม้ไม่ชน token limit
**วิธีตรวจพบ**: ตำแหน่งคำผิดชี้สาเหตุคนละแบบ — ท้ายข้อความ = truncation, กลางประโยค = model quality (truncation ตัดได้แค่ท้ายสุดเท่านั้น)
**แก้**: `maxTokens` 800→2000 + บังคับ `"claude-sonnet-4-6"` ทุกจุดที่ generate เนื้อหาไทย user-facing
**กฎใหม่**: เนื้อหาไทย user-facing ต้องใช้ Sonnet เป็นค่าเริ่มต้นเสมอ ก่อนเพิ่ม `generate()` ใหม่ที่เรียก `callClaude()` ต้องเช็ค default model ทุกครั้ง
**ดู**: `docs/issues-log.md` ISSUE-016, `docs/decisions.md` ADR-012

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
  - **เหลืออยู่ (ยอมรับความเสี่ยงนี้ตามที่ user เลือก scope)**: หน้า `/crm` และ `/land-analyzer` เองยังไม่มี login gate — ปิดช่องโหว่ "ยิง Supabase ตรงด้วย anon key" ได้แล้ว แต่ยังไม่ใช่ auth เต็มรูป ถ้าต้องการล็อกหน้าเว็บเองต้องคุย scope Supabase Auth ใหม่ — **ยืนยันซ้ำ session 27 (Jul 20)**: Archi ให้เหตุผลว่าผู้ใช้หลักตอนนี้มีแค่ตัวเองคนเดียว ยอมรับความเสี่ยงนี้ต่อไป ไม่ต้องทำ auth เพิ่มตอนนี้
- [x] `market_listings` anon insert — เช็คแล้วว่าเป็นของจริง (`scripts/scrape-market.js` ใช้ anon key ตรง, INSERT-only อยู่แล้ว) ไม่ต้องแก้

### Hub v2 Remaining
> **ไม่รีบ (ยืนยัน session 27, Jul 20)** — Archi confirm ว่าไม่ต้องตัดสินใจ cutover/archive ตอนนี้ ปล่อย Hub v2 ไว้ในสถานะ shadow ต่อไปได้
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

### WF1 AI Quality Gate — Phase 2 (ADR-016, session 29, Jul 23) — LIVE ✅
- [x] เพิ่ม AI content-quality gate เข้า WF1 (แยกจาก Publish Guard เดิมที่เช็คแค่โครงสร้าง) — เช็ค brand guardrail (ไม่อ้างว่ารับสร้างบ้านเอง), ภาษาไทยสมบูรณ์ไม่เพี้ยน, ไม่มี claim ที่ตรวจสอบไม่ได้ — ไม่ผ่าน = บล็อกอัตโนมัติ + แจ้งเตือน (เหมือน guard เดิม)
- [x] สร้างไฟล์ใหม่ `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (10_ai_quality_gate).json` — ไฟล์เดิม (9) ไม่ถูกแตะเลย, field `publish_guard_ok`/`publish_guard_reasons` คงชื่อเดิมทุกจุด (IF/Blocked Log/Notify Hub Blocked ไม่ต้องแก้)
- [x] Verify แบบ static: parse JSON ผ่าน, wiring graph ครบไม่มี node ลอย, ทุกอย่าง reachable จาก Webhook
- [x] **Import + test-run จริงใน n8n โดย Archi (session 29 ต่อ)** — import สำเร็จ, wiring ตรงตามออกแบบ, ทดสอบผ่าน pinned data + ยิง Webhook Test URL จริง (วิธี "Execute step" แยก node ใช้ไม่ได้ใน n8n instance นี้ — ไม่ render output/error ให้เห็น เป็นข้อจำกัดของ UI ไม่ใช่ node พัง ยืนยันด้วยการเทียบกับ node เดิมที่ทำงานจริง)
- [x] **พบ + แก้ false positive จริง**: prompt draft แรกตีความ "ทีมที่ปรึกษาตรวจสอบงานก่อสร้างของเรา" (ธุรกิจจริง Unit 4) เป็น `brand_guardrail_violation` เพราะ gpt-4o-mini pattern-match "งานก่อสร้าง"+"ของเรา" มากไป ไม่สนใจ context ตรวจสอบ/ที่ปรึกษา — แก้ด้วยการเพิ่ม few-shot examples (ตัวอย่างประโยคจริง "ผ่าน" 3 อัน + "ต้อง flag" 4 อัน) แทนกฎนามธรรม → ทดสอบซ้ำทั้ง fail-case และ pass-case (เคสที่เคย false-positive) ผ่านทั้งคู่แล้ว — prompt เวอร์ชันนี้ sync กลับเข้าไฟล์แล้ว
- [x] **Go-live checklist เสร็จแล้ว (Archi, Jul 23)**: unpin "Prepare Post Payload" ออกแล้ว, "Create a post" เปิดกลับเป็น Active แล้ว, workflow (10_ai_quality_gate) กด Publish/Active แล้ว, workflow เดิม (9_queue_sync_fix) Deactivate แล้ว — **AI Quality Gate เป็น production จริงตั้งแต่วันนี้**
- [ ] รอดู cron รอบถัดไป (เช้าวันถัดไป ~09:00) ว่าบทความออกปกติผ่าน gate ใหม่ ไม่มีอะไรค้าง — เช็ค `hub_state`/content_queue หรือ Telegram notify
- [ ] พบ latent bug เดิม (ไม่เกี่ยวกับรอบนี้): "Check Existing Post by Slug" ไม่มีสายต่อไปไหนเลยใน connections graph — `duplicate_slug_exists` น่าจะไม่เคย fire จริง ต้องเปิดดู canvas จริงใน n8n ยืนยันก่อนแก้
- [ ] Monitor รอบแรกๆ หลัง active ว่า AI Quality Gate ไม่ block เนื้อหาที่ดีอยู่แล้วผิดพลาด (false positive อื่นที่ยังไม่เจอ) — ถ้า block บ่อยเกินจริงให้ปรับ prompt เพิ่ม few-shot ต่อ

### WF1 AI Quality Gate — Feedback Loop (ADR-021, session 29 ต่อๆๆๆๆ, Jul 23) — CODE DONE, รอ Archi import
- [x] item #2 ของแผน 3 ข้อที่ Archi อนุมัติ "ทำทั้ง 3 อันเลย เรียงตามลำดับ" — Quality Gate (ADR-016) ตัดสินใจบล็อก/ปล่อยผ่านทุกวัน แต่ไม่เคย log การตัดสินใจไว้ที่ไหนเลย และไม่มีทางให้มนุษย์ยืนยันย้อนหลังว่า Gate ถูกไหม (เหมือน QC Line ก่อน ADR-015)
- [x] สร้างตาราง Supabase `quality_gate_log` (RLS enabled, 0 policies, service_role only) — migration สำเร็จ
- [x] แก้ n8n: เพิ่ม node "Log Quality Gate Decision" คั่น `Parse AI Gate Result` → `Merge Guards` — log ทุกการตัดสินใจ (fail-open, ไม่บล็อก pipeline หลักถ้า log เขียนไม่สำเร็จ) — ไฟล์ใหม่ `Finnhouses WF1 — Article + Publish (11_gate_log).json` (ไฟล์เดิม (10) ไม่ถูกแตะ)
- [x] Verify แบบ static: parse JSON ผ่าน, node count 22→23, wiring 2 จุดถูกต้อง, **ทุก node reachable จาก Webhook ผ่าน graph traversal** (เช็คเพิ่มจากรอบ ADR-016 ที่ไม่ได้ทำ)
- [x] สร้าง `app/api/quality-gate/accuracy/route.ts` (GET, honest-threshold=10 เหมือน QC) + `app/api/quality-gate/feedback/route.ts` (PATCH ใหม่ — **Gate ไม่มี LINE bot คู่กันเหมือน QC ฉะนั้น dashboard นี้ต้องเป็นช่องทางยืนยันเดียวในตัวเอง**) + `components/QualityGateAccuracy.tsx` (มีปุ่ม ✅/❌ inline ต่อรายการ) + tab ใหม่ "🛡️ Quality Gate" ใน `DashboardOS.tsx`
- [x] เพิ่มตัวชี้วัดที่ QC ไม่มี: `false_positives` (บล็อกผิด) / `false_negatives` (ปล่อยผ่านผิด) เพราะ Gate ผิดพลาดได้ 2 ทิศทาง ต่างจาก QC ที่เป็น pass/fail ทิศทางเดียว
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด
- [ ] **รอ Archi**: (1) ใส่ service_role key จริงในไฟล์ (11_gate_log) ก่อน import (2) import แทนตัวเดิม (10) (3) activate แล้วรอดูว่า `quality_gate_log` เริ่มมีแถวจริง (4) เข้าไปกดยืนยัน ✅/❌ ในหน้า Quality Gate tab สะสม ≥10 ครั้งก่อนจะเห็น % ความแม่นยำจริง

### QC Line Accuracy Dashboard — Phase 1 (ADR-015, session 28, Jul 22) — DONE
- [x] จากบทสนทนา reflective กับ Archi เรื่อง "ระบบทำงานได้" vs "ระบบพิสูจน์ตัวเองว่าทำงานถูก" → เสนอแผน 3 phase, Archi เลือก Phase 1 (QC accuracy dashboard) ก่อน
- [x] พบว่า `qc_inspections` มีแค่ 20 แถว (test batch สัปดาห์เดียว 26 Jun–2 Jul) และมีแค่ 1 แถวมี `human_feedback` — แจ้ง Archi ก่อนสร้าง แทนสร้าง dashboard ที่โชว์ % จาก n=1 เงียบๆ Archi ยืนยันว่าช่วงนี้ไม่มีงานตรวจ QC จริง (ปัจจัยฤดูกาล) และให้สร้างเป็น infra รอไว้เลย
- [x] สร้าง `app/api/qc/accuracy/route.ts` (server-side, service_role) + `components/QcAccuracy.tsx` + tab ใหม่ "🔍 QC Accuracy" ใน `DashboardOS.tsx` — มี `RELIABILITY_THRESHOLD=10` (ต่ำกว่านี้โชว์ "ยังไม่มีข้อมูลพอสรุป" แทน % ที่เข้าใจผิดได้) + breakdown by severity + warning แยกเรื่อง feedback-adoption rate ต่ำ (คนละปัญหากับ QC volume)
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด, `get_advisors` ไม่มี WARN/ERROR ใหม่
- [ ] Phase 2 (auto-publish quality gate) / Phase 3 (Fix & Flip Deal ROI actual-vs-estimated) — รอ Archi ตัดสินใจลำดับต่อ ยังไม่เริ่ม
- [ ] Adoption gap แยกต่างหาก: แม้ test week ที่ผ่านมา มีแค่ 1/20 ที่กดปุ่มยืนยัน — อาจต้องมี nudge เตือนผู้ตรวจให้กดปุ่มทุกครั้ง (ยังไม่ได้ทำ)

### Fix & Flip Deals module (ADR-014, session 28, Jul 22) — DONE
- [x] Archi ขอ demo ก่อน (Kanban 4 stage) แล้วอนุมัติ "OK ลงมือได้" → สร้างจริง: ต่อยอดตาราง `reno_deals` ที่มีอยู่แล้วแต่ไม่เคยใช้งาน (migration เพิ่ม `name`/`stage`/`reno_budget`/`list_price`/`lead_id`/`updated_at` + DROP policy `anon_read` ที่เปิดโล่งอยู่ก่อน), API routes `app/api/deals/route.ts` + `app/api/deals/[id]/route.ts` (service_role only, มิเรอร์ pattern เดียวกับ leads/projects), `components/Deals.tsx` (Kanban board), `app/deals/page.tsx`, nav entry ใน `Sidebar.tsx`
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด, `get_advisors` (security) ไม่มี WARN/ERROR ใหม่ — `reno_deals` เหลือ policy เดียว `service_role_all`
- [ ] ยังไม่ผูก `lead_id` เข้า CRM UI จริง (คอลัมน์มีแล้วแต่ฟอร์มยังไม่มีตัวเลือกเชื่อม lead) — follow-up ถ้า Archi ต้องการ

### Fix & Flip Deal ROI — Phase 3 (ADR-017, session 29, Jul 23) — DONE
- [x] พบว่า Deals module (ADR-014) ไม่มีทางกรอกตัวเลขจริง (`reno_cost`/`sale_price`/`roi_pct`) เข้าไปได้เลย — คอลัมน์มีแล้วแต่ UI ไม่เคยเขียนค่า และตรวจ Supabase พบ `reno_deals` มี **0 แถวจริง** ตอนเริ่มงาน (เหมือนสถานการณ์ n=1 ของ QC Phase 1 — build infra ไว้ก่อนข้อมูลเข้าจริง ไม่ใช่ปัญหา)
- [x] เพิ่มใน `components/Deals.tsx`: ปุ่ม "✎ ใส่ต้นทุน/ราคาขายจริง" ต่อการ์ดดีล → คำนวณ `roi_pct` อัตโนมัติ → แสดง variance (งบ vs จริง, ประกาศ vs ขายจริง) ต่อการ์ด + การ์ดสรุป "ความแม่นยำของการประมาณการ" ระดับพอร์ต พร้อม honest empty-state ("ยังไม่มีข้อมูลพอสรุป") ตาม pattern เดียวกับ ADR-015 — ไม่แตะ API/schema/RLS เลย (PATCH endpoint เดิมรองรับอยู่แล้ว)
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด
- [ ] รอ Archi เริ่มใช้งานจริง (สร้างดีล + กรอกตัวเลขจริงอย่างน้อย 1 ดีล) เพื่อดูว่าการ์ด "ความแม่นยำของการประมาณการ" ออกค่าที่สมเหตุสมผลไหม — ตอนนี้ยังเป็น "ยังไม่มีข้อมูลพอสรุป" เพราะ 0 แถว

### CRM/Overview — business_unit ยังผูก Unit 1 ที่เลิกทำแล้ว (ADR-018, session 29 ต่อ) — DONE
- [x] Archi เจอการ์ด "รับสร้างบ้าน" ใน Overview ยังโชว์ Leads=1 ทั้งที่ Unit 1 เลิกทำไปแล้ว → ตรวจพบ 3 จุด: `CRM.tsx` (type/ฟอร์ม ไม่มีตัวเลือก Unit 4 เลย, default="build"), `DashboardOS.tsx` (fallback lead ที่ไม่มี business_unit ไปกอง "build"), `app/budget/page.tsx` (public lead form เขียน "build" ตรงๆ) — เปลี่ยน enum ทั้งหมดเป็น `"reno"|"list"|"consult"` (ตัด build, เพิ่ม consult=Unit 4) + fallback ทุกจุดเป็น "reno" (60% ของรายได้จริง) แทน
- [x] Migrate ข้อมูลจริงใน Supabase `leads` (3 แถว ทั้งหมดเป็น test data ไม่ใช่ลูกค้าจริง) → `reno` หมดแล้ว
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด, grep ทั้ง repo ไม่มี business_unit="build" เหลือ
- [x] **`/budget` page — Archi ตัดสินใจ: ปิด** (วันเดียวกัน) → แทนที่ calculator+lead form ทั้งหมดด้วยข้อความปิดให้บริการสั้นๆ ที่ชี้ไป 3 บริการจริง (reno/consult/list) ไม่ลบไฟล์/route ทิ้ง (กัน raw 404 จากลิงก์เก่า) + ตัด nav entry ออกจาก `Sidebar.tsx` — verify `npx tsc --noEmit` ผ่านสะอาด

### FB Post Performance Tracker — เขียนข้อมูลไม่เคยสำเร็จเลย (ADR-020, session 29 ต่อๆๆ) — CODE FIXED, รอ Archi import
- [x] จากคำถาม "AP-Home OS พิสูจน์ตัวเองว่าทำงานถูกหรือยัง" → ตรวจทีละโมดูล พบว่า AI Content Studio มี schema วัดผลจริงพร้อมอยู่แล้ว (`content_posts.impressions/engagement/clicks`, ตาราง `post_performance`) แต่ **ทุกแถวมีค่า 0 หมด ไม่มีข้อยกเว้นเลยสักแถว** ทั้งที่มี n8n workflow "FB Post Performance Tracker" (cron ทุกจันทร์ 09:30) อยู่จริง
- [x] Archi อัปโหลดไฟล์ workflow มาตรวจ → เจอ root cause: node "Config" hardcode anon key (ไม่ใช่ service_role) แต่ `content_posts`/`post_performance` เปิด RLS ไว้โดยไม่มี policy ให้ anon เข้าถึงเลย (pattern เดียวกับ ISSUE-013 เดิม) — ทุกครั้งที่รัน อ่าน `content_posts` ได้ 0 แถวเสมอ (RLS filter เงียบๆ) → ไม่มีการเขียนอะไรเข้า `post_performance` เลย
- [x] เจอบั๊กที่ 2 ซ้อนอยู่: node "Build Telegram Message" อ่านข้อมูลจาก node ผิด (ก่อนหน้า node ที่เติม field `_upserted`/`_upsert_error`) ทำให้ต่อให้ DB write fail ด้วยเหตุผลอื่นในอนาคต ข้อความ Telegram ก็ยังรายงานว่า "สำเร็จ" อยู่ดี
- [x] แก้ทั้ง 2 จุดในไฟล์ใหม่ `memory/n8n-workflows/FB Post Performance Tracker (5_rls_fix).json` — key แทนที่ด้วย placeholder ให้ Archi ใส่ service_role key จริงเอง (ไม่เดา secret ให้) + แก้ node reference ให้รายงานสถานะจริง 3 แบบ (ไม่พบ post / FB API error / DB write error)
- [ ] **รอ Archi**: (1) ใส่ service_role key จริงในไฟล์ก่อน import (2) import เข้า n8n แทนตัวเดิม (3) activate แล้วรอดู cron รอบถัดไป (จันทร์) ว่าเขียนข้อมูลจริงสำเร็จไหม
- [x] **UI ทำเสร็จแล้ว** (session 29 ต่อๆๆๆ, ไม่รอ workflow import ก่อน): `app/api/content/performance/route.ts` + `components/ContentPerformance.tsx` + tab "📈 Content Performance" ใน DashboardOS — ใช้ `post_performance` เป็น source of truth (ไม่ใช่ `content_posts.impressions` ที่ไม่เคยถูก patch เลย) + honest empty-state (threshold 5 โพสต์) — verify tsc สะอาด
- [ ] รอ Archi ใส่ service_role key จริง + import + activate workflow (5_rls_fix) แล้วรอ cron รอบถัดไป (จันทร์) — หลังจากนั้นเปิดหน้า "Content Performance" เพื่อยืนยันว่าเห็นข้อมูลจริงแล้ว (ไม่ใช่แค่ "ยังไม่มีข้อมูลพอสรุป" อีกต่อไป)

### CRM — ตัด "reno" ออกจาก business_unit ทั้งหมด (ADR-019, session 29 ต่อๆ) — DONE
- [x] Archi แจ้ง: lead เข้า CRM จริงมีแค่ 2 หน่วย (ที่ปรึกษา/ฝากขาย) — Fix & Flip sourced ผ่าน Deals module ต่างหาก ไม่ผ่าน CRM lead form → ตัด `"reno"` ออกจาก `business_unit` enum ทั้งหมด (`CRM.tsx`: type/ฟอร์ม/CSV import, `DashboardOS.tsx`: BIZ_META/Overview cards เหลือ 2 การ์ด)
- [x] สร้าง `lib/businessUnit.ts` — keyword classifier (`CONSULT_KEYWORDS`/`LIST_KEYWORDS` จาก keyword ที่ Archi พิมพ์เอง) ใช้ตอน business_unit ไม่ระบุมาชัดเจน (CSV import + Overview fallback ของ lead เก่า) แทนการ fallback ไปหน่วยตายตัวหน่วยเดียว — fallback สุดท้ายถ้า keyword ก็เดาไม่ได้เลย = `"list"` (Claude ตัดสินใจเดี่ยว เพราะ Archi ไม่ได้ระบุไว้ชัด — แจ้งได้ถ้าเจอ lead จัดผิดหน่วยบ่อย)
- [x] Migrate ข้อมูลจริงใน Supabase `leads` (3 แถว test data เดิม business_unit="reno") → "list" ทั้งหมด (ไม่ตรง keyword ทั้ง 2 ฝั่ง เลย fallback)
- [x] Verify: `npx tsc --noEmit` ผ่านสะอาด, grep ทั้ง repo ไม่มี business_unit="reno"/"build" เหลือ

### AI Content Studio — แก้ภาษาไทยเพี้ยน + Business Unit 3 confirm สัดส่วน + Platform Structure (ADR-011/012/013, session 27, Jul 20) — DONE
- [x] Archi ส่ง FB post ที่ generate ผิดปกติมาให้ตรวจ (hashtag ตัดกลางคำ, คำเพี้ยนกลางประโยค) → เจอ 2 root cause ซ้อนกัน: `maxTokens` 800 ต่ำเกินไป + `KeywordTab.generate()` หลุดไปใช้ Haiku default แทน Sonnet → แก้ทั้ง 2 จุดใน `components/AIContent.tsx` → deploy + verify ผ่าน production จริง (regenerate แล้วครบ ไม่มีคำเพี้ยน) — ดู Known Bugs #13, ADR-012, ISSUE-016
- [x] ยืนยันสัดส่วนธุรกิจจริง 3 หน่วยที่ยังทำอยู่: **Fix & Flip 60% · ที่ปรึกษา/ตรวจสอบ 30% · โบรกเกอร์ 10%** — clarify คำว่า "Develop" ที่ Archi ใช้ = Fix & Flip (Unit 3) ไม่ใช่ Unit 1 ที่ discontinued ไปแล้ว (ถาม confirm ผ่าน AskUserQuestion ก่อนแก้เอกสาร) → sync `docs/BUSINESS_MODEL.md` ทุกจุด — ดู ADR-011
- [x] เพิ่ม "Platform Structure — 2 Pillars" ใน `docs/BUSINESS_MODEL.md` ตามกรอบคิดของ Archi: การตลาดและขาย (AI Content Studio, CRM, OS Dashboard) vs การบริหารงานก่อสร้าง (Land Analyzer, Budget Tool, QC) + note ว่า 7 Intelligence Modules ไม่ได้แยกคนละ pillar แต่เชื่อมโยงข้อมูลกันทั้งหมดเป็นกลยุทธ์บริหารภาพรวม — ดู ADR-013
- [x] Security (ล็อกหน้า CRM/Land Analyzer): Archi confirm ไม่ต้องทำตอนนี้ — ผู้ใช้หลักมีคนเดียว ยอมรับความเสี่ยง
- [x] Hub v2 cutover/archive decision: Archi confirm ไม่รีบ

Last updated: 2026-07-23 (session 29 ต่อๆๆๆๆ — ADR-021: item #2 ของแผน 3 ข้อ "ระบบพิสูจน์ตัวเองว่าทำงานถูก" ที่ Archi อนุมัติ "ทำทั้ง 3 อันเลย เรียงตามลำดับ" — เพิ่ม feedback loop ให้ WF1 AI Quality Gate (ADR-016): ตาราง Supabase `quality_gate_log` ใหม่ (RLS 0-policy, service_role only), n8n node ใหม่ "Log Quality Gate Decision" คั่น `Parse AI Gate Result` → `Merge Guards` (fail-open, ไม่บล็อก pipeline หลัก) ในไฟล์ใหม่ `(11_gate_log).json` (ไฟล์เดิม (10) ไม่ถูกแตะ) — validate ครบ: parse JSON, node count 22→23, wiring 2 จุด, **ทุก node reachable จาก Webhook** (เช็คเพิ่มจาก ADR-016 ที่ไม่ได้ทำจุดนี้) — ฝั่ง Next.js: `app/api/quality-gate/accuracy/route.ts` (GET) + `app/api/quality-gate/feedback/route.ts` (PATCH ใหม่ — Gate ไม่มี LINE bot คู่กันเหมือน QC ฉะนั้น dashboard นี้เป็นช่องทางยืนยันเดียว) + `components/QualityGateAccuracy.tsx` (ปุ่ม ✅/❌ inline) + tab ใหม่ "🛡️ Quality Gate" ใน DashboardOS — เพิ่ม metric ใหม่ที่ QC ไม่มี: false_positives/false_negatives (Gate ผิดพลาดได้ 2 ทิศทาง) — verify tsc สะอาด — **รอ Archi**: ใส่ service_role key จริง + import + activate (11_gate_log) แทน (10) แล้วเริ่มกดยืนยันสะสม ≥10 ครั้งในหน้า Quality Gate — ต่อไปคือ item #3/#3 ของแผน: Land Analyzer → Deals link, แล้ว Market Intel confidence calibration ตามลำดับที่ Archi ขอ)

Last updated (ก่อนหน้า): 2026-07-23 (session 29 ต่อๆ — ADR-018: แก้ business_unit enum ที่ยังผูก Unit 1 (รับสร้างบ้าน, เลิกทำแล้ว) เป็น default/fallback อยู่ใน 3 ไฟล์ (`CRM.tsx`, `DashboardOS.tsx`, `app/budget/page.tsx`) — เปลี่ยนเป็น `reno|list|consult` ทั้งหมด, เพิ่มตัวเลือก Unit 4 (ที่ปรึกษา/ตรวจสอบ) ในฟอร์ม CRM ที่ไม่เคยมีมาก่อนเลย, migrate ข้อมูล test 3 แถวใน Supabase, verify tsc สะอาด — ยัง flag ไว้ไม่แตะ: `/budget` page ทั้งหน้ายัง premise เป็นเครื่องมือคำนวณสร้างบ้านใหม่ ต้องถาม Archi ก่อนว่าจะทำยังไงกับหน้านี้)

Last updated (ก่อนหน้า): 2026-07-23 (session 29 ต่อ — Phase 3 เสร็จ: เพิ่มความสามารถ "ใส่ต้นทุน/ราคาขายจริง" เข้า `components/Deals.tsx` — คำนวณ ROI จริงอัตโนมัติ + แสดง variance งบ/ราคาต่อการ์ด + การ์ดสรุป "ความแม่นยำของการประมาณการ" ระดับพอร์ตพร้อม honest empty-state (ตรวจพบ `reno_deals` มี 0 แถวจริงก่อนเริ่มงาน แจ้ง Archi ไว้แล้วในเอกสาร) ไม่แตะ API/schema เลย verify ผ่าน tsc สะอาด — ดู ADR-017 — ครบทั้ง 3 phase ตามแผนเดิม (Phase 1 QC Accuracy, Phase 2 WF1 AI Quality Gate LIVE, Phase 3 Deal ROI) แล้ว)

Last updated (ก่อนหน้า): 2026-07-22 (session 28 ต่อ — สร้าง QC Line Accuracy Dashboard Phase 1 (ADR-015): `/api/qc/accuracy` + `components/QcAccuracy.tsx` + tab ใหม่ใน DashboardOS ต่อยอดจากบทสนทนา reflective เรื่อง "ระบบพิสูจน์ตัวเองว่าทำงานถูก" — ออกแบบให้โชว์สถานะ "ยังไม่มีข้อมูลพอสรุป" อย่างตรงไปตรงมาแทนเปอร์เซ็นต์หลอกจาก n=1 feedback sample ปัจจุบัน verify ผ่าน tsc + get_advisors สะอาด)

Last updated (ก่อนหน้า): 2026-07-22 (session 28 — สร้าง "Fix & Flip Deals" module ใหม่สำหรับ Business Unit 3 (60% ของธุรกิจ) ที่ก่อนหน้านี้ไม่มีเครื่องมือ dedicated ติดตามดีลเลย: Archi ขอ demo ก่อน (Kanban 4 stage) แล้วอนุมัติ "OK ลงมือได้" → ต่อยอดตาราง Supabase `reno_deals` ที่มีอยู่แล้วแต่ไม่เคยถูกใช้งาน (0 rows, ไม่มี reference ในโค้ดมาก่อน) แทนสร้างตารางใหม่ซ้ำ — เพิ่ม pipeline fields ผ่าน migration + DROP policy `anon_read` ที่เปิดโล่งอยู่ก่อนแล้ว (พบระหว่างตรวจ RLS ก่อนใช้งานจริง) สร้าง API routes (`/api/deals`, `/api/deals/[id]`) มิเรอร์ pattern เดียวกับ leads/projects (service_role only), UI component `Deals.tsx` (Kanban board + summary metrics), page route, nav entry — verify ผ่าน tsc + get_advisors สะอาด (ADR-014) — เอกสารที่ sync วันนี้: decisions.md (+ADR-014), BUSINESS_MODEL.md (Unit 3 tooling note), CLAUDE.md (นี้, Known/Pending)

### Doc sync — 2026-07-04 (session 20) — doc sync: CLAUDE.md เคยไม่ตรงกับ issues-log.md ในหลายจุด แก้แล้ว (1) ISSUE-011 "Post to Facebook" 500 ปิดจริงตั้งแต่ session 23 แล้ว (root cause: ขาด Vercel env var `FB_BACKEND_URL`, ไม่ใช่ token) แต่ CLAUDE.md ยังเขียนว่า OPEN ค้างมา — แก้ Known Bugs #10 + Pending Tasks ให้ตรง (2) Known Bugs #11 cross-reference ผิด — เขียนว่า ISSUE-012 ทั้งที่เลขนั้นถูกใช้กับบั๊กคนละเรื่องไปแล้ว (AI เขียนประเภทบ้านผิด, session 23) เพิ่มเป็น ISSUE-014 ใน issues-log.md แล้วแก้ reference (3) เพิ่มเอกสาร `services/fb-backend` (Railway "easygoing-friendship") ที่ไม่เคยถูกบันทึกไว้เลยทั้งที่เป็น service จริงที่ใช้งานอยู่ — ดู FB Backend Service section ด้านบน (4) FB token expiry conflict (Jun 26 vs Aug 2) reconciled → ~Aug 2, 2026 ยืนยันแล้ว ตั้ง reminder renew ~25 Jul 2026 (5) `leads`/`projects` anon-key exposure ปิดแล้ว — ย้าย CRUD ไปทำฝั่ง server (`/api/leads/*`, `/api/projects/*`) + lock RLS anon SELECT/INSERT ทิ้ง — verify ผ่าน `get_advisors` และทดสอบจริงบน production (6) ระหว่างทดสอบเจอ+แก้บั๊กเดิม 2 จุดที่ไม่เกี่ยวกับงานนี้: `leads.area` เป็น numeric แต่ CRM AddLeadModal ส่ง text เข้าไป, และ `projects` insert ส่งคอลัมน์ที่ไม่มีอยู่จริง (`type`/`pin`/`form`/`result`) — ดู issues-log.md ISSUE-013 ท้ายสุด — ทดสอบจริงบน production ผ่านทั้งคู่แล้ว (CRM เพิ่ม Lead, Land Analyzer บันทึก))

### Doc sync — 2026-07-04 (session 20)
`decisions.md` (+ADR-004), `issues-log.md` (+ISSUE-005/006/007), `HANDOFF.md` (rewritten), `glossary.md`, และ `AI_TEAM.md` เขียนไว้ตอน Jun 30 ก่อน Hub v2 revert — sync ตรงกับสถานะจริงแล้วทั้งหมด (Hub v1 live, `x-hub-token`, `/action/...` paths) ไม่มีการเปลี่ยน architecture หรือ code ใน session นี้ — เป็นแค่ doc maintenance
