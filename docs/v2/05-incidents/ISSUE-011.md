## ISSUE-011 — ListingTab "Post to Facebook" คืน HTTP 500 แม้เปลี่ยน token ใหม่แล้ว
**Date**: 2026-07-10/11 (session 23)
**Severity**: High (ฟีเจอร์หลักใช้ไม่ได้)
**Status**: **RESOLVED 2026-07-11 (session 23 ต่อ)** — โพสต์ผ่านจริงแล้ว ยืนยันจาก user (screenshot ปุ่มขึ้น "✅ โพสต์แล้ว!" และเห็นโพสต์บน Facebook จริง)

**Root cause ที่แท้จริง (ไม่ใช่ token)**: `FB_BACKEND_URL` env var **ไม่เคยถูกตั้งค่าใน Vercel project เลย** (คนละที่จาก Railway `easygoing-friendship` env vars ที่เคยเช็คแล้ว) — `app/api/fb/publish/route.ts` เช็ค `if (!FB_BACKEND)` แล้ว return `{ok:false, error:"FB_BACKEND_URL not configured"}` ที่ status 500 ทันทีโดยไม่เคยยิง fetch ไป Railway เลยด้วยซ้ำ — เพราะงั้น token ที่เปลี่ยนไปหลายรอบก่อนหน้าไม่มีผลอะไรกับปัญหานี้เลย

**วิธี diagnose ที่ได้ผลจริง (แทนการง้อ browser DevTools)**:
1. เพิ่ม `console.error` ใน `route.ts` (ไม่ช่วย — Vercel `get_runtime_logs` ไม่จับ console output แยก เห็นแค่ summary line `POST ... 500`)
2. **วิธีที่ได้ผลจริง**: แก้ `ListingTab.postToFacebook()` ให้เก็บ `data.error` ลง state แล้วโชว์เป็นข้อความสีแดงใต้ปุ่มใน UI ตรงๆ — เจอข้อความ `"FB_BACKEND_URL not configured"` ทันทีโดยไม่ต้องพึ่ง DevTools เลย → ชี้ตรงไปที่ env var ที่หายไป
3. เพิ่ม `FB_BACKEND_URL=https://easygoing-friendship-production-e663.up.railway.app` ใน Vercel Environment Variables (Production + Preview) → redeploy → ผ่านทันที

**Lesson**: เวลา proxy route คืน error, ต้องเช็คก่อนว่า error message มาจาก "proxy เอง" (เช่น env var validation) หรือมาจาก "upstream service จริง" — ทั้งสองแบบคืน status 500 เหมือนกันแต่ root cause ต่างกันคนละเรื่อง การโชว์ error message จริงใน UI (แทนที่จะซ่อนไว้แล้วโชว์แค่ "❌ ผิดพลาด") ทำให้ diagnose ได้เร็วกว่าการไล่ browser DevTools มาก — ควรทำแบบนี้กับทุก proxy route ที่มี env var dependency

**Symptoms**: กดปุ่ม "Post to Facebook" ใน ListingTab (`components/AIContent.tsx`) → UI แสดง "❌ ผิดพลาด" — เกิดซ้ำ 2 ครั้งคนละวัน รวมถึงหลังเปลี่ยน `FB_PAGE_ACCESS_TOKEN` เป็นค่าใหม่แล้ว

**สิ่งที่ตรวจไปแล้วและ "ไม่ใช่" สาเหตุ (ตัดออกแล้ว)**:
- ไม่ใช่ STUB mode — `/health` ยืนยัน `fb_configured:true`, `page_id` ตรง `107645087471724`
- ไม่ใช่ token เก่าหมดอายุ — เดิน user ผ่าน Graph API Explorer เต็มกระบวนการ (short-lived → 60-day long-lived → derived Page token จาก `/me/accounts`) ใส่ Railway env var ใหม่แล้ว redeploy แล้ว → **ยังพัง 500 เหมือนเดิม**

**Root cause**: **ยังไม่ทราบ** — diagnostic path ที่มีอยู่ตันหมด:
1. Vercel `get_runtime_logs` เห็นแค่ `POST /api/fb/publish 500` (status code, ไม่มี body) เพราะ `app/api/fb/publish/route.ts` proxy status ต่อจาก FB-backend ตรงๆ ไม่มี `console.error` log body
2. sandbox `curl` ตรง Railway host โดน network allowlist บล็อก (exit code 56) — ยิง authenticated request จาก sandbox ไม่ได้
3. user ส่ง browser **Console tab** มาให้ 2 รอบ (ไม่ใช่ Network tab) — มีแต่ noise ไม่เกี่ยวข้อง (MozBar, LaunchDarkly, CORS บน `/api/state`, RSC prefetch fail) ไม่มี error body จริงจาก `/api/fb/publish` เลย

**สิ่งที่ต้องทำต่อ (ตอนเปิด session ใหม่)**: ขอ user เปิด browser DevTools → แท็บ **Network** (ไม่ใช่ Console) → กด Post to Facebook → คลิกแถว `publish` (สีแดง, 500) → แท็บ **Response/Preview** → คัดลอก JSON เต็ม (`{"ok":false,"error":"..."}`) มาให้ก่อน — ห้ามเดา fix โดยไม่มี error body จริง (อาจเป็น permission/scope ไม่พอ, ต้อง Business Verification, malformed request payload ใน `postToFacebook()`, หรือ Graph API reject ด้วยเหตุผลอื่น)

**Files ที่เกี่ยวข้อง**: `app/api/fb/publish/route.ts` (Next.js proxy, ยิงตรง `FB_BACKEND_URL`) → `services/fb-backend/server.js` (`postToFacebook()` เรียก Graph API จริง `graph.facebook.com/{version}/{PAGE_ID}/photos\|feed`) — **คนละ code path** จาก Hub v1's `/action/fb/publish` ใน `server.cjs` (ที่มี `withRetry` + state write + Telegram alert) ซึ่ง ListingTab ไม่ได้เรียกใช้เลย

**Lesson (ชั่วคราว จนกว่าจะแก้จบ)**: อย่า assume ว่า token คือสาเหตุเสมอเวลา FB API คืน error — ต้องดู error body จริงก่อน ไม่งั้นเสียเวลาไล่ผิดทาง (รอบนี้เสีย 1 รอบเต็มไปกับการขอ token ใหม่ที่สุดท้ายไม่ใช่ตัวแก้)

---
