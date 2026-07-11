# Architecture Decisions Log

---

## ADR-001 — Hub v2 URL normalization ใน Vercel proxy
**Date**: 2026-06-30  
**Status**: Implemented ✅

**Context**: `HUB_URL` env var ใน Vercel มี `/api` ต่อท้าย ทำให้ proxy สร้าง double path `/api/api/blog/...` → 404

**Decision**: Normalize `HUB_URL` ใน `route.ts` ด้วย `.replace(/\/api\/?$/, "")` แทนการแก้ env var อย่างเดียว เพราะ env var อาจถูกแก้ผิดในอนาคต code ควร idempotent

**Files**: `app/api/blog/queue/run-next/route.ts`

---

## ADR-002 — เพิ่ม /webhook/image-done ใน Hub v2
**Date**: 2026-06-30  
**Status**: Implemented ✅

**Context**: WF2 ส่ง image callback ไปที่ Hub v1 URL (`/webhook/image-done`) แต่ Hub v2 ไม่มี endpoint นี้ ถ้าเปลี่ยน URL ใน WF2 ตรงๆ จะได้ 404

**Decision**: เพิ่ม `POST /webhook/image-done` ใน Hub v2 พร้อม auth `requireHubSecret` แทน Hub v1 ที่ไม่มี auth

**Side effects**:
- เพิ่ม image fields ใน `HubStateData.blog` type (optional)
- เพิ่ม `setImageDone()` ใน StateManager
- อัปเดต WF2 JSON: URL + header name (`x-hub-token` → `x-hub-secret`)

**Files**: `IStateRepository.ts`, `StateManager.ts`, `server.ts`, `WF2 (5_hub_v2).json`

---

## ADR-003 — ไม่ใช้ emoji ใน TypeScript template literals
**Date**: 2026-06-30  
**Status**: Active rule ✅

**Context**: emoji (เช่น 🖼️) ใน template literal ของ server.ts ถูก corrupt ผ่าน sandbox mount → tsc รายงาน "Unterminated template literal"

**Decision**: ใช้ plain text แทน emoji ทุกครั้งใน server-side TypeScript files ที่ Claude edit

**Rule**: แทน `🖼️ Image patched` → `[Image] patched`

---

## ADR-004 — Revert production routing: Hub v2 → Hub v1
**Date**: 2026-07-01  
**Status**: Implemented ✅ (reverted — supersedes the "active" framing in ADR-001/002 and old HANDOFF/glossary)

**Context**: Hub v2 cutover ถูกดำเนินต่อจาก ADR-001/002 โดยเปลี่ยน `HUB_URL` (Vercel) ไปชี้ Hub v2 และเปลี่ยน path เป็น `/api/blog/queue/*` + header `x-hub-secret` ตาม convention ของ Hub v2 แต่หลังทดสอบจริงพบว่า **`/api/fb/queue/*` และ `/api/blog/queue/*` ไม่มี implement จริงบน Hub v2 เลย** — `fbRoutes.ts` มีแค่ `/api/fb/publish` + `/api/fb/state`, ไม่มี `queue/{build,clear,run-next}` เลยทั้ง fb และ (ตรวจซ้ำ) blog module จริงๆ มี endpoint ครบแต่ route ไม่ได้ wire เข้า server จริง → production ยิงแล้ว 404 ทุก queue request

**Decision**: Revert `HUB_URL` กลับไปชี้ Hub v1 (`ap-home-platform-production.up.railway.app`) ทันที Hub v2 กลับไปเป็น shadow-only (ไม่ serve production traffic) จนกว่าจะสร้าง route ที่ขาดครบ + smoke test ผ่านทุก route ที่ Dashboard/n8n เรียกจริง

**Side effects**:
- Auth header กลับเป็น `x-hub-token` (Hub v1 convention) — ไม่ใช่ `x-hub-secret`
- Path กลับเป็น `/action/blog/queue/*` และ `/action/fb/queue/*` — ไม่ใช่ `/api/blog/queue/*`
- `docs/HANDOFF.md`, `docs/glossary.md`, `docs/issues-log.md` ที่เขียนไว้ก่อนหน้านี้ (Jun 30) อธิบายสถานะตอน Hub v2 live — ตอนนี้ stale แล้ว ถูก supersede ด้วย ADR นี้ (อัปเดตไฟล์เหล่านั้นแล้ว Jul 4)
- `docs/AI_TEAM.md` "Current System State" table ก็ stale เช่นกัน — อัปเดตแล้ว Jul 4

**Files**: Vercel env var `HUB_URL` เท่านั้น — ไม่ต้องแก้ code เพราะ proxy routes อ่านจาก env var อยู่แล้ว

**Lesson**: ก่อน cutover ใดๆ ในอนาคต ต้องยิง request จริงทดสอบ**ทุก route**ที่ Dashboard/n8n ใช้บน Hub v2 ให้ผ่านหมดก่อน — `HUB_URL` เป็น env var ตัวเดียวที่กระทบทุก route พร้อมกัน route เดียวขาดหายไปคือทั้งระบบ 404

**Related**: `memory/Claude md/CLAUDE.md` "Hub v2 Shadow — สถานะ Jul 1, 2026", `docs/issues-log.md` ISSUE-005

---

## ADR-005 — Market Intelligence Collector v2: 9-signal schema + native Supabase writes
**Date**: 2026-07-07 (schema) → 2026-07-08 (dry run + production cutover)
**Status**: Implemented ✅ — **live in production** since 2026-07-08 ~16:01

**Context**: `content_frames` เดิม (v1) เก็บแค่ flat fields ไม่มีโครงสร้าง signal ที่แยกแยะ demand/price/offer/finance/value/location/urgency/seller_motivation/liquidity ได้ ทำให้ข้อมูล Market Intel วิเคราะห์ pattern ระดับพื้นที่ไม่ได้จริง

**Decision**: เพิ่ม 4 คอลัมน์ additive ใน `content_frames` (`signals JSONB, positioned_content JSONB, ai_summary JSONB, collector_version TEXT DEFAULT 'v1'`) และสร้าง workflow ใหม่ `Finnhouses — Market Intelligence Collector v2 (ADR-005)` ที่ให้ Claude Haiku ส่งออก 9-key `signals` object ต่อโพสต์ — 8 key มาจาก LLM (`demand/price/offer/finance/value/location/urgency/seller_motivation`) และ 1 key (`liquidity`) **ถูกบังคับด้วยโค้ดเสมอ ไม่ใช่ LLM-generated** เพราะต้องการ area-level historical aggregation ที่โพสต์เดียวให้ไม่ได้ (ยังไม่ implement — ดู Phase 5 INTEL-001 ด้านล่าง)

**Deployment path (สำคัญ — เก็บไว้เป็นแบบอย่างสำหรับ cutover ครั้งต่อไป)**:
1. **Stage 1 — Dry run** (test webhook paths `market-intel-v2/*`, ไม่แตะ production) พบ+แก้ 3 บั๊กจริงที่ mocked test ก่อนหน้าตรวจไม่เจอ: (a) Code node `this.getCredentials()`/`$env` ใช้ไม่ได้บน n8n instance นี้ (n8n bug #29603) → ปรับเป็น native `n8n-nodes-base.supabase` node ทั้ง 3 จุดเขียน; (b) `market_insights.category` มี CHECK constraint 5 ค่า แต่ model เคยตอบ `"seller_motivation"` (signal key ไม่ใช่ category) → เพิ่ม `VALID_CATEGORIES` whitelist; (c) `market_insights.confidence` เป็น `smallint` 1-5 แต่ model เคยตอบ `0.9` (สับสนกับ per-signal 0-1 score) → เพิ่ม integer clamp
2. **Stage 2 — Production cutover** (Jul 8, ~16:00-16:01): unpublish workflow เก่า (`F3i4dQMubgbm21d6`, เก็บไว้ไม่ลบเพื่อ rollback) → publish v2 (`lrLOjW4GPd5atYhz`) บน webhook path เดิม (`market-intel/fb`, `market-intel/manual`) → 15/15 smoke test PASS
3. **Same-day production incident**: post จริงยาว/ละเอียดกว่าที่เคย test ทำให้ Claude Haiku ตอบเกิน `maxTokens:1600` (ตั้งไว้ตั้งแต่ dry run รอบแรกที่เจอปัญหาเดียวกันแบบเบากว่า) → JSON ถูกตัดกลางคำ → parse fail → fail-safe ทำงานถูกต้อง (ไม่มีข้อมูลเสียหาย แต่โพสต์นั้นไม่ถูกบันทึก) → เพิ่ม `maxTokens` เป็น 3000 → verify ผ่าน 3 โพสต์จริงติดต่อกัน รวม 2 รันที่ใช้เวลา 25.9s/30.5s (นานกว่าปกติมาก ยืนยันว่าเป็น stress case จริง) ดู `docs/issues-log.md` ISSUE-010

**Files**: `memory/n8n-workflows/Finnhouses — Market Intelligence Collector v2 (ADR-005).json`, `docs/ADR/2026-07-07-market-intel-signals-schema.md`, `docs/ADR/2026-07-08-market-intel-v2-stage1-dry-run-report.md`, `docs/ADR/2026-07-08-market-intel-v2-stage2-production-cutover-report.md`, `docs/ADR/2026-07-08-phase5-roadmap-proposal.md`

**Lesson**: mocked/scripted test cases ไม่เคยสร้าง output ยาว/ซับซ้อนพอที่จะชน token limit จริง — ต้อง dry run ด้วย real model calls (ไม่ mock) ก่อน cutover เสมอ และหลัง cutover ต้อง monitor organic traffic จริงต่ออีกสักพัก ไม่ใช่แค่ smoke test ที่ยิงเอง — Stage 2 report เคยระบุ "no extended production monitoring yet" เป็น outstanding risk ไว้ล่วงหน้าแล้ว ซึ่งตรงกับที่เกิดขึ้นจริงในวันเดียวกัน

**Related**: `docs/issues-log.md` ISSUE-010, Phase 5 roadmap (INTEL-001 liquidity aggregation, INTEL-003 prompt drift monitor — ยังเป็น proposal เท่านั้น รอ prioritization)

---

## ADR-007 — AI Content resale copy: ปรับ ListingTab ที่มีอยู่ แทนสร้าง House Matching Engine ใหม่
**หมายเหตุ**: เลขต่อจาก ADR-005 เพราะ "ADR-006" ถูกจองไว้แล้วสำหรับ Market Intelligence Validation Layer (proposal only ใน `docs/ADR/2026-07-08-phase5-roadmap-proposal.md` — ยังไม่ implement) กันสับสนเลขซ้ำ
**Date**: 2026-07-10  
**Status**: Implemented ✅ (scope นี้เท่านั้น — option อื่นพักไว้)

**Context**: Archi ต้องการปรับ AI Content ให้สร้าง content ขายบ้านมือสองได้ดีขึ้น และถามว่า prompt ภายนอก "Finnhouses House Matching System v1.0" (Clean Architecture เต็มรูป — CustomerProfile, scoring engine, ตาราง Supabase ใหม่, Hub API ใหม่) เอามาใช้กับ OS นี้ได้หรือไม่

**ทางเลือกที่ประเมิน**:
1. ปรับ `ListingTab` (`components/AIContent.tsx`) ที่มีอยู่ให้ดึง persona "resale" ที่มีอยู่แล้วใน `BUYER_SEGMENTS` มาใช้ — ไม่แตะ Hub/DB เลย
2. สร้าง House Matching Engine เต็มรูป (CustomerProfile + scoring) — ต้องรอ Hub v2 cutover ตัดสินใจก่อน เพราะ `IAiProvider`/`AiGateway` มีแค่บน Hub v2 shadow
3. เพิ่ม persona/lifestyle tag ให้ `properties` table เป็น foundation data ก่อนค่อยต่อยอด matching engine ทีหลัง

**Decision**: เลือก **option 1** ก่อน — scope เล็กสุด ไม่กระทบ Hub/DB/architecture ใดๆ ได้ผลลัพธ์ทันที option 2/3 พักไว้พัฒนาต่อในอนาคต (ยังไม่ schedule)

**Fix ที่ทำจริง**: inject `BRAND_FACTS` + `BUYER_SEGMENTS.find(s => s.value === "resale")` (fear/need/key_message/framed) เข้า system prompt ของ `ListingTab.generate()`, เพิ่ม Awareness Level selector, บังคับโครงสร้าง hook 5 ข้อ (ประโยคเปิดต้องเป็นฉาก/อารมณ์ล้วนๆ ห้ามมีราคา/hype ปนบรรทัดแรก) หลัง user feedback 2 รอบว่า output ยังมีราคา/hype ปนอยู่

**Files**: `components/AIContent.tsx` (`ListingTab` state + `generate()` prompt template + UI)

**Verify**: ✅ ทดสอบ generate จริงบน production (Jul 10) — เห็น hook เปิดด้วยฉากชีวิตประจำวันล้วนๆ ไม่มีราคา/hype ปนบรรทัดแรก ตรง spec

**Related**: `docs/HANDOFF.md` session 23, `docs/issues-log.md` ISSUE-011 (resolved ในรอบต่อมา — root cause จริงคือ `FB_BACKEND_URL` env var หายไปจาก Vercel ไม่ใช่ token)

---

## ADR-008 — Supabase RLS hardening scope: แก้เฉพาะตารางที่ server-side (service_role) เขียนเท่านั้น เว้น leads/projects ไว้ก่อน
**Date**: 2026-07-11 (session 23 ต่อ)
**Status**: Implemented ✅ (scope นี้เท่านั้น — `leads`/`projects` ตั้งใจเว้นไว้)

**Context**: user ขอ critique platform โดยรวม → ตกลงแก้ RLS ก่อนเป็นลำดับแรก (effort ต่ำ/impact สูง) → เช็ค Supabase advisor พบ scope ใหญ่กว่าที่ CLAUDE.md pending tasks บันทึกไว้มาก — ไม่ใช่แค่ 6 ตารางไม่มี RLS แต่มีอีกชุดใหญ่ที่เปิด RLS แล้วแต่ policy เขียนแบบ `USING (true)`/`WITH CHECK (true)` ซึ่งผลลัพธ์เหมือนไม่มี RLS เลย

**ทางเลือกที่ประเมิน**:
1. ล็อกทุกตารางที่ advisor แจ้งพร้อมกันหมด — เสี่ยงทำ client-side flow ที่พึ่ง anon key พังโดยไม่รู้ตัว
2. ไล่ trace โค้ดก่อนว่าตารางไหนถูก client-side (browser) เขียนด้วย anon key จริงๆ แล้วล็อกเฉพาะตารางที่ปลอดภัย ส่วนที่เหลือพักไว้ตัดสินใจแยก

**Decision**: เลือก **option 2** — grep หา `supabase.from(` ทุกไฟล์ client-side พบว่ามีแค่ `CRM.tsx` (table `leads`) กับ `LandAnalyzer.tsx` (table `projects`) ที่เขียนตรงจาก browser ด้วย `NEXT_PUBLIC_SUPABASE_ANON_KEY` — ตารางอื่นทั้งหมดยืนยันว่าเขียนผ่าน Hub (`SUPABASE_SERVICE_KEY`, bypass RLS เสมอ) เท่านั้น จึงล็อกได้โดยไม่กระทบ ส่วน `leads`/`projects` ไม่แตะเพราะ **platform นี้ไม่มีระบบ login เลย** — ล็อกให้ปลอดภัยจริงต้องมี auth ก่อน ไม่ใช่แค่แก้ RLS policy เฉยๆ

**สิ่งที่ทำจริง**: เปิด RLS 6 ตาราง, ลบ permissive policy ~11 ตาราง/policy, revoke PUBLIC execute บน `append_line_image_atomic` (เจอว่าต้อง revoke จาก PUBLIC แยกจาก per-role grant), pin search_path 2 ฟังก์ชัน, fix `qc_inspections_view` SECURITY DEFINER → security_invoker — ผ่าน Supabase MCP `apply_migration` 2 migrations

**Files**: ไม่มีไฟล์โค้ดเปลี่ยน (DB-level migration ล้วนๆ ผ่าน Supabase MCP)

**Verify**: ✅ `get_advisors` ก่อน/หลัง — ERROR ทั้งหมดหายไป เหลือ INFO ตามที่ตั้งใจ (RLS enabled, no policy = default deny) + WARN 2 รายการที่เป็นของจริงตั้งใจเก็บ (`leads`/`projects` anon insert, `market_listings` scraper_insert ที่ยืนยันแล้วว่าใช้งานจริงจาก `scripts/scrape-market.js`)

**Related**: `docs/issues-log.md` ISSUE-013 (รายละเอียดเต็ม), `CLAUDE.md` Security pending tasks (เพิ่ม task ใหม่: ออกแบบ auth ให้ leads/projects)
