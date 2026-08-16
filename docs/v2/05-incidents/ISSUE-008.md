## ISSUE-008 — WF1 "Message a model1" ไม่มี retryOnFail → OpenAI transient 500 พัง blog run ทั้ง run
**Date**: 2026-07-05  
**Severity**: Medium  
**Status**: Resolved ✅ **verified in production เดียวกันวันนี้**

**Symptoms**: n8n execution ล้มที่ node "Message a model1" (article generation, `gpt-4o-mini`, `@n8n/n8n-nodes-langchain.openAi`) — error `500 server_error` จาก OpenAI ตรงๆ (ไม่ใช่ปัญหา credential/prompt) เวลา 09:00:36 น. 5 ก.ค. 2026

**Root cause**: node นี้เป็น AI call เดียวใน WF1 ที่สร้างเนื้อหาบทความหลัก — ตรวจ JSON แล้วพบว่า**ไม่มี `retryOnFail` ตั้งไว้เลย** ต่างจาก WF2 (`Upload Media to WordPress`, `PATCH WP Post Featured Image`, `Notify Hub Image Done` มี `retryOnFail:true, maxTries:2, waitBetweenTries:5000` ครบ) และ Queue Auto-run ที่มี retry config อยู่แล้ว — เอกสาร CLAUDE.md Wave 13 (May 31) เคยเขียนว่า "n8n Queue Auto-run + WF1 + WF2 — Retry On Fail: 2, Wait: 5000ms set แล้ว" แต่ตรวจไฟล์ JSON จริงพบว่า **WF1 ไม่เคยมี retry config นี้จริง** — เอกสารผิดมาตั้งแต่ Wave 13

**Fix**: เพิ่ม `retryOnFail:true, maxTries:2, waitBetweenTries:5000` ให้ node "Message a model1" ใน `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (8_wb_fix).json` ให้ตรงกับ pattern ของ WF2 — **ยังไม่ได้ import เข้า n8n จริง ต้อง import ไฟล์ใหม่ทับ workflow ที่ active อยู่**

**Bonus finding**: WF2 node "Generate an image" มี `maxTries:2, waitBetweenTries:5000` ตั้งไว้แต่ `retryOnFail:false` (ปิดอยู่จริง) — น่าจะเป็นความตั้งใจเดิมที่ไม่ต้องการ retry การ generate รูป (ทำให้เปลืองเงินซ้ำถ้า prompt มีปัญหา) แต่ยังไม่ยืนยันกับ Archi — ทิ้งไว้เป็น pending ให้เช็คทีหลัง ไม่แตะตอนนี้

**Lesson**: อย่าเชื่อว่า CLAUDE.md/docs อธิบายสถานะ workflow ถูกต้อง 100% — ตรวจ JSON node property จริงเสมอก่อนสรุปว่า retry/error-handling ถูกตั้งค่าไว้แล้ว โดยเฉพาะ node ที่เรียก external API (OpenAI, WordPress) ซึ่งเสี่ยง transient failure สูง

**Full incident timeline (2026-07-05):**
1. 09:00 — "Message a model1" hit OpenAI 500, workflow died silently (no callback to Hub) → `blog.status` ค้างที่ `running` ไม่มีวันจบเอง
2. Health Check แจ้งเตือนซ้ำ 3 ครั้ง (55 / 85 / 115 นาที) ผ่าน Telegram — ตรงตามที่ระบบควรทำ
3. Archi import ไฟล์ JSON ที่แก้ retryOnFail เข้า n8n แทนตัวเก่า + archive workflow เก่าทิ้ง (ตาม governance rule — ห้าม 2 workflow แย่ง webhook เดียวกัน)
4. เจอว่า content_queue มี 3 รายการ (07-03, 07-04, 07-05) ล้วนโชว์ `status:"running"` ทั้งที่ 07-03/07-04 เผยแพร่สำเร็จไปแล้วจริง (ยืนยันจาก `lastSuccessfulKeyword`) — เป็นบั๊กแยกต่างหาก ไม่ใช่ตัวเดียวกับที่ค้างจริง (ดู ISSUE-009)
5. แก้ด้วย `POST /action/blog/queue/clear` แล้ว `POST /action/blog/queue/build` ใหม่เฉพาะ 07-05 ถึง 07-09 (ไม่เอา 07-03/07-04 ที่เผยแพร่แล้วกลับเข้าคิว กันโพสต์ซ้ำ)
6. สั่ง `POST /action/blog/queue/run-next` ทันทีเพื่อรัน 07-05 ผ่าน workflow ตัวใหม่ (มี retryOnFail แล้ว)
7. ✅ ยืนยันสำเร็จ — `blog.status` เป็น `completed`

**Remaining housekeeping (not urgent)**: ไฟล์ local `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (8_wb_fix).json` ถูกแก้ในไฟล์เดิมโดยตรง (in-place) แทนที่จะสร้างไฟล์เวอร์ชันใหม่ตาม naming convention ใน AI_TEAM.md section 12 (ควรเป็น `(9_retry_fix).json`) — เบี่ยงเบนจาก convention เล็กน้อย ไม่กระทบการทำงานจริงเพราะ n8n import แล้ว ใช้งานได้ปกติ แต่ควรตั้งชื่อไฟล์ใหม่ให้ถูกต้องภายหลังเพื่อความสะอาดของ repo

---
