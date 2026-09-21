# Architecture Decision Records — Index

> Full list of accepted ADRs. Split from `docs/decisions.md`. ADR-006 does not exist in the source (number was skipped historically).

| ID | Title |
|---|---|
| [ADR-001](ADR-001.md) | Hub v2 URL normalization ใน Vercel proxy |
| [ADR-002](ADR-002.md) | เพิ่ม /webhook/image-done ใน Hub v2 |
| [ADR-003](ADR-003.md) | ไม่ใช้ emoji ใน TypeScript template literals |
| [ADR-004](ADR-004.md) | Revert production routing: Hub v2 → Hub v1 |
| [ADR-005](ADR-005.md) | Market Intelligence Collector v2: 9-signal schema + native Supabase writes |
| [ADR-007](ADR-007.md) | AI Content resale copy: ปรับ ListingTab ที่มีอยู่ แทนสร้าง House Matching Engine ใหม่ |
| [ADR-008](ADR-008.md) | Supabase RLS hardening scope: แก้เฉพาะตารางที่ server-side (service_role) เขียนเท่านั้น เว้น leads/projects ไว้ก่อน |
| [ADR-009](ADR-009.md) | AI Content Studio: decouple Buyer Segment จาก Positioned tone + segment-tag Taste Library |
| [ADR-010](ADR-010.md) | แก้ business model ของ AI Content Studio: เลิกอ้างอิง "รับสร้างบ้าน" ทั้งหมด เหลือ 2 กลุ่มลูกค้าจริง |
| [ADR-011](ADR-011.md) | Business Unit 3 (Fix & Flip) ยืนยัน active + สัดส่วนธุรกิจจริง 3 หน่วย |
| [ADR-012](ADR-012.md) | แก้ AI Content Studio ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ (2 root cause ซ้อนกัน) |
| [ADR-013](ADR-013.md) | เพิ่ม "Platform Structure — 2 Pillars" ใน BUSINESS_MODEL.md ตามกรอบคิดของ Archi |
| [ADR-014](ADR-014.md) | Fix & Flip Deals module: native deal pipeline สำหรับ Business Unit 3 (60% ของธุรกิจ) |
| [ADR-015](ADR-015.md) | QC Line Accuracy Dashboard (Phase 1): infra พร้อมใช้ แม้ข้อมูลยังไม่พอสรุป |
| [ADR-016](ADR-016.md) | WF1 AI Quality Gate (Phase 2): เช็คเนื้อหาจริงก่อน publish ไม่ใช่แค่โครงสร้าง |
| [ADR-017](ADR-017.md) | Fix & Flip Deal ROI: Actual-vs-Estimate tracking (Phase 3) |
| [ADR-018](ADR-018.md) | CRM/Overview leads ยังผูก business_unit กับ Unit 1 ที่เลิกทำแล้ว: แก้ default/type ให้ตรงจริง |
| [ADR-019](ADR-019.md) | CRM: ตัด "reno" ออกจาก business_unit ทั้งหมด — lead เข้ามาแค่ 2 หน่วย (consult/list) |
| [ADR-020](ADR-020.md) | "FB Post Performance Tracker" ไม่เคยเขียนข้อมูลจริงเลยสักครั้ง — root cause: anon key ชน RLS |
| [ADR-021](ADR-021.md) | WF1 AI Quality Gate feedback loop (item #2 ของแผน 3 ข้อ "ระบบพิสูจน์ตัวเองว่าทำงานถูก") |
| [ADR-022](ADR-022.md) | **SUPERSEDED** — historical Land Analyzer → Fix & Flip Deals link |
| [ADR-023](ADR-023.md) | Market Intel confidence calibration (item #3 สุดท้ายของแผน 3 ข้อ) |
| [ADR-024](ADR-024.md) | Data-flow graph verification (Obsidian-style) + useLiveData Hub bypass fix |
