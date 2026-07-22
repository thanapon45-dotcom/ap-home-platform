# Business Model — บจก.อาชิดา (Achida Co., Ltd.)

> **Canonical source** สำหรับ company structure, vision, business units, และ intelligence loop ของ AP-Home Platform OS
> ไฟล์อื่น (memory/CLAUDE.md, AI_TEAM.md, context_brief.md) ควร **link มาที่นี่** แทนการ copy เนื้อหาซ้ำ
> อัปเดตล่าสุด: 2026-07-20 (session 26, ต่อ) — **Business Unit 1 (รับสร้างบ้าน) ยืนยันจาก Archi ว่า discontinued แล้ว** ส่วน **Business Unit 3 (Fix & Flip) ยืนยันแล้วว่ายังทำอยู่จริง และเป็นสัดส่วนใหญ่ที่สุด** — Archi ให้สัดส่วนธุรกิจจริงตอนนี้คือ **Develop/Fix & Flip 60% · ที่ปรึกษา/ตรวจสอบงานก่อสร้าง (Unit 4) 30% · โบรกเกอร์ (Unit 2) 10%** — ดู note ใต้หัวข้อ Unit 1 และ Unit 3 ด้านล่าง + `docs/decisions.md` ADR-010, ADR-011

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

### Platform Structure — 2 Pillars (Archi's mental model, ยืนยัน 2026-07-20 session 26 ต่อ)

Archi แบ่ง product/tool ของแพลตฟอร์มออกเป็น 2 กลุ่มใหญ่ตามการใช้งานจริง — นี่คือกรอบคิดหลักที่ควรใช้อ้างอิงเวลาจัดหมวดหมู่ feature ใหม่ๆ:

**1. การตลาดและขาย (Marketing & Sales)** — เครื่องมือหาลูกค้า/ปิดดีล/สร้าง content
- AI Content Studio (FB Content Studio, Blog Runner, Listing generator, Market Intel tab)
- CRM (Lead pipeline)
- OS Dashboard (ภาพรวม)
- สนับสนุน: Unit 2 (โบรกเกอร์) โดยตรง + การตลาดฝั่งขายของ Unit 3 (Fix & Flip)

**2. การบริหารงานก่อสร้าง (Construction Management)** — เครื่องมือวิเคราะห์/ควบคุมงานหน้างาน
- Land Analyzer (วิเคราะห์ที่ดิน — ใช้ตอนประเมินซื้อทรัพย์เข้า Fix & Flip)
- Budget Tool (คำนวณงบสร้างบ้าน/รีโนเวท)
- QC (LINE OA → GPT-4o Vision — ตรวจงานก่อสร้าง)
- สนับสนุน: Unit 3 (Fix & Flip) ฝั่งปฏิบัติการ + Unit 4 (ที่ปรึกษา/ตรวจสอบ) โดยตรง (QC คือ product implementation ของ Unit 4)

> หมายเหตุ (ยืนยันจาก Archi): 7 Intelligence Modules ด้านบน**ไม่ได้แยกคนละ pillar** แต่**เชื่อมโยงข้อมูลซึ่งกันและกันทั้งหมด** เพื่อใช้เป็นกลยุทธ์ในการบริหารภาพรวม — เช่น Market Intelligence ป้อนทั้ง AI Content Studio (ฝั่งขาย) และ Land Analyzer (ฝั่งประเมินซื้อที่ดิน), Construction Intelligence จาก QC ป้อนกลับเข้า Renovation Intelligence ที่ใช้ตัดสินใจ Fix & Flip ครั้งถัดไป, Buyer Intelligence จากฝั่งขายป้อนกลับเข้า Property Intelligence ที่ใช้ประเมินทรัพย์ใหม่ — ทั้ง 2 pillar (การตลาดและขาย / การบริหารงานก่อสร้าง) ดึงและป้อนข้อมูลเข้า loop เดียวกันตลอดเวลา ไม่ใช่ silo แยกขาดจากกัน

---

## Business Units

### 1. รับสร้างบ้าน (House Construction) — ⚠️ DISCONTINUED (ยืนยัน 2026-07-20, session 26)

> Archi ยืนยันตรงๆ ว่า**ไม่ทำธุรกิจรับเหมาก่อสร้าง (สร้างบ้านใหม่ให้ลูกค้า)** — หน่วยธุรกิจนี้ไม่ใช่ของจริงอีกต่อไป เหลือไว้ในเอกสารเพื่อ historical record เท่านั้น ห้ามใช้เป็น reference สำหรับ content/prompt/persona ใดๆ อีก (แก้แล้วใน `components/AIContent.tsx` — ดู `docs/decisions.md` ADR-010) ธุรกิจจริงตอนนี้มี 3 หน่วย: **Unit 3 (Fix & Flip / Develop)**, **Unit 4 (ที่ปรึกษา/ตรวจสอบงานก่อสร้าง)**, **Unit 2 (โบรกเกอร์)** — ดู สัดส่วนธุรกิจ ใต้หัวข้อ Unit 3

| | |
|---|---|
| **พื้นที่ให้บริการ (เดิม)** | กรุงเทพมหานคร, นนทบุรี, ปทุมธานี, สมุทรปราการ, นครปฐม |
| **กลุ่มลูกค้า (เดิม)** | เจ้าของที่ดิน, ครอบครัวรายได้สูง, ผู้ต้องการสร้างบ้านตั้งแต่ 5 ล้านบาทขึ้นไป |

**Value Proposition (เดิม — ไม่ใช้แล้ว):**
- ออกแบบและสร้างบ้าน
- ควบคุมงบประมาณ
- ใช้ AI วิเคราะห์ต้นทุนและความต้องการลูกค้า
- ระบบติดตามงานก่อสร้างแบบดิจิทัล

---

### 2. รับฝากขายบ้านและที่ดิน (Brokerage & Agency) — **สัดส่วนธุรกิจ 10%** (ยืนยัน 2026-07-20)

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

### 3. รีโนเวทเพื่อขาย (Fix & Flip / "Develop") — **สัดส่วนธุรกิจ 60% — หน่วยธุรกิจหลัก** (ยืนยัน 2026-07-20, session 26 ต่อ)

> Archi ยืนยันว่าหน่วยนี้ยังทำอยู่จริง และเป็นสัดส่วนใหญ่ที่สุดของธุรกิจตอนนี้ (60% ของทั้งหมด) — เดิมเอกสารเคยบันทึกว่าสถานะยังไม่ยืนยัน (มีความเสี่ยงสับสนกับ Unit 1 ที่ discontinued เพราะทั้งคู่เกี่ยวกับงานก่อสร้าง) แต่ตอนนี้ยืนยันชัดแล้วว่า Fix & Flip (ซื้อทรัพย์มาปรับปรุงแล้วขาย) **ไม่ใช่** การรับเหมาสร้างบ้านใหม่ให้ลูกค้า (Unit 1) — คนละแบบธุรกิจกัน ห้ามสับสน

| | |
|---|---|
| **พื้นที่ลงทุน** | ปทุมธานี, นนทบุรี |

**กลยุทธ์:** ซื้อทรัพย์ที่มี
- ส่วนลดจากราคาตลาด
- ศักยภาพในการเพิ่มมูลค่า
- ทำเลที่มี Demand สูง

แล้วใช้ข้อมูลจาก AP-Home Platform OS เพื่อ: ประเมินมูลค่า, คาดการณ์ Demand, คำนวณกำไร, บริหารความเสี่ยง

**เป้าหมาย:** สร้าง Inventory ที่บริษัทเป็นเจ้าของเอง

> **Tooling (เพิ่ม 2026-07-22)**: ก่อนหน้านี้ Unit 3 ไม่มีเครื่องมือ dedicated ติดตามดีล (Land Analyzer/Budget Tool เป็นแค่ calculator ครั้งเดียว ไม่มี pipeline state) — สร้างโมดูล **"Fix & Flip Deals"** (`/deals` ใน AP-Home Platform OS) แล้ว: Kanban board 4 stage (ประเมิน → รีโนเวท → ประกาศขาย → ปิดดีล) พร้อม summary metrics (เงินทุนที่ใช้อยู่, ROI เฉลี่ยดีลที่ปิดแล้ว) ต่อยอดจากตาราง Supabase `reno_deals` ที่มีอยู่แล้ว ดู `docs/decisions.md` ADR-014

---

### 4. ที่ปรึกษาและตรวจสอบงานก่อสร้าง — **สัดส่วนธุรกิจ 30%** (ยืนยัน 2026-07-20)

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

> ⚠️ **หมายเหตุ (2026-07-20)**: diagram ด้านล่างยังมี node "รับสร้างบ้าน" อยู่ตามของเดิม แต่หน่วยธุรกิจนั้น discontinued แล้ว (ดู Unit 1 ด้านบน) — Unit 3 (Fix & Flip) ยืนยันแล้วว่ายังทำอยู่จริงและเป็นหน่วยธุรกิจหลัก (60%) แต่ diagram นี้ยังไม่ได้ redesign ใหม่ให้ตรงกับ 3 หน่วยจริง (Fix & Flip 60% / ที่ปรึกษา 30% / โบรกเกอร์ 10%) — เป็นงาน follow-up ที่ยังไม่ได้ทำ

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
