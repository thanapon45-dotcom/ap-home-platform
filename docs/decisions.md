# Architecture Decisions Log

---

## ADR-001 — Hub v2 URL normalization ใน Vercel proxy
**Date**: 2026-06-30  
**Status**: Implemented ✅

**Context**: `HUB_URL` env var ใน Vercel มี `/api` ต่อท้าย ทำให้ proxy สร้าง double path `/api/api/blog/...` → 404

**Decision**: Normalize `HUB_URL` ใน `route.ts` ด้วย `.replace(/\/api\/?$/, "")` แทนการแก้ env var อย่างเดียว เพราะ env var อาจถูกแก้ผิดในอนาคต code ควร idempotent

**Files**: `app/api/blog/queue/run-next/route.ts`

---

## ADR-002 — เพิ่ม /webhook/image-done ใน Hub v2
**Date**: 2026-06-30  
**Status**: Implemented ✅

**Context**: WF2 ส่ง image callback ไปที่ Hub v1 URL (`/webhook/image-done`) แต่ Hub v2 ไม่มี endpoint นี้ ถ้าเปลี่ยน URL ใน WF2 ตรงๆ จะได้ 404

**Decision**: เพิ่ม `POST /webhook/image-done` ใน Hub v2 พร้อม auth `requireHubSecret` แทน Hub v1 ที่ไม่มี auth

**Side effects**:
- เพิ่ม image fields ใน `HubStateData.blog` type (optional)
- เพิ่ม `setImageDone()` ใน StateManager
- อัปเดต WF2 JSON: URL + header name (`x-hub-token` → `x-hub-secret`)

**Files**: `IStateRepository.ts`, `StateManager.ts`, `server.ts`, `WF2 (5_hub_v2).json`

---

## ADR-003 — ไม่ใช้ emoji ใน TypeScript template literals
**Date**: 2026-06-30  
**Status**: Active rule ✅

**Context**: emoji (เช่น 🖼️) ใน template literal ของ server.ts ถูก corrupt ผ่าน sandbox mount → tsc รายงาน "Unterminated template literal"

**Decision**: ใช้ plain text แทน emoji ทุกครั้งใน server-side TypeScript files ที่ Claude edit

**Rule**: แทน `🖼️ Image patched` → `[Image] patched`
