# API Auth Rollout (SEC-01 / SEC-02 / SEC-04)

ที่มา: PROJECT_AUDIT 2026-09-29 — Next.js `/api/*` หลายตัวใช้ service_role หรือแนบ HUB_SECRET โดยไม่มี auth
วิธี: middleware แบบ default-deny + session cookie สำหรับคน + `x-service-token` สำหรับ n8n (จำกัดเฉพาะ allowlist)

## 0. ก่อนเริ่ม

- ตั้ง repo เป็น private
- rotate secret ที่เคยอยู่ในไฟล์ที่ commit หรือถูกวางในแชท/Claude Project (Hub token ใน CLAUDE.md smoke test, Anthropic, Supabase, Telegram, LINE, FB, WordPress)
- ตรวจ `git grep -n "x-hub-token"` และ `git log -S<prefix ของ key>` ว่ามี secret ใน history หรือไม่
- ห้ามใช้ emoji ในไฟล์ TypeScript (ADR-003) — ไฟล์ชุดนี้ไม่มี emoji

## 1. Environment variables (Vercel: Production + Preview)

| Env | ค่า | หมายเหตุ |
|---|---|---|
| `SESSION_SECRET` | สุ่ม 48+ ตัวอักษร | ใช้เซ็น cookie; ต้อง >= 32 ตัว |
| `DASHBOARD_PASSWORD` | รหัสผ่านยาวๆ | รหัสเข้า dashboard |
| `SERVICE_TOKEN` | สุ่ม 48+ ตัวอักษร | **คนละค่ากับ HUB_SECRET** |
| `AUTH_ENFORCE` | `false` ก่อน แล้วค่อย `true` | false = report-only |

สร้างค่าสุ่มใน PowerShell:
`[Convert]::ToBase64String((1..36 | % { Get-Random -Maximum 256 }))`

หมายเหตุ Vercel: เปลี่ยน env แล้วต้อง **Redeploy** ถึงมีผล (Known Bug #2) — Rollback ที่เร็วที่สุดคือ Instant Rollback ไปยัง deployment ก่อนหน้า ไม่ใช่แค่สลับ env

## 2. ไฟล์ที่เพิ่ม

```
lib/auth.ts
middleware.ts
app/login/page.tsx
app/api/auth/login/route.ts
app/api/auth/logout/route.ts
tests/auth-smoke.ps1
```

ถ้า layout รากมี Sidebar หน้า login ใช้ `fixed inset-0 z-50` ทับไว้แล้ว แต่ควรเปิดดูจริงครั้งแรก

## 3. การจัดกลุ่ม route (จากผล inventory 41 route)

**Machine + Session (อยู่ใน MACHINE_ALLOWED)**
- `/api/chat` — Market Intel Collector v2 (n8n) และ dashboard
- `/api/fb/queue/run-next` — Queue Auto-run
- `/api/blog/queue/run-next` — ตัวเลือก ยืนยันจาก log ก่อน

**Session เท่านั้น** (ที่เหลือทั้งหมด) แบ่งตามความเสี่ยง:
- ใช้ service_role: `leads`, `leads/[id]`, `deals`, `deals/[id]`, `projects`, `sites`, `brains/context`, `content/performance`, `qc/accuracy`, `quality-gate/accuracy`, `quality-gate/feedback`, `market-intel/calibration|feedback|insights`
- แนบ Hub secret: `blog/*`, `fb/publish`, `fb/queue/build|clear`, `property/*`, `ops/summary`, `ops/dlq/[id]/retry`, `boq/[...path]`
- กินเงิน/ส่งข้อความ: `assistant`, `ai`, `image`, `market-intel`, `market-intel/submit`, `telegram`, `n8n`
- SSRF: `fetch-blog`

**ต้องตรวจซ้ำ 4 route ที่มีวงเล็บ** — คำสั่ง inventory อ่านไฟล์ `[id]`/`[...path]` ไม่ได้ (ตีความเป็น wildcard) ผลของ `deals/[id]`, `leads/[id]`, `ops/dlq/[id]/retry`, `boq/[...path]` จึงไม่น่าเชื่อถือ (เช่น `deals/[id]` ควรเป็น PATCH/DELETE) ให้รันใหม่ด้วย `Get-Content -LiteralPath`

## 4. n8n ที่ต้องแก้ (ทำก่อนเปิด enforce)

1. n8n > Credentials > สร้าง **Header Auth** ชื่อ `Vercel Service Token`, Name = `x-service-token`, Value = `SERVICE_TOKEN`
2. **Queue Auto-run**: node HTTP Request ที่ยิง `.../api/fb/queue/run-next` → Authentication = Generic Credential Type > Header Auth > credential ข้างบน (ทำแบบเดียวกันถ้ามี node ที่ยิง `/api/blog/queue/run-next` ผ่าน Vercel)
3. **Market Intel Collector v2** (ID `lrLOjW4GPd5atYhz`): node Parse ทั้ง 2 ตัวเรียก `/api/chat` จาก Code node ซึ่งอ่าน credential/`$env` ไม่ได้
   - ทางเร็ว: ใส่ header `'x-service-token': '<SERVICE_TOKEN>'` ตรงใน Code node (ยอมรับได้ชั่วคราว เพราะ token นี้ใช้ได้แค่ 3 route ใน allowlist ไม่ใช่กุญแจทั้งระบบ)
   - ทางถาวร: เปลี่ยนเป็น HTTP Request node + Header Auth credential
4. ไม่ต้องแก้: Telegram → Market Intel (เรียก n8n ตรง), LINE webhooks, Hub callbacks (/webhook/n8n, /webhook/image-done), reset checker (เรียก Hub ตรง), Wake-up
5. ไฟล์ n8n JSON ปัจจุบันไม่อยู่ใน repo (`memory/n8n-workflows/` มีแต่ README) และ workflow บน n8n อาจต่างจากที่เคย export จึงต้องพึ่ง log ใน ข้อ 5 เพื่อหา caller ที่ตกหล่น

## 5. ขั้นตอน rollout

1. ตั้ง env ทั้ง 4 ตัว (`AUTH_ENFORCE=false`) แล้ว deploy
2. เปิด `/login` ทดสอบเข้าระบบด้วยตนเองว่า cookie ใช้ได้ (report-only ทำให้ dashboard ยังใช้ได้โดยไม่ต้อง login)
3. แก้ n8n ตามข้อ 4
4. เฝ้า Vercel Logs อย่างน้อย 1 รอบ cron 09:05 และ 1 รอบ Market Intel จริง (ควรครอบคลุม 2-3 วัน) ค้นหา `AUTH_WOULD_DENY` แล้ว **ตัด user-agent ที่มี "Mozilla" ออก** สิ่งที่เหลือคือ caller ที่ไม่ใช่เบราว์เซอร์
   - ถ้าเห็น n8n/axios เรียก path นอก MACHINE_ALLOWED → เพิ่ม path นั้นถ้าจำเป็นจริง
   - ถ้าเห็น UA ของ Telegram ที่ `/api/telegram` → webhook ของบอทชี้มาที่ Vercel ต้องออกแบบแยก (Telegram ส่ง header `X-Telegram-Bot-Api-Secret-Token` ได้) ห้ามเปิด enforce ก่อนจัดการ
5. ตั้ง `AUTH_ENFORCE=true` แล้ว Redeploy (ทำบน Preview ก่อนถ้าได้)
6. รัน `tests/auth-smoke.ps1 -ConfirmEnforced -WithServiceToken`
7. วันถัดไปตรวจว่า Queue Auto-run 09:05 และ Market Intel ทำงานสำเร็จจริง (ห้ามทดสอบ run-next ด้วยมือเพราะจะเผยแพร่จริง)

## 6. Rollback

Vercel > Deployments > Instant Rollback ไปยัง deployment ก่อนหน้า (เร็วกว่าแก้ env แล้ว redeploy)

## 7. งานถัดไป (ยังไม่อยู่ในชุดนี้)

- เรียก `requireSession` / `requireSessionOrService` (มีใน lib/auth.ts) ต้นไฟล์ route ที่ใช้ service_role หรือแนบ HUB_SECRET เป็นชั้นป้องกันที่สอง
- Rate limit (Upstash) ที่ `chat`, `ai`, `assistant`, `image`, `market-intel*`, `telegram`, และ `auth/login`
- แก้ SSRF ใน `/api/fetch-blog`: allowlist โดเมน, ปฏิเสธ private/link-local/metadata IP, ตรวจปลายทางหลัง redirect, จำกัดขนาด response
- ปุ่มออกจากระบบใน Sidebar (POST `/api/auth/logout`)
- ย้ายไป Supabase Auth ถ้าต้องมีหลายผู้ใช้/หลายสิทธิ์ (แก้แค่ `verifySessionToken` และ login route)
- แก้ business-model drift ใน `/api/ai`, `/api/chat` default prompt และ CRM Lead Nurturing prompt
