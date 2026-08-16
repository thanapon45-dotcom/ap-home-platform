## ISSUE-002 — Sandbox git add truncates files
**Date**: 2026-06-30  
**Severity**: Critical  
**Status**: Active bug (workaround documented)

**Symptoms**: หลัง Claude รัน `git add` ใน sandbox → commit มี "46 deletions" ผิดปกติ → TypeScript build fail ใน Railway

**Root cause**: Sandbox mount มี cache lag — file ที่ Edit tool เขียนลง Windows filesystem ยังไม่ reflect ใน sandbox mount ตอนรัน `git add`

**Workaround**: Claude รัน `git add` ใน sandbox ไม่ได้ → **user ต้องรัน git add/commit/push จาก Windows PowerShell เท่านั้น**

**Commit ที่เจอปัญหา**: `7c8ee74` (truncated) → fixed by `856683d`

---
