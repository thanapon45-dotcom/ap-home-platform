## ISSUE-010 — Market Intel v2: Claude Haiku response truncated mid-JSON บน production post จริงที่ยาว/ละเอียด
**Date**: 2026-07-08 (พบระหว่าง Post-Deployment Monitoring ของ ADR-005 Stage 2 — ตรงตาม Outstanding Risk ที่ report เขียนไว้ล่วงหน้า)
**Severity**: High (data loss — โพสต์จริงไม่ถูกบันทึก)
**Status**: Resolved ✅ **verified บน production ด้วยโพสต์จริง 3 รายการติดต่อกันหลังแก้**

**Symptoms**: Telegram แจ้ง error "Market Intelligence Error (v2 test)" พร้อม `Expected ',' or '}' after property value in JSON at position 2346` บนโพสต์ขายบ้านจริง (#ขายบ้าน พฤกษา 8 ซอย 18 — มีรายละเอียดของแถม/ขนาด/โปรโมชันเยอะ)

**Root cause**: `raw_model_text_debug` (debug field ที่เพิ่มไว้ตั้งแต่ Phase 4.1a เพื่อ diagnose เคสแบบนี้โดยเฉพาะ) แสดงว่า response ของ Claude Haiku **ถูกตัดกลางคำจริง** — `"rubric_note": "การสูญเสียรายรับเพื่อให้ได้ผู้ซื้อและปิ` (คำว่า "ปิดการขาย" ขาดหาย) — `maxTokens:1600` (ค่าที่ตั้งไว้ตั้งแต่ Phase 4.1a หลังเจอปัญหาเดียวกันแบบเบากว่าตอน dry run) ไม่พอสำหรับโพสต์ที่มีรายละเอียดเยอะ เพราะ prompt สั่งให้ Claude ใส่ evidence array + rubric_note ยาวสำหรับทั้ง 8 signal key ต่อโพสต์ ยิ่งโพสต์ยาว/ซับซ้อน model ยิ่งเขียนตอบยาวตาม

**Fix**: เพิ่ม `maxTokens` จาก 1600 → 3000 (ประมาณ 2 เท่าของจุดที่โดนตัด เผื่อ headroom) ใน `this.helpers.request` body ของทั้ง 2 Parse node (`🤖 FB: Normalize + Parse`, `🤖 Manual: Normalize + Parse`) — ให้ user copy-paste โค้ดเต็มทั้ง 2 node แทนการแก้แบบ positional ตามที่ user ขอไว้ตั้งแต่ต้น session

**Verification**: หลังแก้ ทดสอบด้วยโพสต์จริง 3 รายการติดต่อกันผ่าน production Manual Input webhook — ทั้งหมดบันทึกสำเร็จ (`content_frames.id=87,88,89`), 2 ใน 3 รันใช้เวลานานผิดปกติ (25.9s, 30.5s เทียบกับ ~11s ของรันปกติ) ยืนยันว่าเป็นการ generate ยาว/ละเอียดจริง ไม่ใช่แค่ post สั้นๆที่บังเอิญผ่าน — ไม่มี `raw_model_text_debug` โผล่อีกเลย, ทุก signal key ครบ 9 ตัว, `urgency`/`seller_motivation` ยังคง distinct evidence ตามกฎเดิม

**Fail-safe ที่ทำงานถูกต้องอยู่แล้ว (ไม่ต้องแก้)**: `parse_ok:false` เมื่อ parse fail, error routed ไป `❌ Telegram: Error`, ไม่มีการเขียนข้อมูลผิดพลาดลง Supabase เลย, `normalizeSignal()` ให้ default ปลอดภัยทุก field — ระบบ fail-safe ทำงานตามที่ออกแบบไว้ 100% ปัญหาจริงคือ "โพสต์นั้นหายไป" ไม่ใช่ "ข้อมูลผิดถูกบันทึก"

**Lesson**: token limit ที่ปรับจาก mocked/scripted test cases (สั้น จำกัด) ไม่การันตีว่าพอสำหรับ organic production traffic จริงที่หลากหลายกว่ามาก — ต้องเผื่อ headroom กว้างกว่าที่ dry run บ่งชี้ไว้ (2x ไม่ใช่ 1.1x) และ debug field แบบ `raw_model_text_debug` ที่เตรียมไว้ล่วงหน้าตั้งแต่ Phase 4.1a ทำให้ diagnose ปัญหานี้ได้ในไม่กี่นาทีแทนที่จะต้องเดา — คุ้มค่าที่เตรียมไว้ก่อน

**Related**: `docs/decisions.md` ADR-005, `docs/ADR/2026-07-08-market-intel-v2-stage2-production-cutover-report.md` (Outstanding Risks section ที่ระบุความเสี่ยงนี้ไว้ล่วงหน้าก่อนเกิดจริง)

---
