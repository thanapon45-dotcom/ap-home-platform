## ISSUE-005 — Hub v2 cutover reverted: fb/blog queue routes ไม่มี implement จริง
**Date**: 2026-07-01 (session 18)  
**Severity**: Critical  
**Status**: Resolved via revert ✅ (ของจริงยังค้างใน Hub v2 Remaining tasks)

**Symptoms**: หลังเปลี่ยน `HUB_URL` ไปชี้ Hub v2 + path `/api/blog/queue/*` + header `x-hub-secret` (ตาม ADR-001/002) → ทุก queue request ได้ 404 ทั้งที่ path/header ถูกต้องแล้ว

**Root cause**: Hub v2 backend สร้างไปไกลกว่าที่คิด (AiGateway, BlogUseCase, QcUseCase, HealthMonitor, StateManager, EventBus มีจริงเกือบหมด) **แต่ `fbRoutes.ts` มีแค่ `/api/fb/publish` + `/api/fb/state` — ไม่มี `/api/fb/queue/{build,clear,run-next}` เลย** (blog มีครบ, fb ไม่มี)

**Fix**: Revert `HUB_URL` (Vercel) กลับไป Hub v1 ทันที ยืนยันแล้วว่าใช้งานได้ Jul 1

**Lesson**: ก่อน cutover ครั้งต่อไป ต้องยิง request จริงทดสอบทุก route ที่ Dashboard/n8n เรียกใช้บน Hub v2 ให้ผ่านหมดก่อน — ห้าม assume ว่า route "น่าจะมี" เพราะ module อื่นมีครบแล้ว

**Related**: `docs/decisions.md` ADR-004

---
