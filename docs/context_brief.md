# Context Brief — AP-Home Platform

> สำหรับ Claude ที่เพิ่งเข้า session ใหม่: อ่านไฟล์นี้ก่อน ใช้เวลา 2 นาที แล้วจะเข้าใจ project ได้เลย

---

## ธุรกิจคืออะไร

**Finnhouses** — บริษัทรับสร้างบ้านและ brokerage อสังหาริมทรัพย์ในกรุงเทพฯ  
เจ้าของ: Archi (archida.15@gmail.com)

Platform นี้คือ **content automation engine** ที่:
1. สร้าง blog article เกี่ยวกับอสังหาฯ อัตโนมัติด้วย AI
2. Generate image และ patch เข้า WordPress
3. Publish ไป Facebook
4. รับ QC inspection ผ่าน LINE bot (ช่าง → ส่งรูป → ได้ report ภาษาไทย)

---

## Tech Stack

> ⚠️ **Jul 1, 2026 — Hub v2 cutover REVERTED กลับ Hub v1** เพราะ `/api/fb/queue/*` และ `/api/blog/queue/*` ไม่มี implement จริงบน Hub v2 เลย — ดู `decisions.md` ADR-004, `issues-log.md` ISSUE-005 ห้าม assume ว่า Hub v2 active จนกว่าจะมีการ cutover ใหม่และมีการอัปเดตไฟล์นี้อีกครั้ง

```
User/Schedule
    ↓
Dashboard (Vercel/Next.js)     ← frontend + Vercel proxy
    ↓ x-hub-token
Hub v1 (Railway/Express, server.cjs)   ← main backend (LIVE — production traffic)
    ↓ webhook
n8n (Railway)                  ← WF1 (article) + WF2 (image)
    ↓ callback
Hub v1                         ← update state
    ↓
Supabase                       ← database + state storage
WordPress (finnhouses.com)     ← published content

(Hub v2 — TypeScript clean architecture — ยังรันอยู่แต่เป็น shadow เท่านั้น
 ไม่ได้ serve production traffic จนกว่า fb/blog queue routes จะสร้างครบ)
```

---

## Flow หลัก: Blog Auto-publish

```
1. Queue Auto-run (n8n, ทุกวัน 09:05)
   → POST /action/blog/queue/run-next (Vercel proxy → Hub v1, header x-hub-token)

2. Hub v1 pop queue item → trigger WF1
   → POST n8n webhook (WF1)

3. WF1: generate article → publish WordPress
   → callback POST /webhook/n8n?token=<hmac> (Hub v1)
   → Hub v1: setBlogCompleted()

4. WF1: trigger WF2
   → POST n8n webhook (WF2)

5. WF2: generate image → patch WordPress
   → callback POST /webhook/image-done (Hub v1)
   → Hub v1: setImageDone() + update Supabase content_posts
```

---

## สิ่งที่ต้องรู้ก่อน touch code

1. **อ่าน CLAUDE.md** — URLs, env vars, gotchas ทั้งหมด (source of truth ล่าสุดเสมอ)
2. **Hub v1 คือของจริงตอนนี้** — header `x-hub-token`, path `/action/blog|fb/queue/*` — ไม่ใช่ `/api/blog/queue/*` + `x-hub-secret` (นั่นคือ Hub v2 ที่ยังไม่ live)
3. **git add/commit/push จาก Windows PowerShell เท่านั้น** — sandbox truncates files
4. **ไม่ใช้ emoji ใน TypeScript** — mount encoding issue
5. **Railway ต้อง Redeploy ด้วยตนเอง** ถ้าไม่ auto-deploy
6. **PowerShell ใช้ `;` แทน `&&`**

---

## ไฟล์ที่ต้องอ่านถ้าจะ implement อะไร

| จะทำอะไร | อ่านไฟล์ไหน |
|---|---|
| แก้ backend ที่ live จริง (Hub v1) | `services/backend-hub/server.cjs` |
| แก้ Hub v2 (shadow, ยังไม่ live) | `services/backend-hub/src/server.ts` + `src/modules/state/StateManager.ts` + `src/core/application/ports/IStateRepository.ts` |
| แก้ Vercel proxy | `app/api/blog/queue/*/route.ts`, `app/api/fb/queue/*/route.ts` |
| ดู n8n flow | `docs/HANDOFF.md` + n8n dashboard |
| ดู pending tasks | `docs/HANDOFF.md` |
| ดู bugs เก่า | `docs/issues-log.md` |
| ดู decisions (รวม Hub v2 revert) | `docs/decisions.md` |
| ดู governance/architecture rules | `docs/AI_TEAM.md` |
