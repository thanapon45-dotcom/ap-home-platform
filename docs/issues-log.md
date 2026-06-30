# Issues Log

---

## ISSUE-001 — Vercel proxy 404 on /api/blog/queue/run-next
**Date**: 2026-06-30  
**Severity**: Critical  
**Status**: Resolved ✅

**Symptoms**: `POST https://ap-home-platform.vercel.app/api/blog/queue/run-next` → 404 `Route not found`

**Root cause**: `HUB_URL` env var = `https://exciting-creativity-production-4b85.up.railway.app/api`  
route.ts ต่อ path เพิ่ม → `https://.../api/api/blog/queue/run-next` → Hub v2 global 404

**Fix**: เพิ่ม URL normalization ใน route.ts:
```typescript
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
```

**Commit**: `a0de659`

**Lesson**: อย่า assume ว่า env var format ถูกต้อง ให้ normalize ใน code เสมอ

---

## ISSUE-002 — Sandbox git add truncates files
**Date**: 2026-06-30  
**Severity**: Critical  
**Status**: Active bug (workaround documented)

**Symptoms**: หลัง Claude รัน `git add` ใน sandbox → commit มี "46 deletions" ผิดปกติ → TypeScript build fail ใน Railway

**Root cause**: Sandbox mount มี cache lag — file ที่ Edit tool เขียนลง Windows filesystem ยังไม่ reflect ใน sandbox mount ตอนรัน `git add`

**Workaround**: Claude รัน `git add` ใน sandbox ไม่ได้ → **user ต้องรัน git add/commit/push จาก Windows PowerShell เท่านั้น**

**Commit ที่เจอปัญหา**: `7c8ee74` (truncated) → fixed by `856683d`

---

## ISSUE-003 — Emoji corrupt ใน TypeScript template literal
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Resolved ✅

**Symptoms**: `server.ts(183,28): error TS1160: Unterminated template literal`

**Root cause**: Emoji `🖼️` ใน template literal ถูก encode ไม่ถูกต้องผ่าน sandbox mount → TypeScript compiler ตีความผิด

**Fix**: แทน emoji ด้วย plain text `[Image]` ใน server.ts

**Rule**: ห้ามใช้ emoji ใน TypeScript files ที่ Claude edit ผ่าน Cowork

---

## ISSUE-004 — Railway ไม่ auto-deploy หลัง git push
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Workaround documented

**Symptoms**: git push สำเร็จ แต่ Railway ยังรัน code เก่า → smoke test ยังได้ NOT_FOUND

**Root cause**: Railway GitHub integration ไม่ trigger auto-deploy ในบางกรณี

**Workaround**: เปิด Railway dashboard → กด Redeploy ด้วยตนเอง

**Detection**: ตรวจ Railway build logs timestamp vs git push timestamp
