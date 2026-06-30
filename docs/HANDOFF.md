# Session Handoff — สำหรับ Claude session ถัดไป

> อ่าน CLAUDE.md ก่อนเสมอ แล้วค่อยอ่านไฟล์นี้

---

## Last Updated: 2026-06-30

## สิ่งที่ทำเสร็จใน session นี้

### ✅ Fix 1: Vercel proxy 404 (run-next)
- Root cause: `HUB_URL` env var มี `/api` ต่อท้าย → double path
- Fix: normalize URL ใน `app/api/blog/queue/run-next/route.ts`
- Commit: `a0de659`
- Test: `POST /api/blog/queue/run-next` → 200 OK ✅

### ✅ Fix 2: เพิ่ม /webhook/image-done ใน Hub v2
- WF2 เดิมชี้ Hub v1 URL ที่ไม่มี auth
- Hub v2 เดิมไม่มี endpoint นี้
- Fix: เพิ่ม endpoint + type + StateManager method
- WF2 JSON อัปเดต URL + header name
- Commit: `856683d`
- Test: `POST /webhook/image-done` → `{ok:true, status:"patched"}` ✅

### ✅ Fix 3: CLAUDE.md + documentation
- สร้าง `CLAUDE.md`, `decisions.md`, `HANDOFF.md`, `issues-log.md`, `glossary.md`
- Commit: `3af2101`

---

## สถานะปัจจุบันของ workflows

| Workflow | Status | URL ที่ใช้ |
|---|---|---|
| Queue Auto-run | Active (ตรวจสอบใน n8n) | Hub v2 via Vercel proxy |
| WF1 | ต้องยืนยัน v8 ACTIVE | Hub v2 `/webhook/n8n` |
| WF2 v5 | Import แล้ว (ยืนยัน Active) | Hub v2 `/webhook/image-done` |
| Wake-up | Active | Hub v2 `/api/health/state` |

---

## งานที่ยังค้างอยู่ (เรียงตาม priority)

### 🔴 Critical
1. **QC LINE test** — ส่ง LINE photo จริง → ตรวจว่าได้ reply ภาษาไทย ≤15s
2. **FB token** — tokens.md ขัดแย้ง: "expired Jun 26" vs "Aug 2" → verify จริง
3. **WF1 v8 active** — ยืนยันใน n8n ว่า version 8 กำลัง active อยู่ (ไม่ใช่ version เก่า)

### 🟡 Security
4. Enable RLS: `sites`, `line_users`, `qc_inspections`, `qc_defects`, `qc_standards`, `qc_daily_usage`
5. `REVOKE anon FROM append_line_image_atomic`
6. `DROP` policy `hub_state` anon_update

### ⚪ Low priority
7. Hub v2 TASK-303 CacheManager
8. Hub v2 TASK-304 HistoryManager
9. Hub v2 TASK-313 Property Use Cases
10. Cutover TASK-601/602/603

---

## Blog run ที่ยังค้าง
- `run_da089n87` — started 2026-06-30 13:49, status อาจยัง "running"
- ตรวจ: `GET /api/health/state` ดู blog.status
- ถ้า stuck → reset ด้วย `POST /api/blog/queue/clear` แล้วสร้าง queue ใหม่
