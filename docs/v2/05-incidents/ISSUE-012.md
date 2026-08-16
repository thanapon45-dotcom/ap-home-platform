## ISSUE-012 — ListingTab AI เขียนประเภทบ้านผิด ("บ้านเดี่ยว" ทั้งที่ทรัพย์จริงเป็นทาวน์เฮ้าส์)
**Date**: 2026-07-11 (session 23 ต่อ, พบทันทีหลังแก้ ISSUE-011 เสร็จ — โพสต์แรกที่ทดสอบจริง)
**Severity**: Medium (เนื้อหาโพสต์ผิดข้อเท็จจริง กระทบความน่าเชื่อถือ ไม่ใช่ระบบล่ม)
**Status**: **RESOLVED 2026-07-11** — root cause คือ data entry ผิดใน WordPress ไม่ใช่บั๊กโค้ด (prompt fix ที่ทำไปยังมีประโยชน์เป็น safety net แต่ไม่ใช่ตัวแก้จริง)

**Symptoms**: โพสต์ "หมู่บ้านสวนทองวิลล่า7 ลำลูกกา คลอง 4" ที่ user ยืนยันว่าเป็น**ทาวน์เฮ้าส์** แต่เนื้อหาที่ AI สร้างเขียนว่า "บ้านเดี่ยว 2 ชั้น ใน..." — ผิดประเภททรัพย์ แม้หลัง deploy prompt fix (commit `29070b7`) แล้วก็ยังเขียนผิดเหมือนเดิม

**Root cause ที่แท้จริง**: `property_type` ที่ Hub v1 ส่งมา (`server.cjs` → `getTaxTerm("property_type")` บรรทัด 1656) ดึงมาจาก **WordPress taxonomy term ของโพสต์นั้นๆ ตรงๆ** — user เช็ค WP admin แล้วยืนยันว่าโพสต์นี้ติด taxonomy term **"บ้านเดี่ยว" ผิดประเภทมาตั้งแต่ต้น** (data entry error ตอนสร้างโพสต์ใน WordPress) ไม่เกี่ยวกับ prompt/AI เลย — AI เขียนตาม data ที่ได้รับมาถูกต้องแล้ว เพียงแต่ data ต้นทางผิด

**สิ่งที่แก้ไปก่อนหน้า (ยังคงประโยชน์)**: prompt rule ใหม่ใน `components/AIContent.tsx` (commit `29070b7`) ที่บังคับให้ AI ใช้ `property_type` ตรงตามที่ระบุเป๊ะๆ — ไม่ใช่ตัวแก้ปัญหานี้โดยตรง แต่ป้องกันไม่ให้ AI hallucinate เพิ่มเติมในกรณีอื่นที่ data ถูกต้อง ควรเก็บไว้

**Fix จริง**: user แก้ taxonomy term ในโพสต์ WordPress จาก "บ้านเดี่ยว" → "ทาวน์เฮ้าส์" โดยตรงผ่าน WP admin

**Lesson**: เวลาบั๊กเนื้อหาแบบนี้เกิดซ้ำหลัง fix โค้ดแล้ว ต้องไล่เช็คต้นทางข้อมูลจริง (WordPress taxonomy ในกรณีนี้) ก่อนจะสันนิษฐานว่าเป็นบั๊ก AI/prompt เสมอ — ควรพิจารณาเพิ่ม validation หรือ warning ใน ListingTab UI ในอนาคตถ้าพบว่า field สำคัญ (property_type, price) ว่างเปล่าหรือดูผิดปกติ เพื่อลดความเสี่ยงจาก data entry error ที่ WP source

---
