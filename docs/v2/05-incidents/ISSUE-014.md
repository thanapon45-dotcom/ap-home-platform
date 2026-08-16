## ISSUE-014 — WF1 Publish Guard บล็อกเงียบ — slug fallback สั้นเกินไป + ไม่มี node แจ้งเตือน
**Date**: 2026-07-13 (session 24)
**Severity**: High (Blog Runner ค้าง "running" 11+ ชม. ไม่มีใครรู้จนกว่า Health Check จะเตือน)
**Status**: **RESOLVED 2026-07-13 (session 24)**

**หมายเหตุการบันทึก (session 25, Jul 16)**: บั๊กนี้ถูกแก้จริงและบันทึกไว้ใน `CLAUDE.md` Known Bugs #11 ตั้งแต่ session 24 แต่ cross-reference ชี้ไปที่ "ISSUE-012" ผิด (เลขนั้นถูกใช้ไปแล้วกับบั๊กคนละเรื่อง — "AI เขียนประเภทบ้านผิด" จาก session 23) และไม่เคยถูกเพิ่มเป็น entry จริงใน `issues-log.md` เลย เพิ่มเป็น ISSUE-014 ตอนนี้เพื่อให้เลขตรงกับที่อ้างถึง

**ปัญหา**: node "Edit Fields" มี fallback `article_slug = ... || 'post'` เวลา AI model ไม่คืนค่า slug มา แต่ node "Publish Guard + Dedupe History" เช็คว่า slug ต้องยาว ≥6 ตัวอักษร — "post" มีแค่ 4 ตัว **ไม่มีทางผ่านได้เลย** (fallback ขัดแย้งกับกฎของตัวเอง) → เดินไปทาง "Blocked Log" ซึ่งไม่มี node ไหน callback กลับ Hub เลย → `content_queue` item + `state.blog` ค้าง "running" ตลอดไป จนกว่า Health Check จะเตือนทาง Telegram (ค้างไป 11+ ชม.ก่อนพบ)

**วิธีตรวจพบ**: เช็ค execution ใน n8n เห็นว่า "Succeeded" ทุก node เขียว (ไม่มี error) — แต่ดูที่ node ไหน**เดินผ่านจริง**ไม่ใช่แค่ดูสถานะรวม พบว่าไปทาง "Blocked Log" ไม่ใช่ "Create a post"

**แก้**: (1) เปลี่ยน slug fallback เป็น chain: slug จากโมเดล → derive จาก title ถ้าสั้นเกิน → `post-<timestamp>` ถ้ายังสั้นอีก (การันตีผ่าน guard เสมอ) (2) เพิ่ม node "Notify Hub Blocked" ต่อจาก Blocked Log ให้ callback กลับ Hub ด้วย `status:"failed"` + `queue_item_id` เสมอ (3) เพิ่ม `queue_item_id` เข้า "Notify Hub Published" ด้วย (เดิมไม่มี ทำให้ item ที่ publish สำเร็จก็ค้าง "running" เหมือนกัน)

**ไฟล์**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (9_queue_sync_fix).json`

**กฎใหม่**: (1) ห้ามตั้ง fallback value ที่สอบตกกฎ validation ที่ตามมาทันที — เช็คทุก fallback เทียบกับทุก guard/validation ที่อยู่ downstream (2) ทุก branch ที่จบ workflow แบบไม่ publish (blocked/error/skip) ต้อง callback กลับ Hub เสมอ ห้ามจบเงียบๆ — ไม่งั้น state ค้างและไม่มีใครรู้จนกว่า Health Check จะจับได้

**ดู**: `CLAUDE.md` Known Bugs #11, `docs/HANDOFF.md` session 24

---
