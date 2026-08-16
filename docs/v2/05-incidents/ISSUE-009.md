## ISSUE-009 — content_queue item status ไม่เคยอัปเดตเป็น "completed" แม้เผยแพร่สำเร็จจริง
**Date**: 2026-07-05  
**Severity**: Low (cosmetic — ไม่กระทบการเผยแพร่จริง)  
**Status**: Open — พบระหว่างแก้ ISSUE-008 ยังไม่ได้แก้

**Symptoms**: `content_queue` items ของ 07-03 และ 07-04 ยังโชว์ `"status": "running"` ทั้งที่บทความเผยแพร่สำเร็จไปแล้วจริง (ยืนยันจาก `blog.lastSuccessfulKeyword` ที่ตรงกับ keyword ของ 07-04)

**Root cause**: ยังไม่ได้ตรวจโค้ด — สงสัยว่า Hub อัปเดตแค่ top-level `blog.status`/`lastSuccessfulKeyword` ตอนเสร็จงาน แต่ไม่ได้วนกลับไปแก้ `status` ของ item ที่ตรงกันใน `content_queue` array

**Impact ตอนนี้**: ต่ำ — ไม่กระทบการเผยแพร่จริง แต่ทำให้ดู `/api/state` แล้วเข้าใจผิดว่างานค้างอยู่ (เป็นสาเหตุที่ทำให้ session นี้ต้องเสียเวลาแยกแยะว่าอันไหนค้างจริงอันไหนแค่โชว์ผิด)

**Fix ที่แนะนำ (ยังไม่ทำ)**: หา code ใน Hub v1 (`server.cjs`) ที่ handle callback สำเร็จ (`/webhook/n8n`) แล้วเพิ่ม logic อัปเดต `content_queue` item ที่ตรง `runId` ให้เป็น `status:"completed"` ด้วย ไม่ใช่แค่ top-level state

---
