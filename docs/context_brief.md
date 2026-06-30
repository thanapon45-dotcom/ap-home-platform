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

```
User/Schedule
    ↓
Dashboard (Vercel/Next.js)     ← frontend + Vercel proxy
    ↓ x-hub-secret
Hub v2 (Railway/TypeScript)    ← main backend (shadow, active)
    ↓ webhook
n8n (Railway)                  ← WF1 (article) + WF2 (image)
    ↓ callback
Hub v2                         ← update state
    ↓
Supabase                       ← database + state storage
WordPress (finnhouses.com)     ← published content
```

---

## Flow หลัก: Blog Auto-publish

```
1. Queue Auto-run (n8n, ทุก X นาที)
   → POST /api/blog/queue/run-next (Vercel proxy → Hub v2)
   
2. Hub v2 pop queue item → trigger WF1
   → POST n8n webhook (WF1)

3. WF1: generate article → publish WordPress
   → callback POST /webhook/n8n?token=<hmac> (Hub v2)
   → Hub v2: setBlogCompleted()

4. WF1: trigger WF2
   → POST n8n webhook (WF2)

5. WF2: generate image → patch WordPress
   → callback POST /webhook/image-done (Hub v2)
   → Hub v2: setImageDone() + update Supabase content_posts
```

---

## สิ่งที่ต้องรู้ก่อน touch code

1. **อ่าน CLAUDE.md** — URLs, env vars, gotchas ทั้งหมด
2. **git add/commit/push จาก Windows PowerShell เท่านั้น** — sandbox truncates files
3. **ไม่ใช้ emoji ใน TypeScript** — mount encoding issue
4. **Railway ต้อง Redeploy ด้วยตนเอง** ถ้าไม่ auto-deploy
5. **PowerShell ใช้ `;` แทน `&&`**

---

## ไฟล์ที่ต้องอ่านถ้าจะ implement อะไร

| จะทำอะไร | อ่านไฟล์ไหน |
|---|---|
| แก้ backend | `services/backend-hub/src/server.ts` |
| แก้ state type | `src/core/application/ports/IStateRepository.ts` |
| แก้ business logic | `src/modules/state/StateManager.ts` |
| แก้ Vercel proxy | `app/api/blog/queue/*/route.ts` |
| ดู n8n flow | `docs/HANDOFF.md` + n8n dashboard |
| ดู pending tasks | `docs/HANDOFF.md` |
| ดู bugs เก่า | `docs/issues-log.md` |
| ดู decisions | `docs/decisions.md` |
