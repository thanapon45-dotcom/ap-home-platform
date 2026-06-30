# AP-Home Platform — Claude Reference

อ่านก่อนทุก session ใหม่ อย่า assume ว่า system ทำงานอย่างไร — ดูที่นี่เท่านั้น

---

## Platform URLs (confirmed working)

| Service | URL | Notes |
|---|---|---|
| Hub v2 (shadow, active) | `https://exciting-creativity-production-4b85.up.railway.app` | Railway — ใช้ URL นี้เท่านั้น |
| Hub v1 (legacy) | `https://ap-home-platform-production.up.railway.app` | ยังรัน แต่ migration ไป v2 แล้ว |
| Dashboard | `https://ap-home-platform.vercel.app` | Vercel / Next.js |
| n8n | `https://primary-production-8158a.up.railway.app` | Railway |

**HUB_URL ใน Vercel env var** = `https://exciting-creativity-production-4b85.up.railway.app`
(ไม่มี `/api` ต่อท้าย — code ใน route.ts normalize แล้ว แต่อย่าเพิ่ม `/api`)

---

## Hub v2 Endpoints (ครบถ้วน)

### Public (ไม่ต้องการ auth)
- `GET /health` — Railway healthcheck
- `POST /webhook/n8n?token=<hmac>` — WF1 callback หลัง publish (HMAC-SHA256)
- `POST /api/qc/webhook/line` — LINE signature

### Protected (`x-hub-secret` header)
- `GET /api/health/state` — ดู state
- `POST /api/blog/queue/run-next` — เริ่ม blog run
- `POST /api/blog/queue/build` — สร้าง queue
- `POST /api/blog/queue/clear` — ล้าง queue
- `POST /webhook/fb` — FB status callback
- `POST /webhook/image-done` — WF2 image callback ✅ (เพิ่ม 2026-06-30)
- `GET/POST /api/fb/*` — FB routes

---

## n8n Workflows

| Workflow | Trigger | Hub endpoint ที่ใช้ | ไฟล์ล่าสุด |
|---|---|---|---|
| Queue Auto-run | Schedule (ทุก X นาที) | Vercel proxy → Hub v2 `/api/blog/queue/run-next` | `Queue Auto-run (4).json` |
| WF1 — Article + Publish | Webhook จาก Hub v2 | Callback → Hub v2 `/webhook/n8n?token=` | `WF1 (8_wb_fix).json` |
| WF2 — Image + Patch | Webhook จาก WF1 | Callback → Hub v2 `/webhook/image-done` | `WF2 (5_hub_v2).json` ✅ |
| Wake-up | Schedule (ทุกชั่วโมง) | Hub v2 `/api/health/state` | `Wake-up workflow.json` |

**WF2 header**: `x-hub-secret` (ไม่ใช่ `x-hub-token` แบบเก่า)

---

## Environment Variables

### Vercel (Dashboard)
- `HUB_URL` = `https://exciting-creativity-production-4b85.up.railway.app` (ไม่มี `/api`)
- `HUB_SECRET` = `b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c`

### Railway (Hub v2)
- `HUB_SECRET`, `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`
- `TELEGRAM_BOT_TOKEN`, `TELEGRAM_CHAT_ID`
- `N8N_WEBHOOK_BASE_URL`, `FB_PAGE_ID`, `FB_PAGE_ACCESS_TOKEN`

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
# Health check
Invoke-RestMethod -Uri "https://exciting-creativity-production-4b85.up.railway.app/health"

# image-done endpoint
Invoke-RestMethod -Method POST -Uri "https://exciting-creativity-production-4b85.up.railway.app/webhook/image-done" -Headers @{"x-hub-secret"="b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c"; "Content-Type"="application/json"} -Body '{"status":"patched","post_id":"99999","media_id":"55555","media_url":"https://example.com/test.jpg"}'

# Queue run-next via Vercel proxy
Invoke-RestMethod -Method POST -Uri "https://ap-home-platform.vercel.app/api/blog/queue/run-next" -Headers @{"x-hub-secret"="b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c"; "Content-Type"="application/json"} -Body '{}'
```

---

## Pending Tasks

### Critical
- [ ] QC LINE end-to-end test (ส่ง LINE photo จริง → ตรวจ Thai reply ≤15s)
- [ ] Verify FB token expiry (tokens.md มีข้อมูลขัดแย้ง: Jun 26 vs Aug 2)
- [ ] Import/verify WF1 v8 ACTIVE ใน n8n

### Security
- [ ] Enable RLS: sites, line_users, qc_inspections, qc_defects, qc_standards, qc_daily_usage
- [ ] REVOKE anon from `append_line_image_atomic`
- [ ] DROP `hub_state` anon_update policy

### Hub v2 Remaining
- [ ] TASK-303 CacheManager
- [ ] TASK-304 HistoryManager
- [ ] TASK-313 Property Use Cases
- [ ] Cutover TASK-601/602/603

Last updated: 2026-06-30
