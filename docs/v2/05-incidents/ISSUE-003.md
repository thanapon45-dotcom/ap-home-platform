## ISSUE-003 — Emoji corrupt ใน TypeScript template literal
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Resolved ✅

**Symptoms**: `server.ts(183,28): error TS1160: Unterminated template literal`

**Root cause**: Emoji `🖼️` ใน template literal ถูก encode ไม่ถูกต้องผ่าน sandbox mount → TypeScript compiler ตีความผิด

**Fix**: แทน emoji ด้วย plain text `[Image]` ใน server.ts

**Rule**: ห้ามใช้ emoji ใน TypeScript files ที่ Claude edit ผ่าน Cowork

---
