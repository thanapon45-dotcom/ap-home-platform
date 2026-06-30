# Glossary — AP-Home Platform

---

## Services

| Term | ความหมาย |
|---|---|
| **Hub v1** | Legacy backend (`server.cjs`) บน Railway — `ap-home-platform-production.up.railway.app` |
| **Hub v2** | TypeScript backend (clean architecture) บน Railway — `exciting-creativity-production-4b85.up.railway.app` |
| **Dashboard** | Next.js frontend บน Vercel — `ap-home-platform.vercel.app` |
| **n8n** | Workflow automation — `primary-production-8158a.up.railway.app` |
| **Shadow mode** | Hub v2 รับ traffic จริงแต่ยังไม่ได้ cutover DNS อย่างเป็นทางการ |

---

## n8n Workflows

| Term | ความหมาย |
|---|---|
| **WF1** | Workflow 1 — Article + Publish: รับ webhook จาก Hub v2, เขียน article, publish ไป WordPress, callback กลับ Hub v2 |
| **WF2** | Workflow 2 — Image + Patch: รับ webhook จาก WF1, generate image, patch WordPress post, callback Hub v2 |
| **Queue Auto-run** | Schedule workflow — ดึง item จาก content queue แล้ว trigger blog run ทุก X นาที |
| **Wake-up** | Schedule workflow — ping Hub v2 health ทุกชั่วโมงเพื่อป้องกัน Railway sleep |

---

## Authentication

| Term | ความหมาย |
|---|---|
| **HUB_SECRET** | `b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c` — shared secret ระหว่าง Dashboard, n8n, Hub v2 |
| **x-hub-secret** | Header name ที่ Hub v2 ใช้ตรวจ auth (ไม่ใช่ `x-hub-token` แบบ Hub v1) |
| **HMAC token** | `/webhook/n8n` ใช้ HMAC-SHA256(HUB_SECRET, runId) แทน x-hub-secret |

---

## State Fields

| Term | ความหมาย |
|---|---|
| **blog.status** | `idle` / `running` / `completed` / `failed` |
| **blog.runId** | ID ของ blog run ปัจจุบัน เช่น `run_da089n87` |
| **image_status** | สถานะ image callback จาก WF2: `patched` / `failed` / `binary_failed` |
| **content_queue** | Array ของ ContentQueueItem — pending items รอ blog run |
| **ContentQueueStatus** | `pending` / `running` / `completed` / `failed` |

---

## File Naming Convention

| Pattern | ความหมาย |
|---|---|
| `WF2 (5_hub_v2).json` | WF2 version 5, ชี้ Hub v2 — ไฟล์ล่าสุดใช้ import n8n |
| `WF1 (8_wb_fix).json` | WF1 version 8, webhook body fix |
| `Queue Auto-run (4).json` | Queue Auto-run version 4 |

---

## Dev Workflow Rules

| Rule | เหตุผล |
|---|---|
| `git add/commit/push` จาก **Windows PowerShell เท่านั้น** | Sandbox mount cache ตัดไฟล์ |
| ไม่ใช้ **emoji** ใน TypeScript files | Encoding corrupt ผ่าน sandbox |
| ไม่ใส่ `/api` ต่อท้าย `HUB_URL` | route.ts normalize เองแล้ว |
| Railway อาจต้อง **Redeploy ด้วยตนเอง** | auto-deploy ไม่ trigger เสมอไป |
| PowerShell ใช้ **`;`** แทน **`&&`** | PowerShell รุ่นเก่าไม่รู้จัก `&&` |
