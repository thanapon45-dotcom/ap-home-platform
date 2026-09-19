# Business Model — บจก.อาชิดา (Achida Co., Ltd.)

> **Canonical source** สำหรับ business model, business units และบทบาทของ AP-Home Platform OS
> เอกสารนี้อธิบาย **ธุรกิจจริง + ระบบที่พัฒนาและใช้งานอยู่จริง** ไม่ใช่ roadmap หรือความสามารถที่ยังไม่ได้สร้าง
> **อัปเดตล่าสุด: 2026-09-19** — ตรวจเทียบกับ source code, API routes, Supabase usage และ decision records ใน repository

---

## 1. Business Profile

**บริษัท:** บจก.อาชิดา (Achida Co., Ltd.)  
**Marketing Brand:** Finnhouses  
**Platform:** AP-Home Platform OS

ธุรกิจที่ยัง active มี 3 หน่วย:

| Business Unit | สัดส่วนธุรกิจ | บทบาท |
|---|---:|---|
| **Unit 3 — Fix & Flip / Develop** | **60%** | ซื้อทรัพย์/ที่ดิน → ประเมิน → รีโนเวท → ขาย |
| **Unit 4 — Consulting / Inspection** | **30%** | ที่ปรึกษาและตรวจสอบงานก่อสร้าง/คุณภาพ |
| **Unit 2 — Brokerage / Agency** | **10%** | รับฝากขายบ้านและที่ดิน |

### Unit 1 — รับสร้างบ้านใหม่
**DISCONTINUED**

บริษัท **ไม่ได้ทำธุรกิจรับสร้างบ้านใหม่ให้ลูกค้า** แล้ว Unit 1 จึงมีไว้เพื่อ historical record เท่านั้น และ **ห้ามใช้เป็น business positioning, AI persona, content rule หรือ default business unit ปัจจุบัน**

---

## 2. Business Units

### Unit 3 — Fix & Flip / Develop — 60%

ธุรกิจหลักของบริษัท

**รูปแบบธุรกิจ**
1. คัดเลือกทรัพย์/ที่ดินที่มีโอกาสสร้างผลตอบแทน
2. วิเคราะห์ทำเล ราคา และศักยภาพ
3. ประเมินต้นทุนและ ROI
4. เข้าสู่กระบวนการรีโนเวท
5. ประกาศขาย
6. ติดตามการขาย
7. เก็บ actual performance กลับเข้าสู่ระบบ

**ระบบที่รองรับจริง**
- **Land Analyzer** — วิเคราะห์ที่ดิน/ทำเล, ราคา, ROI และบันทึกเป็น project
- **Fix & Flip Deals** (`/deals`) — pipeline 4 stages: ประเมิน → รีโนเวท → ประกาศขาย → ปิดดีล
- **Land Analyzer → Deals link** — project สามารถสร้าง deal พร้อมเชื่อม `land_project_id`
- **ROI Actual vs Estimate** — เปรียบเทียบ ROI ที่ประเมินกับผลจริงเมื่อมีข้อมูล
- **Budget / cost calculation** — คำนวณต้นทุนที่เกี่ยวข้องกับการพัฒนา/รีโนเวท
- **BOQ** (`/boq`) — จัดทำ BOQ แบบ tree ต่อ project, เลือกวัสดุ/แรงงานจาก master catalog, กรอก quantity และคำนวณยอดรวม/overhead
- **Properties / Listing / Content** — สนับสนุนการนำทรัพย์เข้าสู่ตลาดและการขาย

> **BOQ v1 limitation:** quantity เป็นการกรอกด้วยมนุษย์ ยังไม่มี automatic quantity takeoff จาก DWG/CAD ในหน้าหลัก; CAD staging/approve และ payment milestones เป็นขอบเขตแยก

### Unit 4 — Consulting / Inspection — 30%

บริการที่ปรึกษาและตรวจสอบงานก่อสร้าง

**บริการหลัก**
- ตรวจบ้านก่อนโอน
- ตรวจงานระหว่างก่อสร้าง
- ตรวจรับงาน
- วิเคราะห์ BOQ
- ตรวจคุณภาพวัสดุและงานก่อสร้าง

**ระบบที่รองรับจริง**
- **QC Line** — รับภาพจาก LINE OA และวิเคราะห์ด้วย AI Vision
- **QC Accuracy Dashboard** — ติดตามผลการตรวจและ feedback ของ inspector
- **QC reference standards** — ใช้ภาพมาตรฐานประกอบการตรวจในระบบที่รองรับ
- **BOQ** — ใช้ประกอบการวิเคราะห์/ตรวจสอบต้นทุนและรายการก่อสร้าง

> QC เป็น product implementation ของ Unit 4 และอยู่ใน Construction Management pillar

### Unit 2 — Brokerage / Agency — 10%

รับฝากขายบ้านและที่ดิน โดยเน้นปทุมธานีและนนทบุรี

**ระบบที่รองรับจริง**
- **Properties** — ข้อมูลทรัพย์
- **AI Content Studio** — content สำหรับงานขายและการตลาด
- **CRM** — Lead Pipeline, Overview และ Follow Up/Nurture
- **Market Intelligence** — เก็บ observation และสกัด market signals
- **Budget Tool / public lead capture** — รับข้อมูลความต้องการของผู้สนใจเข้าสู่ระบบ

---

## 3. AP-Home Platform OS

AP-Home Platform OS เป็นระบบกลางสำหรับเก็บข้อมูล วิเคราะห์ และสนับสนุนการทำงานของทั้ง 3 business units

### Platform Structure — 2 Pillars

ระบบแบ่งตาม **ลักษณะการใช้งานจริง** เป็น 2 กลุ่ม:

### Pillar A — Marketing & Sales
- AI Content Studio
  - Keyword / content generation
  - Blog
  - Listing
  - History
  - Queue
  - Market Intel
- CRM / Lead Pipeline
- Properties / Listing
- Fix & Flip Deals ฝั่งขาย
- OS Dashboard / Overview

**รองรับ:** Unit 2 โดยตรง + ฝั่งการขายของ Unit 3

### Pillar B — Construction Management
- Land Analyzer
- Budget / Cost Calculation
- BOQ
- QC Line
- QC Accuracy / feedback

**รองรับ:** Unit 3 ฝั่งพัฒนา/รีโนเวท + Unit 4 โดยตรง

> 2 pillars เป็นวิธีจัดหมวด **เครื่องมือ** ไม่ใช่การแยกข้อมูลออกเป็น silo

---

## 4. Intelligence / Data Layer

ระบบไม่ได้สร้าง intelligence เป็นโมดูลแยกขาดจากกัน แต่ใช้ข้อมูลร่วมกันเป็นวงจร

### Market Intelligence — LIVE
Market Intelligence Collector v2 รับ observation จาก Facebook/manual input แล้วสกัด structured signals: demand, price, offer, finance, value, location, urgency, seller_motivation และ liquidity

ข้อมูลถูกเก็บใน `content_frames` พร้อม `signals`, `positioned_content`, `ai_summary` และ `collector_version`

### Property Intelligence
ใช้ข้อมูลทรัพย์และผลการวิเคราะห์จาก Properties / Land Analyzer / Deals เพื่อสนับสนุนการประเมินทรัพย์

### Buyer / Lead Intelligence
CRM เก็บ lead, stage, score, source และข้อมูลประกอบการติดตามลูกค้า

> **สำคัญ:** Fix & Flip deals ไม่ถูกจัดเป็น CRM `business_unit` แบบ lead โดยตรง Unit 3 ใช้ Deals pipeline เป็นระบบหลักสำหรับดีลลงทุน/พัฒนา

### Construction / Quality Intelligence
ข้อมูลจาก QC และ BOQ ใช้สนับสนุนการควบคุมคุณภาพ ต้นทุน และการตัดสินใจด้านงานก่อสร้าง/รีโนเวท

### Renovation / Investment Intelligence
Fix & Flip Deals รวม purchase, renovation budget, list price, actual spend, actual ROI, estimated ROI และ deal stage

---

## 5. Current Operating Loop

ระบบปัจจุบันควรเข้าใจเป็น **data loop** ไม่ใช่ flow แบบเส้นตรงระหว่าง business units:

```text
Market / Property Data
        ↓
Market Intelligence
        ↓
Land / Property Evaluation
        ↓
Fix & Flip Deal
        ↓
BOQ / Cost / Renovation
        ↓
QC / Quality Data
        ↓
Sale / Listing / CRM
        ↓
Buyer / Sales / Market Feedback
        ↓
Market Intelligence
        ↺
```

อีกด้านหนึ่ง:

```text
Consulting / Inspection
        ↓
QC + BOQ + Inspection Data
        ↓
Construction / Renovation Knowledge
        ↓
Fix & Flip decisions
        ↓
ผลจริงของ Deal
        ↓
กลับเข้าสู่ Intelligence Layer
```

**หลักการ:** ข้อมูลจากการทำงานจริงของธุรกิจถูกสะสมกลับเข้าสู่ platform เพื่อใช้ในการตัดสินใจครั้งถัดไป

---

## 6. Content & Publishing System

### AI Content Studio
สร้างและจัดการ content สำหรับ Facebook, Blog, Property Listing และ Market Intelligence

ระบบมี buyer-segment context และ Taste Library สำหรับอ้างอิง content ที่เคยเลือกไว้

**Business positioning rule:** content ต้องไม่อ้างว่า Finnhouses รับสร้างบ้านใหม่เอง เพราะ Unit 1 discontinued แล้ว

### Blog Automation
n8n workflow ใช้สำหรับรับงานจาก platform → สร้างบทความ → publish ไป WordPress → สร้าง/patch featured image → ส่งสถานะกลับ platform

### WF1 AI Quality Gate
WF1 มี AI content-quality gate สำหรับตรวจ business/brand guardrail, ภาษาไทย และ unsupported claims ก่อน publish

> **สถานะที่ต้องเขียนอย่างระมัดระวัง:** quality gate ใน WF1 มี implementation แล้ว แต่ workflow feedback-log `11_gate_log` ต้องถือสถานะตามการ import/activate จริง ไม่ควรระบุว่า active หากยังไม่ได้ activate ใน n8n

---

## 7. CRM Business Classification

CRM ไม่ได้ใช้แทน Business Units ทั้งระบบ

สำหรับ **CRM leads** ระบบปัจจุบันจำแนกเป็น:
- `consult` — Consulting / Inspection
- `list` — Brokerage / Listing

**Fix & Flip (`reno`) ไม่ใช่ CRM lead classification** เพราะ Unit 3 ใช้ Deals pipeline เป็นระบบหลัก

ดังนั้น:
- **Business Unit ของบริษัท:** 3 หน่วย — Unit 3 / Unit 4 / Unit 2
- **CRM lead classification:** `consult` / `list`
- **Fix & Flip pipeline:** `reno_deals`

สามสิ่งนี้ต้องไม่ถูกตีความว่าเป็น enum เดียวกัน

---

## 8. Technical Operating Model

AP-Home Platform OS ปัจจุบันประกอบด้วย:
- **Next.js / Vercel** — dashboard และ web application
- **Backend Hub / Railway** — backend orchestration/API
- **n8n / Railway** — workflow automation
- **Supabase** — primary data layer
- **WordPress / Finnhouses** — publishing destination
- **Facebook** — publishing / market observation source
- **LINE OA** — QC / operational input
- **AI providers** — content, analysis และ vision ตาม workflow

### API boundary
Browser/client ไม่ควรเข้าถึง secret หรือ external backend โดยตรงในกรณีที่ระบบกำหนดให้ผ่าน server proxy

รูปแบบที่ใช้อยู่จริงมีทั้ง:
1. **Next.js API proxy → Hub/backend**
2. **Next.js server route → Supabase service role**

จึงต้องอธิบาย data flow ตาม implementation ของแต่ละ route ไม่เหมารวมว่าทุกอย่างผ่าน Hub เดียว

---

## 9. What Is NOT the Current Business Model

สิ่งต่อไปนี้ **ไม่ใช่ธุรกิจปัจจุบัน**:
- รับสร้างบ้านใหม่ให้ลูกค้า
- วาง Finnhouses เป็นบริษัทรับเหมาก่อสร้างบ้านใหม่
- ใช้ Unit 1 เป็น default business unit
- อธิบาย Fix & Flip ว่าเป็น CRM lead unit
- อ้างว่า BOQ v1 มี automatic DWG quantity takeoff
- อ้างว่า AI/automation คือธุรกิจหลักของบริษัท

AI และ automation เป็น **เครื่องมือของระบบ** ส่วน asset ระยะยาวของ AP-Home คือ **ข้อมูล + โครงสร้างข้อมูล + feedback จากการทำธุรกิจจริง**

---

## 10. Strategic Model

```text
                 AP-HOME PLATFORM OS
                         │
          ┌──────────────┴──────────────┐
          │                             │
   Marketing & Sales          Construction Management
          │                             │
   Content / CRM /             Land / Budget / BOQ /
   Properties / Deals          QC / Inspection
          │                             │
          └────────── Data Layer ───────┘
                         │
              Market / Property /
          Buyer / Construction /
             Investment Data
                         │
                   Intelligence
                         │
                  Decision Support
                         ↺
```

เป้าหมายเชิงกลยุทธ์คือทำให้ **ข้อมูลจากการดำเนินธุรกิจจริงสะสมเป็น real-estate intelligence moat** เมื่อเวลาผ่านไป ไม่ใช่การสร้าง AI feature จำนวนมากโดยไม่มี data loop รองรับ

---

## 11. Source of Truth / Related Documents

| ต้องการดู | เอกสาร/ระบบ |
|---|---|
| Business model | `docs/BUSINESS_MODEL.md` |
| Technical current state | `CLAUDE.md` |
| Engineering governance | `docs/AI_TEAM.md` |
| Decisions / ADR history | `docs/decisions.md`, `docs/v2/04-decisions/accepted/` |
| Current implementation | source code + API routes |
| Current workflow definitions | `memory/n8n-workflows/` |
| Intelligence architecture | `docs/v2/07-departments/` |

> **กฎของเอกสารนี้:** ถ้า business model หรือ feature ในเอกสารขัดกับระบบที่ deploy/ใช้งานจริง ให้ตรวจ source code, workflow และ decision record ก่อนแก้เอกสาร ห้ามเดาจากเอกสารเก่า