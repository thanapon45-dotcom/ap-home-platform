# Business Model — บจก.อาชิดา (Achida Co., Ltd.)

> **Canonical source** สำหรับ company structure, vision, business units, และ intelligence loop ของ AP-Home Platform OS
> ไฟล์อื่น (memory/CLAUDE.md, AI_TEAM.md, context_brief.md) ควร **link มาที่นี่** แทนการ copy เนื้อหาซ้ำ
> อัปเดตล่าสุด: 2026-07-04

---

## Vision

> 🎯 **Develop to "AI-native Human-Centered Real Estate Intelligence Operating System"**

สร้างระบบปฏิบัติการด้านอสังหาริมทรัพย์ที่ขับเคลื่อนด้วย AI โดยมีมนุษย์เป็นศูนย์กลาง เพื่อช่วยให้การซื้อ ขาย สร้าง และลงทุนอสังหาริมทรัพย์มีประสิทธิภาพ โปร่งใส และตัดสินใจได้จากข้อมูลจริง

---

## Core Platform: AP-Home Platform OS

แพลตฟอร์มกลางที่รวบรวม 7 Intelligence Modules เพื่อสร้างฐานข้อมูลและองค์ความรู้เฉพาะทางด้านอสังหาริมทรัพย์ในประเทศไทย:

1. Market Intelligence
2. Property Intelligence
3. Construction Intelligence
4. Buyer Intelligence
5. Seller Intelligence
6. Renovation Intelligence
7. AI Automation Workflow

---

## Business Units

### 1. รับสร้างบ้าน (House Construction)

| | |
|---|---|
| **พื้นที่ให้บริการ** | กรุงเทพมหานคร, นนทบุรี, ปทุมธานี, สมุทรปราการ, นครปฐม |
| **กลุ่มลูกค้า** | เจ้าของที่ดิน, ครอบครัวรายได้สูง, ผู้ต้องการสร้างบ้านตั้งแต่ 5 ล้านบาทขึ้นไป |

**Value Proposition:**
- ออกแบบและสร้างบ้าน
- ควบคุมงบประมาณ
- ใช้ AI วิเคราะห์ต้นทุนและความต้องการลูกค้า
- ระบบติดตามงานก่อสร้างแบบดิจิทัล

---

### 2. รับฝากขายบ้านและที่ดิน (Brokerage & Agency)

| | |
|---|---|
| **พื้นที่ให้บริการ** | ปทุมธานี, นนทบุรี |

**Value Proposition:**
- วิเคราะห์ราคาตลาดด้วย AI
- วางกลยุทธ์การตลาดเฉพาะทรัพย์
- สร้างคอนเทนต์อัตโนมัติ
- คัดกรองผู้ซื้อคุณภาพ
- ลดระยะเวลาการขาย

**เป้าหมาย:** สร้างฐานข้อมูล Buyer Intelligence + Seller Intelligence + Property Intelligence เพื่อใช้ต่อยอดธุรกิจอื่น

---

### 3. รีโนเวทเพื่อขาย (Fix & Flip)

| | |
|---|---|
| **พื้นที่ลงทุน** | ปทุมธานี, นนทบุรี |

**กลยุทธ์:** ซื้อทรัพย์ที่มี
- ส่วนลดจากราคาตลาด
- ศักยภาพในการเพิ่มมูลค่า
- ทำเลที่มี Demand สูง

แล้วใช้ข้อมูลจาก AP-Home Platform OS เพื่อ: ประเมินมูลค่า, คาดการณ์ Demand, คำนวณกำไร, บริหารความเสี่ยง

**เป้าหมาย:** สร้าง Inventory ที่บริษัทเป็นเจ้าของเอง

---

### 4. ที่ปรึกษาและตรวจสอบงานก่อสร้าง

**บริการ:**
- ตรวจบ้านก่อนโอน
- ตรวจงานระหว่างก่อสร้าง
- ตรวจรับงานผู้รับเหมา
- วิเคราะห์ BOQ
- ตรวจคุณภาพวัสดุ

**กลุ่มลูกค้า:** เจ้าของบ้าน, นักลงทุนอสังหาฯ, ผู้ซื้อบ้านใหม่, ผู้ว่าจ้างผู้รับเหมา

> QC Line (LINE OA → GPT-4o Vision) คือ product implementation ของหน่วยธุรกิจนี้ — ดู CLAUDE.md / AI_TEAM.md section 16 สำหรับรายละเอียดทางเทคนิค

---

## AP-Home Platform OS — Intelligence Loop

ธุรกิจทั้ง 4 หน่วยป้อนข้อมูลเข้า-ออกจากกันเป็นวงจรผ่าน Platform กลาง:

```
รับฝากขาย
   ↓
Property Data + Buyer Data
   ↓
Market Intelligence
   ↓
รีโนเวทเพื่อขาย
   ↓
Investment Intelligence
   ↓
รับสร้างบ้าน
   ↓
Construction Intelligence
   ↓
ที่ปรึกษาและตรวจงาน
   ↓
Quality Intelligence
   ↓
กลับเข้าสู่ AP-Home Platform OS
```

หลักการ: **ทุก business unit ทั้งสร้างและใช้ intelligence จากหน่วยอื่น** — ไม่มี business unit ไหนที่ทำงานแบบ isolated silo ข้อมูลจากการฝากขาย (property/buyer) ป้อนเข้า market intelligence ที่ใช้ตัดสินใจซื้อทรัพย์มารีโนเวท ข้อมูลก่อสร้างจากการรับสร้างบ้านป้อนเข้า construction intelligence ที่ใช้ตรวจงานให้ลูกค้ารายอื่น และวนกลับเข้า platform กลางเสมอ

ดู `AI_TEAM.md` section 4.1 (Knowledge Principles) และ section 17 (Future Vision) สำหรับหลักการที่ platform ต้องรองรับ loop นี้ในสถาปัตยกรรมโค้ด

---

## หน่วยงานที่เกี่ยวข้อง (ไม่ใช่ business unit แต่เป็น marketing brand)

**Finnhouses** คือ marketing brand ที่ใช้ที่ website (finnhouses.com) + content เท่านั้น — ไม่ใช่ชื่อบริษัท ชื่อบริษัทคือ บจก.อาชิดา (Achida Co., Ltd.) — ปัจจุบัน Finnhouses ผูกกับ "รับสร้างบ้าน" เป็นหลัก แบรนด์อื่นสำหรับ business unit อื่นยังไม่ได้กำหนด

---

## Cross-reference

| ต้องการดู | ไปที่ |
|---|---|
| สถานะเทคนิคปัจจุบัน (Hub v1/v2, URLs, bugs) | `CLAUDE.md` |
| Engineering governance / architecture rules | `AI_TEAM.md` |
| Business Units table แบบสั้น (สำหรับ quick reference) | `memory/Claude md/CLAUDE.md` (link มาไฟล์นี้) |
| Pending tasks | `HANDOFF.md` |
