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
