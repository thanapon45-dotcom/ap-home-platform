## ISSUE-017 — OS Dashboard `useLiveData()` ยิง Hub v1 ตรงจาก browser ไม่ผ่าน proxy → dashboard แสดง MOCK ค้างตลอดกาล
**Date**: 2026-07-23 (session 30)
**Severity**: Medium (ไม่ใช่ data leak — แต่ dashboard หลักที่ Archi ใช้ดูสถานะ FB/Blog engine ทุกวัน แสดงตัวเลขปลอมมาตลอดโดยไม่มีใครรู้)
**Status**: Resolved ✅ — push แล้ว (commit `85e964d`), verify deploy ผ่าน Vercel `list_deployments` ตรง commit จริง (`dpl_EvzvQdvpDATq14jWsrHKajLeipGJ`, `READY`) — ปิดครบ ไม่มีจุดค้าง

**อาการ**: หน้า `/dashboard` (OS Dashboard, tab Overview) โชว์ป้าย "🔴 OFFLINE — แสดงข้อมูล MOCK" ตลอดเวลา และการ์ด FB/Blog Engine (Queue, Drafts, Published, Failed) โชว์ตัวเลขเดิมซ้ำๆ ไม่เคยขยับเลย (queue 8/12, published 2/3 เป็นต้น) — พบระหว่างงานคนละเรื่อง (กำลังตรวจ data-flow graph ให้ตรงกับโค้ดจริง ดู ADR-024)

**Root cause**: `components/DashboardOS.tsx`'s `useLiveData()` hook (poll ทุก 10 วิ) เขียนไว้ว่า `fetch(\`${NEXT_PUBLIC_HUB_URL}/api/state\`)` — ยิงตรงจาก browser เข้า Hub v1 บน Railway โดยไม่แนบ header `x-hub-token` เลย ขัดกับกฎ security ที่เขียนไว้เองใน CLAUDE.md ("ห้าม call Railway URL โดยตรงจาก client-side / Next.js browser code") — ตรวจ `services/backend-hub/server.cjs` (บรรทัด 578-593) ยืนยันว่า Hub v1 มี middleware เช็ค `x-hub-token` ครอบ**ทุก route ยกเว้น `/health*`** ดังนั้น fetch นี้โดน `401 Unauthorized` **ทุกครั้งไม่มีข้อยกเว้น** ตั้งแต่วันแรกที่เขียนโค้ดนี้ — เพราะ error ถูก `catch` แล้วเรียกแค่ `setLive(false)` โดยไม่เคยเรียก `setData()` เมื่อ fail เลย ตัวแปร `data` เลยค้างอยู่ที่ค่า `MOCK` เริ่มต้นตลอดไป

**สำคัญ — ไม่ใช่ data leak จริง**: เพราะ 401 บล็อกได้จริง ไม่มีข้อมูล Hub จริงสักครั้งที่หลุดออกมาถึง browser ทางเส้นทางนี้ สิ่งที่ "เปิดเผย" มีแค่ hostname Railway (ซึ่งก็โผล่เป็น plain text อยู่แล้วในหน้า Blog Runner: `Poll: 5s · Hub: {HUB}`) — ผลกระทบจริงคือ **functional bug** (dashboard แสดงข้อมูลปลอม) ไม่ใช่ security incident

**วิธีตรวจพบ**: Archi ขอ "ประเมินก่อน" แทนที่จะให้แก้ทันทีตอนเจอครั้งแรก (ตอนแรก flag ไว้แค่ว่าเป็น "security deviation" ในกราฟ) → ตรวจลึกกว่านั้นด้วยการอ่าน `server.cjs` auth middleware จริง + อ่าน `useLiveData()` เต็มฟังก์ชันผ่าน subagent เพื่อดู error handling และผลกระทบ UI จริง แทนการเดาจากแค่เห็น URL ตรงๆ ในโค้ด — ทำให้ได้ severity ที่แม่นกว่า (medium functional bug ไม่ใช่ security incident)

**แก้**: เปลี่ยน `useLiveData()` ให้เรียก `/api/blog/state` (proxy ที่มีอยู่แล้ว ใช้งานจริงโดย `Marketing.tsx`, ใส่ `x-hub-token` ฝั่ง server ถูกต้อง) แทนยิง Railway ตรง + เพิ่มเช็ค `json?.error` เพราะ route นี้คืน `200 + {error}` เวลา Hub fail แทน non-2xx status (ถ้าไม่เช็คจุดนี้ `r.ok` จะเป็น true เสมอแม้ Hub ล่มจริง) — ก่อนแก้ตรวจ `baseState()`/`normalizeState()` ใน `server.cjs` เทียบ field ที่โค้ดใช้จริง (`blog`, `fb`, `alerts` มี `?? []` กันไว้แล้ว, `leads` ไม่ได้อ่านจาก state นี้เลย) ยืนยันว่าไม่มีความเสี่ยงพังจาก field ที่ state จริงไม่มี (Hub state ไม่มี `leads`/`alerts` เลย มีแค่ `system/blog/fb/history/content_queue/fb_queue`)

**กฎใหม่**: เวลาเจอ pattern "browser ยิง external URL ตรง" ต้องเช็คว่า endpoint ปลายทางมี auth guard จริงไหมก่อนตัดสิน severity — ถ้ามี auth guard จริงและ request ไม่มี token แนบมา แปลว่าโอกาสสูงว่าเป็น "ฟีเจอร์พังเงียบๆ" ไม่ใช่ "รูรั่วความปลอดภัย" (คนละ severity คนละวิธีแก้) ต้องอ่าน error handling code จริงเพื่อดูว่า error ถูกจัดการยังไงก่อนสรุป ไม่ใช่เดาจาก URL อย่างเดียว

**ดู**: `docs/decisions.md` ADR-024, `CLAUDE.md` Known Bugs (ใหม่), security constraint เดิม ("ห้าม call Railway URL โดยตรงจาก client-side")
