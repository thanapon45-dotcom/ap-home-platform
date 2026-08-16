## ISSUE-016 — AI Content Studio (FB post) ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ — 2 root cause ซ้อนกัน
**Date**: 2026-07-20 (session 27)
**Severity**: Medium (เนื้อหาที่จะโพสต์จริงเข้า Facebook อาจผิดไวยากรณ์/สื่อความหมายผิด ถ้าไม่ตรวจก่อนโพสต์ — ยังไม่ใช่ data loss หรือ production down)
**Status**: Resolved ✅

**อาการ**: Archi ส่ง FB post ที่ generate จาก AI Content Studio (KeywordTab, โทน 3T, กลุ่มลูกค้า "ที่ปรึกษา/ตรวจสอบงานก่อสร้าง") มาให้ตรวจ พบ hashtag สุดท้ายตัดกลางคำ (`#ความมั่นใ`) และคำเพี้ยนกลางประโยค (`ถามผู้รับเหมาก็ไม่วัใจ` — ที่ถูกคือ "วางใจ") พร้อม hook ที่ผสมภาษาของกลุ่มลูกค้าคนละกลุ่มปนกัน (ภาษา "ฝากขายบ้าน" ปนเข้ากับ fear ของกลุ่ม "ตรวจสอบงานก่อสร้าง")

**Root cause**: 2 อย่างซ้อนกัน ไม่ใช่จุดเดียว —
1. `callClaude()` helper ส่ง `maxTokens: 800` fixed แต่เนื้อหา FB post ที่ต้องการ (~220 คำภาษาไทย + hashtag 6-8 อัน) ใช้ output token มากกว่านั้นมาก เพราะภาษาไทย tokenize หนักกว่าอังกฤษหลายเท่า → โดนตัดกลางประโยค/hashtag เสมอเมื่อเนื้อหายาว
2. `KeywordTab.generate()` (จุด generate FB post หลักที่ใช้บ่อยที่สุด) เรียก `callClaude(system, prompt)` โดยไม่ระบุ `model` → หลุดไปใช้ default `claude-haiku-4-5-20251001` ทั้งที่ `BlogConvertTab`/`ListingTab` ใช้ `"claude-sonnet-4-6"` อยู่แล้วตามคอมเมนต์ในโค้ดเองว่า Sonnet คุณภาพภาษาไทยดีกว่า — Haiku ภายใต้ system prompt ที่ซับซ้อนหนาแน่นผลิตคำเพี้ยน/ตัดพยางค์ได้แม้ไม่ชนขีดจำกัด token เลย

**วิธีตรวจพบ**: อ่าน output ที่ Archi วางมาอย่างละเอียด แยกวิเคราะห์ตำแหน่งคำที่ผิด — ท้ายข้อความ (hashtag ตัด) ชี้ไปที่ truncation/maxTokens ส่วนคำเพี้ยนกลางประโยคชี้ไปที่ model quality (truncation ตัดได้แค่ท้ายสุดของ generation เท่านั้น ไม่ใช่กลางประโยค) — แยกแก้ทั้ง 2 สาเหตุแทนที่จะแก้จุดเดียวแล้วคิดว่าจบ

**แก้**: (1) `callClaude()` default `maxTokens` 800→2000 ให้ตรงกับ cap ของ `route.ts` (2) `KeywordTab.generate()` เปลี่ยนเป็น `callClaude(system, prompt, "claude-sonnet-4-6")` ให้ตรงกับอีก 2 tab

**กฎใหม่**: เนื้อหาภาษาไทยที่จะโพสต์จริง (user-facing) ต้องใช้ Sonnet เป็นค่าเริ่มต้นเสมอ ไม่ใช่ Haiku — Haiku เก็บไว้ใช้กับงานที่ไม่ใช่ผู้ใช้ปลายทางเห็นโดยตรง (เช่น image concept generation ภาษาอังกฤษสั้นๆ) ก่อนเพิ่ม `generate()` function ใหม่ที่เรียก `callClaude()` ต้องเช็ค default model ให้ตรงตามนี้เสมอ

**ดู**: `docs/decisions.md` ADR-012, `CLAUDE.md` Known Bugs #13

---
