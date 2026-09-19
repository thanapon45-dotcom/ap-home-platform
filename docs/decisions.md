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

---

## ADR-009 — AI Content Studio: decouple Buyer Segment จาก Positioned tone + segment-tag Taste Library
**Date**: 2026-07-20 (session 26)
**Status**: Implemented ✅

**Context**: Archi ต้องการแยกการทำ Content Engine ตามกลุ่มลูกค้า — ตอนแรกเข้าใจผิดว่าหมายถึง Blog Runner/n8n pipeline (auto content) แต่ Archi ชี้แจงว่าหมายถึง **AI Content Studio** (`components/AIContent.tsx`, tool สร้าง content แบบ manual/interactive) หลังอ่านโค้ดจริงพบ 2 บั๊กเชิงโครงสร้าง: (1) `BUYER_SEGMENTS` selector ถูกซ่อนอยู่ใต้เงื่อนไข `tone === "positioned"` เท่านั้น — ใช้กับโทนอื่น (casual/professional/educate ฯลฯ) ไม่ได้เลย (2) Taste Library (⭐ starred reference posts) inject ตัวอย่างแรก 2 อันจาก global list เข้า prompt เสมอ ไม่กรองตามกลุ่มลูกค้าที่กำลังเลือกอยู่ ทำให้ reference ที่ใช้อาจไม่ตรงกลุ่มเลย

**Decision**: Archi ยืนยัน "ไม่กระทบส่วนอื่นๆ ใช่ไหม ถ้าใช่แก้เลย" → ดำเนินการแก้ทั้ง 2 จุดในไฟล์เดียว ไม่กระทบ Blog Runner/n8n:
1. ย้าย Buyer Segment selector ออกจาก `{tone === "positioned" && (...)}` ให้เป็น section แยกที่แสดงตลอดเวลา — ใช้ร่วมกับโทนไหนก็ได้ (Awareness Level + Timing Signal ยังคงอยู่ใต้ Positioned Mode เท่านั้นเหมือนเดิม เพราะผูกกับโครงสร้าง prompt ของโทนนั้นโดยเฉพาะ)
2. เพิ่ม field `segment?: string` ใน `ContentItem` type, เพิ่ม segment-picker ตอนกด ⭐ star ใน `HistoryTab`, เปลี่ยน prompt injection logic จาก `starredRefs.slice(0,2)` (global) → filter ด้วย `r.segment === buyerSeg` ก่อน (fallback ไปใช้ global ถ้ายังไม่มี ref ไหน tag ตรงกลุ่มเลย — กัน regression กับ user ที่ยังไม่เริ่ม tag)
3. Reorder settings panel ให้ "กลุ่มลูกค้าเป้าหมาย" ขึ้นเป็น section แรกสุด เหนือ Keyword (ตามที่ Archi ขอเพิ่มทีหลัง)

**Files**: `components/AIContent.tsx` เท่านั้น (`ContentItem` type, `KeywordTab`, `HistoryTab`, root `AIContent` component `handleStar`)

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด, ✅ ทดสอบจริงบน production หลัง deploy — segment selector ขึ้นเหนือ Keyword ตามที่ตั้งใจ

**Related**: ADR-010 (rebrand ต่อเนื่องในวันเดียวกัน), `docs/issues-log.md` ISSUE-015 (Vercel deploy gotcha ที่เจอตอน ship การเปลี่ยนแปลงนี้)

---

## ADR-010 — แก้ business model ของ AI Content Studio: เลิกอ้างอิง "รับสร้างบ้าน" ทั้งหมด เหลือ 2 กลุ่มลูกค้าจริง
**Date**: 2026-07-20 (session 26)
**Status**: Implemented ✅

**Context**: ระหว่างคุยเรื่อง keyword ของ AI Content Studio, Archi ยืนยันตรงๆ ว่า **"ผมไม่ทำธุรกิจรับเหมาก่อสร้าง"** — ลูกค้าจริงมีแค่ 2 กลุ่ม: (1) ซื้อ/ฝากขายบ้าน กับ (2) ต้องการที่ปรึกษา/inspector ด้านงานก่อสร้าง นี่คือการแก้ไข business fact ที่กระทบเอกสารและโค้ดหลายจุด เพราะ `BRAND_FACTS`, `KEYWORDS`, `BUYER_SEGMENTS`, `STYLES`, และ system prompt ทุกอันใน `AIContent.tsx` เขียนด้วยสมมติฐานว่า Finnhouses เป็น "บริษัทรับสร้างบ้านคุณภาพสูง" มาตั้งแต่ต้น (ตรงกับ Business Unit 1 ใน `BUSINESS_MODEL.md` ที่ก็ผิดเช่นกัน)

**ทางเลือกที่ประเมิน** (ถาม Archi ผ่าน AskUserQuestion 2 ข้อก่อนแก้):
1. ประเภทธุรกิจใหม่ควรเขียนว่าอะไร → Archi เลือก **"นายหน้าอสังหาฯ + ที่ปรึกษาตรวจสอบงานก่อสร้าง"**
2. STYLES (Contemporary/Nordic/Minimal ฯลฯ — house design style selector) ยังจำเป็นไหม → Archi เลือก **เอาออก ไม่เกี่ยวกับธุรกิจแล้ว**

**Decision**: รีแบรนด์ `components/AIContent.tsx` ทั้งไฟล์ให้ตรงกับธุรกิจจริง:
- `BRAND_FACTS`: ประเภทธุรกิจ, Brand Philosophy, 3T guidelines, Buyer Emotional Reality, Buyer Psychology Level 3, Buyer Segments (3→2), Buyer Intelligence bullet ที่อ้างอิงงานก่อสร้าง — เขียนใหม่ทั้งหมด + เพิ่มบรรทัด "ห้ามพูดว่า Finnhouses เป็นผู้รับเหมา/ผู้สร้างบ้านเองเด็ดขาด" เข้า guardrail
- `KEYWORDS`: ทิ้ง keyword สไตล์บ้าน/BOQ/เลือกผู้รับเหมา ทั้งหมด แทนที่ด้วย 2 ชุดใหม่ตรงกลุ่มลูกค้าจริง (ซื้อ/ฝากขายบ้าน 9 คำ, ที่ปรึกษา/ตรวจสอบ 9 คำ) + ปรับ 3T/life-moment keyword ที่เหลือให้ไม่มี "สร้างบ้าน"
- `BUYER_SEGMENTS`: จาก 3 ("build_handsoff", "build_handson", "resale") → 2 ("resale" คงเดิมเพื่อไม่กระทบ `ListingTab` ที่ hardcode หา value นี้, เพิ่ม "inspection" ใหม่)
- `STYLES`: **ลบทิ้งทั้งหมด** — selector UI, hashtag logic, `generateImageConcept()`/`generateImage()` เปลี่ยนจาก "house style" เป็น real-estate photo concept ทั่วไป
- ทุก system prompt (`KeywordTab`, `BlogConvertTab`, `ListingTab`) และ `FB_QUEUE_TEMPLATES` (manual FB queue templates ที่ยิงตรงเข้า Facebook ได้) — เขียนใหม่ให้ตรง business จริง รวมถึงลบ fabricated claims เดิมที่ขัดกับกฎ "ห้ามปั้นตัวเลข" อยู่แล้ว (เช่น "ประสบการณ์สร้างบ้านกว่า 50 หลัง", "รับประกันงาน 2 ปี")

**Files**: `components/AIContent.tsx` (ใหญ่ที่สุด — 106 insertions / 141 deletions), `docs/BUSINESS_MODEL.md` (mark Business Unit 1 discontinued), `CLAUDE.md`, `docs/glossary.md`

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาดหลังแก้ทุกจุด, ✅ ทดสอบ generate จริงบน production — output เป็น "ฝากขายบ้านกับ Finnhouses" ไม่มีภาษา home-building ปนแล้ว (ดู screenshot ที่ Archi ส่งมายืนยัน)

**ยังไม่ได้ทำ**: Business Unit 3 (Fix & Flip) ใน `BUSINESS_MODEL.md` ยังไม่ยืนยันสถานะ — ต้องถาม Archi ก่อนแก้ Intelligence Loop diagram หรืออ้างอิงในเอกสารอื่นต่อ

**Related**: ADR-009 (ship พร้อมกันในวันเดียวกัน), `docs/issues-log.md` ISSUE-015

---

## ADR-011 — Business Unit 3 (Fix & Flip) ยืนยัน active + สัดส่วนธุรกิจจริง 3 หน่วย
**Date**: 2026-07-20 (session 26, ต่อ)
**Status**: Documented ✅ (code — AI Content Studio ยังไม่ได้ทำ ดู "ยังไม่ได้ทำ" ด้านล่าง)

**Context**: ADR-010 ทิ้งคำถามค้างไว้ว่า Business Unit 3 (Fix & Flip / รีโนเวทเพื่อขาย) ยังทำอยู่จริงหรือไม่ เพราะไม่ได้ถูกพูดถึงตรงๆ ตอน Archi ยืนยัน "ลูกค้าผมมีแค่ 2 กลุ่ม" (ตอนนั้นหมายถึงกลุ่มลูกค้าปลายทาง ไม่ใช่หน่วยธุรกิจภายใน) วันนี้ Archi ยืนยันตรงๆ ว่า Unit 3 ยังทำอยู่จริง และให้สัดส่วนธุรกิจจริงทั้ง 3 หน่วย: **Develop/Fix & Flip 60% · ที่ปรึกษา/ตรวจสอบงานก่อสร้าง (Unit 4) 30% · โบรกเกอร์ (Unit 2) 10%**

ระหว่างถามยืนยัน มีความเสี่ยงสับสนที่ต้อง clarify ก่อนแก้เอกสาร: คำว่า "Develop" ที่ Archi ใช้ อาจหมายถึง Fix & Flip (Unit 3) หรือกลับไปหมายถึงรับสร้างบ้านใหม่ (Unit 1 ที่ discontinued ไปแล้วใน ADR-010) — ถามยืนยันผ่าน AskUserQuestion แล้วได้คำตอบชัดเจนว่า **"Develop" = Fix & Flip (Unit 3 เดิม)** ไม่ใช่ Unit 1 — Unit 1 ยังคง discontinued เหมือนเดิม ไม่มีการ revert

**Decision**: อัปเดต `docs/BUSINESS_MODEL.md`:
- Unit 3 (Fix & Flip): ลบ flag "สถานะยังไม่ยืนยัน" ออก ระบุชัดว่าเป็น**หน่วยธุรกิจหลัก 60%** พร้อมหมายเหตุกันสับสนว่าไม่ใช่ Unit 1 (รับเหมาสร้างบ้านใหม่ — ยัง discontinued)
- Unit 2 (โบรกเกอร์): ระบุสัดส่วน 10%
- Unit 4 (ที่ปรึกษา/ตรวจสอบ): ระบุสัดส่วน 30%
- Intelligence Loop diagram note: อัปเดตว่า Unit 3 confirmed แล้ว แต่ diagram เองยังไม่ได้ redesign ให้ตรงกับ 3 หน่วยจริง (ทิ้งไว้เป็น follow-up)

**Files**: `docs/BUSINESS_MODEL.md`

**ยังไม่ได้ทำ**: AI Content Studio (`components/AIContent.tsx`) ยังมีแค่ 2 buyer segment (โบรกเกอร์ + ที่ปรึกษา) ไม่มี segment/keyword set สำหรับ Fix & Flip เลย ทั้งที่ตอนนี้ยืนยันแล้วว่าเป็น **60% ของธุรกิจ — สัดส่วนใหญ่ที่สุด** เป็นช่องว่างที่ควรถาม Archi ต่อว่าต้องการให้ content engine ครอบคลุม Fix & Flip ด้วยหรือไม่ (เช่น content เชิญชวนนักลงทุน, อัปเดตความคืบหน้ารีโนเวท ฯลฯ) — ยังไม่ได้ทำเพราะเป็นงานขนาดใหญ่เทียบเท่า ADR-010 ควรถามขอบเขตก่อนเริ่ม

**Related**: ADR-010

---

## ADR-012 — แก้ AI Content Studio ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ (2 root cause ซ้อนกัน)
**Date**: 2026-07-20 (session 27)
**Status**: Implemented ✅

**Context**: Archi ส่ง FB post ที่ generate จาก AI Content Studio (KeywordTab, โทน 3T/ที่ปรึกษาตรวจสอบ) มาให้ตรวจ พบปัญหาภาษา 2 แบบปนกัน: hashtag สุดท้ายตัดกลางคำ (`#ความมั่นใ`) และคำเพี้ยนกลางประโยค (`ถามผู้รับเหมาก็ไม่วัใจ` — ที่ถูกคือ "วางใจ") พร้อม hook ที่ผสมภาษาของกลุ่มลูกค้าคนละกลุ่มเข้าด้วยกัน

**วิเคราะห์แยก 2 สาเหตุ** (ตำแหน่งคำที่ผิดชี้สาเหตุคนละแบบ — ท้ายข้อความ = truncation, กลางประโยค = model quality ไม่ใช่ truncation เพราะ truncation ตัดได้แค่ท้ายสุดของ generation):
1. **maxTokens ต่ำเกินไป**: `callClaude()` helper ส่ง `maxTokens: 800` fixed แต่เนื้อหา FB post ที่ต้องการ (~220 คำภาษาไทย + hashtag 6-8 อัน) ใช้ output token มากกว่านั้นมาก เพราะภาษาไทย tokenize หนักกว่าอังกฤษหลายเท่า → โดนตัดกลางประโยค/hashtag เมื่อเนื้อหายาว (`route.ts` เองก็ cap ไว้ที่ 2000 อยู่แล้ว แปลว่า client เคย request ต่ำกว่า cap มาตลอด)
2. **Model ไม่สม่ำเสมอ**: `KeywordTab.generate()` (จุด generate FB post หลักที่ใช้บ่อยที่สุด) เรียก `callClaude(system, prompt)` โดยไม่ระบุ `model` → หลุดไปใช้ default `claude-haiku-4-5-20251001` ทั้งที่ `BlogConvertTab`/`ListingTab` ระบุ `"claude-sonnet-4-6"` ชัดเจนอยู่แล้ว ตรงกับคอมเมนต์ในโค้ด `route.ts` เองว่า "pass claude-sonnet-4-6 for higher quality Thai writing" — Haiku ภายใต้ system prompt ที่ซับซ้อนหนาแน่น (positioned/3T/heartfelt conditional blocks ต่อกันยาว) ผลิตคำเพี้ยน/ตัดพยางค์ได้แม้ไม่ชนขีดจำกัด token เลย

**Decision**: แก้ `components/AIContent.tsx` 2 จุด — (1) `callClaude()` default `maxTokens` 800→2000 ให้ตรงกับ cap ของ route.ts (2) `KeywordTab.generate()` เรียก `callClaude(system, prompt, "claude-sonnet-4-6")` ให้ตรงกับอีก 2 tab ที่ใช้ Sonnet อยู่แล้ว — ตอนนี้ทั้ง 3 จุด generate เนื้อหาไทย user-facing ใช้ Sonnet ตรงกันหมด

**Files**: `components/AIContent.tsx`

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด, ✅ deploy ยืนยันผ่าน Vercel MCP (`list_deployments` เทียบ commit ตรงกับที่ push), ✅ Archi ทดสอบ regenerate จริงบน production — hashtag ครบ ประโยคจบสมบูรณ์ ไม่มีคำเพี้ยนอีก

**กฎใหม่**: เนื้อหาภาษาไทยที่จะโพสต์จริง (user-facing) ต้องใช้ Sonnet เป็นค่าเริ่มต้นเสมอ ไม่ใช่ Haiku — Haiku เก็บไว้ใช้กับงานที่ไม่ใช่ผู้ใช้ปลายทางเห็นโดยตรง (เช่น `generateImageConcept()` ที่เป็นแค่ prompt ภาษาอังกฤษสั้นๆ ส่งต่อให้ image API) ก่อนเพิ่ม `generate()` function ใหม่ใดๆ ที่เรียก `callClaude()` ต้องเช็ค default model ให้ตรงตามนี้เสมอ อย่าปล่อยให้ "ลืมใส่ model argument" กลายเป็น production bug ซ้ำอีก

**Related**: ADR-010 (โค้ดเดียวกันที่เพิ่งรีแบรนด์), `docs/issues-log.md` ISSUE-016

---

## ADR-013 — เพิ่ม "Platform Structure — 2 Pillars" ใน BUSINESS_MODEL.md ตามกรอบคิดของ Archi
**Date**: 2026-07-20 (session 27)
**Status**: Documented ✅

**Context**: Archi อธิบายว่ามองแพลตฟอร์มแบ่งเป็น 2 ส่วนใหญ่ตามการใช้งานจริง: (1) การตลาดและขาย (2) การบริหารงานก่อสร้าง — พร้อมยกตัวอย่าง tool ที่อยู่ในกลุ่ม 2 คือ Land Analyzer, Budget Tool, QC — `BUSINESS_MODEL.md` เดิมมีแค่ list "7 Intelligence Modules" แบบเรียบๆ ไม่มีกรอบคิดนี้บันทึกไว้เลย

**Decision**: เพิ่ม section "Platform Structure — 2 Pillars" ใต้ "Core Platform: AP-Home Platform OS":
- **การตลาดและขาย**: AI Content Studio, CRM, OS Dashboard — สนับสนุน Unit 2 (โบรกเกอร์) + ฝั่งขายของ Unit 3 (Fix & Flip)
- **การบริหารงานก่อสร้าง**: Land Analyzer, Budget Tool, QC — สนับสนุนฝั่งปฏิบัติการของ Unit 3 + Unit 4 (ที่ปรึกษา/ตรวจสอบ) โดยตรง (QC คือ product implementation ของ Unit 4)
- ตามด้วย follow-up clarification จาก Archi: **7 Intelligence Modules ไม่ได้แยกคนละ pillar** แต่เชื่อมโยงข้อมูลซึ่งกันและกันทั้งหมดเพื่อใช้เป็นกลยุทธ์ในการบริหารภาพรวม (เช่น Construction Intelligence จาก QC ป้อนกลับเข้า Renovation Intelligence ที่ใช้ตัดสินใจ Fix & Flip ครั้งถัดไป) — ทั้ง 2 pillar ดึง/ป้อนข้อมูลเข้า loop เดียวกันตลอด ไม่ใช่ silo

**Files**: `docs/BUSINESS_MODEL.md`

**Related**: ADR-011 (สัดส่วนธุรกิจ 3 หน่วยที่ 2 pillar นี้ map ไปหา)

---

## ADR-014 — Fix & Flip Deals module: native deal pipeline สำหรับ Business Unit 3 (60% ของธุรกิจ)
**Date**: 2026-07-22
**Status**: Implemented ✅

**Context**: ADR-011 ทิ้งช่องว่างไว้ว่า Fix & Flip (Unit 3, 60% ของธุรกิจ) ไม่มีเครื่องมือ dedicated ติดตามดีลเลย — Land Analyzer/Budget Tool เป็นแค่ calculator ครั้งเดียว ไม่มี pipeline state (ประเมิน → รีโนเวท → ประกาศขาย → ปิดดีล) Archi ถามความเห็นว่าควรเอา Obsidian มาจัดระบบงานแทน หรือควรสร้างเครื่องมือ native ใน platform — พิจารณาแล้วเสนอว่า Obsidian เป็น external tool ที่ไม่เชื่อมข้อมูลจริงกับ Supabase/CRM ไม่ตอบโจทย์ที่ Archi ต้องการจริงๆ คือ "เครื่องมือที่ช่วยบริหารทั้ง 3 ธุรกิจ" — เสนอสร้างโมดูล native แทน Archi อนุมัติหลังดู demo (Kanban 4 stage)

**Decision**: สร้าง "Fix & Flip Deals" เป็นหน้าใหม่ในแพลตฟอร์ม (`/deals`) แทนที่จะสร้างตาราง Supabase ใหม่ ใช้ตาราง `reno_deals` ที่มีอยู่แล้วแต่ไม่เคยถูกใช้งานจริง (0 rows, ไม่มี reference ในโค้ดเลยทั้ง `app/` และ `components/`) — เลือกต่อยอดแทนสร้างตารางซ้ำเพื่อไม่ให้เกิดปัญหาระบบซ้อนแบบ Hub v1/v2 หรือ fb-backend service ที่เคยเกิดในโปรเจกต์นี้

**สิ่งที่ทำจริง**:
1. Migration `reno_deals_add_pipeline_fields` — เพิ่มคอลัมน์ `name`, `stage` (enum CHECK: evaluating/renovating/listed/closed, default evaluating), `reno_budget`, `list_price`, `lead_id` (FK → `leads.id`), `updated_at` เข้ากับ schema เดิม (property_address, purchase_price, reno_cost, sale_price, roi_pct, area, reno_type, days_to_sell, notes, created_at)
2. Security: พบว่า `reno_deals` มี policy `anon_read` (roles: anon, SELECT, qual: true) เปิดโล่งอยู่ก่อนแล้ว — DROP ทิ้งในการ migration เดียวกัน (ก่อนที่จะมีข้อมูลการเงินจริงเข้าไป) เหลือแค่ `service_role_all` — ตรงกับ pattern ISSUE-013 (leads/projects)
3. API routes ฝั่ง server: `app/api/deals/route.ts` (GET list, POST create), `app/api/deals/[id]/route.ts` (PATCH, DELETE) — ใช้ `SUPABASE_SERVICE_KEY` เท่านั้น มิเรอร์ pattern เดียวกับ `/api/projects` และ `/api/leads/[id]` เป๊ะ
4. UI: `components/Deals.tsx` — Kanban board 4 stage (กำลังประเมิน/กำลังรีโนเวท/ประกาศขาย/ปิดดีลแล้ว) พร้อม summary metrics (จำนวนดีล active/closed, เงินทุนที่ใช้อยู่, ROI เฉลี่ยดีลที่ปิดแล้ว), การ์ดดีลมี progress bar งบรีโนเวทเทียบยอดใช้จริง, ปุ่มย้าย stage ◀▶ และลบดีล
5. `app/deals/page.tsx` (page wrapper) + เพิ่ม nav entry ใน `components/Sidebar.tsx`

**Files**: `app/api/deals/route.ts`, `app/api/deals/[id]/route.ts`, `components/Deals.tsx`, `app/deals/page.tsx`, `components/Sidebar.tsx`, Supabase migration `reno_deals_add_pipeline_fields`

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ `get_advisors` (security) ยืนยันไม่มี WARN/ERROR ใหม่ — `reno_deals` เหลือ policy เดียวคือ `service_role_all` (ยืนยันด้วย `pg_policies` query ตรง)

**ยังไม่ได้ทำ**: ยังไม่ผูก `lead_id` เข้ากับ CRM UI จริง (คอลัมน์มีแล้วแต่ฟอร์มยังไม่มีตัวเลือกเชื่อม lead) — เป็น follow-up ทีหลังถ้า Archi ต้องการ link ดีลกับ lead ต้นทาง

**Related**: ADR-011 (ระบุ Unit 3 = 60% แต่ไม่มีเครื่องมือ), ADR-008/ISSUE-013 (RLS lockdown pattern ที่ใช้ซ้ำ)

---

## ADR-015 — QC Line Accuracy Dashboard (Phase 1): infra พร้อมใช้ แม้ข้อมูลยังไม่พอสรุป
**Date**: 2026-07-22 (session 28 ต่อ)
**Status**: Implemented ✅

**Context**: บทสนทนา reflective กับ Archi เรื่องความกังวลว่า "ระบบทำงานได้" กับ "ระบบพิสูจน์ตัวเองว่าทำงานถูก" เป็นคนละเรื่องกัน — ยกตัวอย่าง QC Line ที่ AI ตรวจ QC ผ่าน LINE แต่ไม่มีที่ไหนสรุปว่า AI ตรวจถูกกี่ % จริง ต้องเป็น Archi เองที่คอยเช็คทุกครั้ง ถามต่อ "แล้วไงต่อหล่ะทีนี้" เสนอแผน 3 phase (QC accuracy dashboard / auto-publish quality gate / Fix & Flip ROI actual-vs-estimated) — Archi เลือก Phase 1 ก่อน

ระหว่างสำรวจข้อมูลจริงก่อนสร้าง พบว่า `qc_inspections` มีแค่ 20 แถวทั้งหมด (มาจาก test batch สัปดาห์เดียว 2026-06-26 ถึง 2026-07-02 เท่านั้น ไม่มีงานตรวจ QC เข้ามาอีกเลยหลังจากนั้น) และมีแค่ 1 แถวที่ผู้ตรวจกดปุ่ม "✅/❌" ยืนยันผล (`human_feedback`) — แจ้ง Archi ตรงๆ ก่อนลงมือสร้าง แทนที่จะสร้าง dashboard ที่โชว์ 100% จาก n=1 อย่างเงียบๆ ซึ่งจะเป็นตัวอย่างของปัญหาเดียวกันที่ Archi เพิ่งกังวลไว้ (ระบบดูเหมือนทำงานถูก แต่ที่จริงพิสูจน์ตัวเองไม่ได้) Archi ยืนยันว่าช่วงนี้ไม่มีงานก่อสร้างที่ต้องตรวจจริง (ปัจจัยธุรกิจตามฤดูกาล ไม่ใช่ระบบพัง) และเลือกให้สร้าง dashboard เป็น infra รอไว้เลย

**Decision**: สร้าง `/api/qc/accuracy` (server-side, `SUPABASE_SERVICE_KEY`) คำนวณสถิติจาก `qc_inspections.human_feedback` พร้อม **RELIABILITY_THRESHOLD = 10** แถวที่มี feedback ก่อนจะยอมโชว์ % ความแม่นยำเป็นตัวเลขหลัก — ถ้าต่ำกว่านี้ (ซึ่งเป็นสถานะปัจจุบัน 1/20) UI จะโชว์การ์ดสีเหลือง "ยังไม่มีข้อมูลพอสรุป" พร้อมตัวเลขจริง (20 ตรวจ, 1 ยืนยัน) แทนเปอร์เซ็นต์ที่เข้าใจผิดได้ ต่อ tab ใหม่ "🔍 QC Accuracy" ใน `DashboardOS.tsx` (`components/QcAccuracy.tsx`) พร้อม breakdown by severity, feed รายการล่าสุด, และ warning แยกต่างหากถ้า feedback-adoption rate ต่ำ (ปัญหาคนละเรื่องกับ volume — แม้ QC volume กลับมาเยอะ ถ้าไม่มีใครกดปุ่มยืนยัน dashboard นี้ก็ยังสรุปอะไรไม่ได้อยู่ดี)

**Files**: `app/api/qc/accuracy/route.ts`, `components/QcAccuracy.tsx`, `components/DashboardOS.tsx` (เพิ่ม tab)

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ `get_advisors` (security) ไม่มี WARN/ERROR ใหม่ — ไม่ได้แก้ schema/RLS ของ `qc_inspections` เลย (อ่านผ่าน service_role อย่างเดียว ตรงกับ pattern ที่ ADR-008/013 ล็อกไว้ตั้งแต่ session 23 อยู่แล้ว)

**ยังไม่ได้ทำ**: Phase 2 (auto-publish quality gate) และ Phase 3 (Fix & Flip Deal ROI actual-vs-estimated) — รอ Archi ตัดสินใจลำดับความสำคัญต่อ ไม่เริ่มเองโดยไม่ถาม

**Related**: `CLAUDE.md` Pending Tasks, ADR-014 (Deals module ที่สร้างก่อนหน้าในวันเดียวกัน)

---

## ADR-016 — WF1 AI Quality Gate (Phase 2): เช็คเนื้อหาจริงก่อน publish ไม่ใช่แค่โครงสร้าง
**Date**: 2026-07-23 (session 29)
**Status**: Implemented in workflow file ✅ — **ยังไม่ได้ import/active ใน n8n จริง** (รอ Archi import + ทดสอบ)

**Context**: ต่อจาก Phase 1 (QC Accuracy Dashboard, ADR-015) และบทสนทนา reflective เรื่อง "ระบบพิสูจน์ตัวเองว่าทำงานถูก" — ตรวจสอบพบว่า WF1 (Blog auto-publish) มี "Publish Guard + Dedupe History" node อยู่แล้ว แต่เช็คแค่**โครงสร้าง**ล้วนๆ (ความยาว title/slug ≥ ค่าที่กำหนด, มี FAQ schema, ไม่มี `<h1>` ซ้ำ, slug ไม่ซ้ำ ฯลฯ) — **ไม่มีการเช็คเนื้อหาจริงเลยแม้แต่จุดเดียว** ว่าตรงกับโมเดลธุรกิจจริงหรือไม่, มีคำที่ห้ามพูด (เช่น อ้างว่า Finnhouses รับสร้างบ้านเอง — discontinued ตาม ADR-010) หรือไม่, ภาษาไทยเพี้ยน/ตัดกลางคำแบบที่เจอใน ISSUE-016 หรือไม่ — engine publish อัตโนมัติทุกวันโดยไม่มีใครอ่านเนื้อหาก่อนเลย

ถาม Archi ผ่าน AskUserQuestion 2 ข้อก่อนแก้: (1) อยากให้ gate เช็คเรื่องอะไร → เลือก **ทั้งหมด** (brand guardrail + ภาษาไทยสมบูรณ์ + ความถูกต้องเชิงข้อเท็จจริง) (2) ถ้าไม่ผ่านให้ทำอะไร → เลือก **บล็อกอัตโนมัติ + แจ้งเตือน** (เหมือน Publish Guard เดิม ไม่ auto-retry เพื่อกัน infinite loop)

**Decision**: เพิ่ม 4 node ใหม่เข้า WF1 (`Finnhouses WF1 — Article + Publish (10_ai_quality_gate).json`) โดยไม่แก้ node เดิมเลยแม้แต่บรรทัดเดียว (ยกเว้นจุดต่อสาย/reposition คอสเมติก):
1. **AI Quality Gate** — เรียก `@n8n/n8n-nodes-langchain.openAi` (gpt-4o-mini, credential เดิม `OpenAI account` ที่ WF1/WF2 ใช้อยู่แล้ว) fan-out ขนานจาก "Prepare Post Payload" (สาขาที่ 3 นอกจาก "Check Existing Post by Slug" กับ "Publish Guard + Dedupe History" เดิม) ส่ง title/slug/content เข้าไปให้ตรวจ 3 เงื่อนไข: `brand_guardrail_violation`, `thai_language_incoherent`, `unverifiable_factual_claim` — บังคับ prompt ระบุ business model จริง (นายหน้า + Fix & Flip + ที่ปรึกษาตรวจสอบ ไม่ใช่ผู้รับเหมา) ตอบกลับ JSON ล้วน `{pass, reasons[]}`
2. **Parse AI Gate Result** (Code) — parse JSON output, **fail-open ถ้า parse error/AI เรียกไม่สำเร็จ** (ไม่บล็อกเพราะ gate เองมีปัญหา infra — ป้องกันไม่ให้ AI API ล่มแล้วบล็อก queue ทั้งหมดเงียบๆ) fail-closed เฉพาะตอนโมเดลตอบ `pass:false` จริงเท่านั้น
3. **Merge Guards** (n8n Merge, combineByPosition) — รวม output ของ "Publish Guard + Dedupe History" (เดิม) กับ "Parse AI Gate Result" (ใหม่) เข้าด้วยกัน
4. **Combine Guards** (Code) — รวม `publish_guard_reasons` (structural) + `ai_gate_reasons` (AI) เป็น array เดียว คง field name `publish_guard_ok`/`publish_guard_reasons` เป๊ะตามเดิม — ทำให้ "IF Publish Guard Passed", "Blocked Log", "Notify Hub Blocked" **ไม่ต้องแก้เลยแม้แต่บรรทัดเดียว** เพราะยังอ่าน field เดิมที่ชื่อเดิมอยู่

**สิ่งที่พบระหว่างทาง (ไม่ได้แก้ในรอบนี้ — flag ไว้)**: "Check Existing Post by Slug" (WP dedupe lookup) ไม่มีการต่อสายเข้าที่ไหนเลยใน `connections` graph ของไฟล์ 9_queue_sync_fix ที่ใช้งานจริงตอนนี้ — แปลว่า `duplicate_slug_exists` ใน Publish Guard เดิมน่าจะไม่เคย fire จริง (เพราะ `items[1]` ที่โค้ดอ้างถึงไม่มีทางมีข้อมูลจากสายที่ขาดหายนี้) เป็น latent bug ที่มีมาก่อนรอบนี้ ไม่เกี่ยวกับ Phase 2 — ต้องยืนยันใน n8n canvas จริงก่อนแก้ (ไฟล์ static อ่านได้แค่ระดับนี้)

**Files**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (10_ai_quality_gate).json` (ไฟล์ใหม่ — ไฟล์เดิม `(9_queue_sync_fix)` ไม่ถูกแตะ)

**Verify (ทำได้ในรอบนี้)**: ✅ parse JSON ผ่าน python `json.load`, ✅ trace connections graph โปรแกรมได้ยืนยัน: ไม่มี node ชื่อซ้ำ/id ซ้ำ, ทุก connection source/target ชี้ไปยัง node ที่มีจริง, ทุก node reachable จาก Webhook trigger, "Merge Guards" มี input ครบ 2 ทาง (index 0 = structural, index 1 = AI), "IF Publish Guard Passed" ถูกป้อนโดย "Combine Guards" เท่านั้น (ไม่ใช่ตรงจาก Publish Guard เดิมอีกแล้ว)

**Update (ทดสอบจริงใน n8n โดย Archi, วันเดียวกัน)**: Import ไฟล์เข้า n8n สำเร็จ, wiring ตรงตามที่ออกแบบไว้เป๊ะ — ทดสอบผ่าน pinned data + ยิง Webhook Test URL จริง (ไม่ใช้ "Execute step" แยก node เพราะ n8n instance นี้ไม่ render output/error ของการเทสแบบแยก node ให้เห็น — เป็นข้อจำกัดของ n8n UI ไม่ใช่ node พัง, ยืนยันด้วยการเทียบกับ "Message a model1" ที่พิสูจน์แล้วว่าใช้งานได้จริง) พบ **false positive จริง 1 ครั้ง**: prompt draft แรกให้ AI ตีความ "ทีมที่ปรึกษาตรวจสอบงานก่อสร้างของเรา" (ธุรกิจจริง Unit 4) เป็น `brand_guardrail_violation` เพราะ gpt-4o-mini pattern-match คำว่า "งานก่อสร้าง"+"ของเรา" มากเกินไปโดยไม่สนใจ context "ตรวจสอบ"/"ที่ปรึกษา" ที่อยู่ข้างหน้า — แก้โดยเพิ่ม **few-shot examples ที่ยกประโยคจริงมาเทียบตรงๆ** (ตัวอย่าง "ผ่านปกติ" 3 อัน + "ต้อง flag" 4 อัน) แทนการอธิบายเป็นกฎนามธรรมอย่างเดียว — หลังแก้ ทดสอบซ้ำทั้ง fail-case (`ai_gate_pass:false, reasons:["brand_guardrail_violation"]`) และ pass-case เดิมที่เคย false-positive (`ai_gate_pass:true, reasons:[]`) ผ่านทั้งคู่ — prompt เวอร์ชันนี้ sync กลับเข้าไฟล์แล้ว (เดิมไฟล์ที่ deliver ครั้งแรกเป็นแค่ draft ที่ยังไม่ verify)

**Files (sync หลัง verify)**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (10_ai_quality_gate).json` อัปเดต prompt เป็นเวอร์ชัน few-shot ที่ verify แล้ว + เคลียร์ `pinData` ทิ้ง (ไฟล์ที่ deliver ต้องไม่มี test dataติดไปด้วย)

**บทเรียนสำคัญ**: โมเดลขนาดเล็ก (gpt-4o-mini) ต้องการ **ตัวอย่างประโยคจริงเทียบชัดๆ** มากกว่าคำอธิบายกฎแบบนามธรรม แม้จะเขียนกฎชัดแล้วในรอบแรกก็ยังพลาดได้ — เวลาตั้ง guardrail ด้วย LLM ควรทดสอบกับ "เนื้อหาดีที่ควรผ่าน" เสมอ ไม่ใช่แค่ทดสอบเคส "เนื้อหาแย่ที่ควรบล็อก" อย่างเดียว เพราะ false positive (บล็อกของดีทิ้ง) อันตรายพอๆ กับ false negative (ปล่อยของแย่ผ่าน) ในระบบ auto-publish

**ยังไม่ได้ทำ**: ยังต้อง unpin data ที่ "Prepare Post Payload" ใน n8n จริง (คนละที่กับไฟล์ — ไฟล์เคลียร์แล้ว แต่ instance ที่ Archi แก้สดๆ อาจยังมี pin ค้างอยู่) + เปิด "Create a post" กลับ + activate workflow (10) + deactivate workflow (9) เดิม ก่อน cron รอบถัดไปจะรัน — ดู CLAUDE.md

**Related**: ADR-015 (Phase 1), ADR-010/ISSUE-016 (business guardrail + Thai quality ที่ gate นี้ป้องกันไม่ให้เกิดซ้ำในระดับ auto-publish), ISSUE-014 (Publish Guard เดิม/Notify Hub Blocked pattern ที่นำมาใช้ซ้ำ)

**Update ท้ายสุด (Archi ยืนยัน, วันเดียวกัน)**: ทำ go-live checklist ครบทั้ง 5 ข้อ — unpin "Prepare Post Payload", เปิด "Create a post" กลับเป็น Active, publish/activate workflow (10_ai_quality_gate), deactivate workflow (9_queue_sync_fix) เดิม → **สถานะ: LIVE ✅ ใน production ตั้งแต่วันนี้** รอดู cron รอบถัดไป (~09:00) ว่าเนื้อหาจริงผ่าน gate ปกติ

---

## ADR-017 — Fix & Flip Deal ROI: Actual-vs-Estimate tracking (Phase 3)
**Date**: 2026-07-23 (session 29 ต่อ)
**Status**: Implemented ✅

**Context**: Phase 3 ตามแผน 3 phase เดิม (หลัง Phase 1 QC Accuracy Dashboard และ Phase 2 WF1 AI Quality Gate) — ตรวจสอบ `components/Deals.tsx` (สร้างไว้ก่อนหน้าใน ADR-014) พบว่า **ไม่มีทางกรอกตัวเลขจริงเข้าไปได้เลยแม้แต่จุดเดียว**: ฟอร์มสร้างดีลมีแค่ `purchase_price`/`reno_budget`/`list_price` (ตัวเลขประมาณ) เท่านั้น ส่วน `reno_cost`/`sale_price`/`roi_pct` (ตัวเลขจริง) มีคอลัมน์อยู่ใน schema แล้วแต่ไม่มี UI ไหนเขียนค่าเข้าไปเลย — และตรวจ `reno_deals` ผ่าน Supabase พบว่า **มี 0 แถวจริง** (ยังไม่มีใครใช้งานจริง) เหมือนสถานการณ์ n=1 ของ Phase 1 (QC feedback) ทุกประการ — สร้าง infra รอไว้ก่อนที่ข้อมูลจะเข้าจริงเป็นแนวทางเดียวกัน ไม่ใช่ปัญหา

**Decision**: เพิ่มความสามารถ "ใส่ต้นทุน/ราคาขายจริง" เข้า `components/Deals.tsx` โดยไม่แก้ schema/API เลย (PATCH endpoint เดิมรับ field อะไรก็ได้อยู่แล้ว):
1. ปุ่ม "✎ ใส่ต้นทุน/ราคาขายจริง" บนการ์ดดีลแต่ละใบ → เปิด mini-form (reno_cost, sale_price) → บันทึกผ่าน `PATCH /api/deals/{id}` เดิม
2. คำนวณ `roi_pct` อัตโนมัติตอนบันทึก: `((sale_price - purchase_price - reno_cost) / (purchase_price + reno_cost)) * 100` — ไม่ต้องให้ผู้ใช้คำนวณเอง
3. แสดง variance ต่อการ์ด: งบรีโนเวท vs ต้นทุนจริง (เกิน/ต่ำกว่างบ ฿ + %), ราคาประกาศ vs ราคาขายจริง (สูง/ต่ำกว่า %)
4. เพิ่มการ์ดสรุประดับพอร์ต "ความแม่นยำของการประมาณการ" ในส่วนหัว — เฉลี่ย cost variance % และ price variance % ข้ามทุกดีลที่มีทั้งค่าประมาณและค่าจริงครบคู่ (`n=` แสดงจำนวนตัวอย่างเสมอ) — **ใช้ honest empty-state pattern เดียวกับ ADR-015**: ถ้ายังไม่มีดีลไหนกรอกครบคู่เลย (ตอนนี้ n=0) แสดงข้อความเตือนสีเหลือง "ยังไม่มีข้อมูลพอสรุป" แทนเปอร์เซ็นต์ที่คำนวณจาก sample ว่างเปล่า

**Files**: `components/Deals.tsx` เท่านั้น (ไม่แตะ `app/api/deals/*`, schema, RLS — PATCH endpoint เดิมรองรับอยู่แล้วเพราะไม่จำกัด field)

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด — ไม่แตะ schema/RLS จึงไม่ต้องรัน `get_advisors` ซ้ำ (ADR-014 ล็อกไว้แล้วว่า `reno_deals` เหลือ policy เดียว `service_role_all`)

**สถานะข้อมูลจริงตอนนี้ (ต้องแจ้ง Archi ตรงๆ)**: `reno_deals` มี **0 แถว** ณ วันที่สร้างฟีเจอร์นี้ — การ์ด "ความแม่นยำของการประมาณการ" จะโชว์สถานะ "ยังไม่มีข้อมูลพอสรุป" ทันทีที่เปิดหน้า จนกว่าจะมีการสร้างดีลจริง + กรอกตัวเลขจริงอย่างน้อย 1 ดีล ครบทั้งคู่ (ประมาณ+จริง) — เป็นพฤติกรรมที่ตั้งใจออกแบบไว้ ไม่ใช่บั๊ก

**Related**: ADR-014 (Deals module เดิม, `reno_deals` schema), ADR-015 (honest low-data-state pattern ต้นแบบ)

---

## ADR-018 — CRM/Overview leads ยังผูก business_unit กับ Unit 1 ที่เลิกทำแล้ว: แก้ default/type ให้ตรงจริง
**Date**: 2026-07-23 (session 29 ต่อ, หลัง Phase 3)
**Status**: Implemented ✅

**Context**: Archi เปิด `/deals` แล้วบังเอิญกลับไปดู Overview tab เจอการ์ด "รับสร้างบ้าน" (Unit 1, ยุติธุรกิจแล้วตาม ADR-010/012 — session 26-27) ยังโชว์ตัวเลข Leads = 1 อยู่ ขอให้ตรวจสอบ → พบว่า ADR-010/012 แก้แค่ `components/AIContent.tsx` (BRAND_FACTS/KEYWORDS/BUYER_SEGMENTS) ตอนนั้น **ไม่เคยแตะ CRM lead-tagging กับ Overview dashboard เลย** เป็นช่องว่างที่ตกหล่นไป 2 รอบติด — ตรวจเจอ 3 จุดจริง:
1. `components/CRM.tsx` — type `business_unit: "build"|"reno"|"list"`, ฟอร์มเพิ่ม Lead มีตัวเลือกแค่ 3 อัน (🏗️รับสร้างบ้าน, 🔨รีโนเวท, 🏠ฝากขาย) **ไม่มีตัวเลือก Unit 4 (ที่ปรึกษา/ตรวจสอบ, 30% ของรายได้จริงตาม ADR-011) เลย** และ default form value เป็น "build" (หน่วยที่เลิกทำแล้ว)
2. `components/DashboardOS.tsx` บรรทัด 38 (เดิม) — `const bu = (l) => l.business_unit || "build"` เลดที่ไม่มีค่า business_unit ระบุไว้ (เช่น lead เก่า) ถูกนับเข้ากอง "รับสร้างบ้าน" อัตโนมัติ ทำให้ตัวเลขการ์ด Unit ที่เลิกทำแล้วดูมีกิจกรรมอยู่ทั้งที่ไม่ควรมี
3. `app/budget/page.tsx` บรรทัด 46 (เดิม) — หน้า public lead-gen (Budget calculator) เขียน `business_unit: intent==="renovate"?"reno":intent==="buy"?"list":"build"` แปลว่าทุก lead ที่เลือก intent "สร้างบ้าน" (ตัวเลือก default ของฟอร์มด้วย) ถูกเขียนลง DB เป็น "build" ตรงๆ

ตรวจ Supabase (`leads` table) พบข้อมูลจริงมีแค่ 3 แถว ทั้งหมดเป็น test data ("test"/"test3") ไม่ใช่ lead ลูกค้าจริง — ยังพบว่ามี business_unit ค่าแปลกอีก 2 ค่า (`"broker"`, `"renovation"`) ที่ไม่ตรงกับ type ที่ code กำหนดไว้เลย (แปลว่ามีคนเขียนตรงผ่าน API/curl มาก่อนหน้านี้ ไม่ผ่าน UI) — เพราะเป็น test data ล้วน จึง migrate ได้โดยไม่กระทบข้อมูลลูกค้าจริง

**Decision**: เปลี่ยน business_unit enum จาก `"build"|"reno"|"list"` → `"reno"|"list"|"consult"` (ตัด "build" ออกทั้งหมด เพิ่ม "consult" แทน Unit 4) ในทั้ง 3 ไฟล์ + เปลี่ยนทุก default/fallback จาก "build" เป็น "reno" (Fix & Flip, หน่วยที่ใหญ่สุด 60% ตาม ADR-011) แทนที่จะ fallback ไปหน่วยที่เลิกทำแล้ว — ไม่แตะ `intent`/`INTENTS` (`components/CRM.tsx` บรรทัด 36-42, `app/budget/page.tsx`) เพราะเป็นคนละ concept: "intent" คือสิ่งที่ลูกค้าอยากได้ (อาจอยากสร้างบ้านจริงๆ) ส่วน "business_unit" คือ Finnhouses จะจัดการ lead นั้นด้วยหน่วยงานไหนภายใน — ลูกค้าที่ intent="build" ยังมีสิทธิ์เป็น lead ได้ปกติ แค่ภายในต้อง route ไปหน่วยที่ยังทำอยู่จริง (fallback "reno")

Migrate ข้อมูลจริงใน `leads` ผ่าน SQL ตรง: `UPDATE leads SET business_unit='reno' WHERE business_unit IN ('build','broker','renovation')` — กระทบแค่ 3 แถว test data ทั้งหมด ยืนยันหลัง migrate เหลือ `reno` ทั้งหมด 3 แถว ไม่มีข้อมูลลูกค้าจริงในระบบตอนนี้ที่ต้อง migrate เพิ่ม

**Files**: `components/CRM.tsx` (type, form default, ตัวเลือกในฟอร์ม, CSV import fallback), `components/DashboardOS.tsx` (type/default ใน `useLeadCounts`, `BIZ_META` ตัด "build" เพิ่ม "consult", ลำดับการ์ด BizCard ให้ตรงสัดส่วนรายได้จริง reno→consult→list), `app/budget/page.tsx` (fallback mapping)

**ยังไม่ได้ทำ (flag ไว้ ไม่ใช่ scope วันนี้)**: `app/budget/page.tsx` ทั้งหน้าคือ public lead-gen calculator ที่ตั้งชื่อ label ว่า "พื้นที่ที่สนใจสร้าง" และมีตัวเลือก default "🏗️ สร้างบ้าน" — **ตัวหน้าเว็บทั้งหน้ายังคง premise เป็นเครื่องมือคำนวณสร้างบ้านใหม่** (Unit 1 ที่เลิกทำแล้ว) ไม่ใช่แค่ field mapping ที่แก้วันนี้ ถ้าหน้านี้ยังเปิดให้ลูกค้าจริงเข้าถึง (ลิงก์จากเว็บ/โฆษณา) อาจกำลังดึง lead เข้ามาด้วยความคาดหวังผิด (คิดว่า Finnhouses รับสร้างบ้านเองได้) แล้วมาเจอว่าจริงๆทำไม่ได้ — เป็นการตัดสินใจเชิง business/marketing ว่าจะปิด, เขียนใหม่ให้ตรงบริการจริง (เช่น cost estimator สำหรับงานตรวจสอบ/รีโนเวท), หรือปล่อยไว้เป็น educational tool เฉยๆ ไม่ใช่สิ่งที่ควรแก้เองโดยไม่ถาม Archi ก่อน

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ grep ทั้ง repo ยืนยันไม่มี `business_unit` เขียนค่า `"build"` เหลืออยู่ที่ไหนอีกแล้ว ✅ Supabase migrate 3 แถว test data สำเร็จ ยืนยันด้วย query ซ้ำ

**Related**: ADR-010/012 (business model correction รอบแรกที่ตกหล่นจุดนี้ไป), ADR-011 (สัดส่วนรายได้จริง 3 หน่วย), ADR-014/017 (Deals module ที่ใช้ pattern เดียวกัน)

**Update (Archi ตัดสินใจ, วันเดียวกัน)**: ให้ปิด `/budget` แทนที่จะเขียนใหม่หรือปล่อยไว้ — แทนที่เนื้อหาทั้งหน้า (calculator + lead form) ด้วยข้อความปิดให้บริการสั้นๆ ที่ระบุ 3 บริการจริงที่ยังทำอยู่ (reno/consult/list) แทน ไม่ลบไฟล์/route ทิ้งเพื่อไม่ให้ลิงก์เก่า/โฆษณาเก่าที่อาจยังชี้มาเจอ raw 404 — ตัด nav entry ออกจาก `components/Sidebar.tsx` ด้วยเพื่อไม่ให้พนักงานส่งลิงก์นี้ต่อ **Files**: `app/budget/page.tsx` (rewrite ทั้งไฟล์), `components/Sidebar.tsx` (ตัด nav entry) **Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด

---

## ADR-019 — CRM: ตัด "reno" ออกจาก business_unit ทั้งหมด — lead เข้ามาแค่ 2 หน่วย (consult/list)
**Date**: 2026-07-23 (session 29 ต่อๆ)
**Status**: Implemented ✅

**Context**: Archi แจ้งตรงๆ ว่า Module CRM ต้องปรับใหม่ เพราะ lead ที่ดึงเข้ามาจริงมีจากแค่ 2 ธุรกิจ: **ที่ปรึกษา/ตรวจสอบ (consult)** กับ **ฝากขาย (list)** เท่านั้น — Fix & Flip ("reno", 60% ของรายได้ตาม ADR-011) ไม่ได้มาจาก lead form ของ CRM เลย เพราะดีล Fix & Flip sourced ผ่าน Deals module (ADR-014/017) ต่างหาก (เช่น เจอที่ดิน/บ้านเข้าซื้อเอง ไม่ใช่ลูกค้าติดต่อเข้ามา) — ถามยืนยันผ่าน AskUserQuestion 2 รอบ: (1) ตัด reno ออกจาก CRM ทั้งหมดเลย (ไม่ใช่แค่ไม่ default) → Archi ยืนยัน "ตัดออกทั้งหมด" (2) fallback เมื่อไม่มี business_unit ระบุมา → Archi ขอให้ "ใช้ keyword" เดาจากข้อความแทนการ fallback ไปหน่วยตายตัวหน่วยเดียว แล้วให้ Archi พิมพ์ keyword เองแทนที่จะใช้ชุดที่เสนอไป

**Decision**:
1. เปลี่ยน `business_unit` enum จาก `"reno"|"list"|"consult"` → `"consult"|"list"` ใน `components/CRM.tsx` ทั้ง type, ฟอร์มเพิ่ม Lead (เหลือ 2 ปุ่มเลือก), CSV import
2. สร้าง `lib/businessUnit.ts` — keyword classifier ใช้ร่วมกันทั้ง CSV import (`CRM.tsx`) และ Overview fallback (`DashboardOS.tsx`) แทนโค้ดซ้ำ 2 จุด: `CONSULT_KEYWORDS` (ตรวจบ้าน, ตรวจสภาพ, ตรวจสอบ, การตรวจสอบ, ที่ปรึกษา, ตรวจงานก่อสร้าง, ตรวจรับบ้าน, ตรวจโครงสร้าง, ตรวจก่อนโอน + inspect/consult ฯลฯ — เริ่มจากตัวอย่างที่ Archi ให้มาโดยตรง), `LIST_KEYWORDS` (ฝากขาย, ขายบ้าน, รายชื่อ, ประกาศขาย, ลงประกาศ, ขายที่ดิน, นายหน้า + listing/broker ฯลฯ — เริ่มจากตัวอย่างที่ Archi ให้มาโดยตรงเช่นกัน) — เทียบกับ `notes`+`source` ของ lead แบบ case-insensitive substring match
3. `resolveBusinessUnit(explicit, ...fallbackTexts)` — ถ้ามีค่า explicit ที่ถูกต้อง (`"consult"`/`"list"`) ใช้เลย ไม่งั้นเดาจาก keyword ไม่งั้น fallback สุดท้ายเป็น `"list"` (**เป็นการตัดสินใจเดี่ยวของ Claude** เพราะ Archi ไม่ได้ระบุ fallback สุดท้ายไว้ชัดตอนที่ keyword ก็เดาไม่ได้ — เลือก list เพราะมักมีข้อมูลระบุชัดกว่าในทางปฏิบัติ ถ้า Archi เจอ lead ถูกจัดผิดหน่วยบ่อยๆ แจ้งเพื่อปรับได้)
4. `components/DashboardOS.tsx` — `BIZ_META`/Overview business cards เหลือแค่ consult+list (ตัดการ์ด reno ออก, grid จาก 3 คอลัมน์เป็น 2) — Fix & Flip ยังเป็นธุรกิจหลักอยู่ แค่ไม่มีการ์ดในนี้ ดูที่ `/deals` แทน — คอมเมนต์ในโค้ดชี้ทางไปที่ `/deals` ชัดเจน

**Data migration**: `leads` มี 3 แถว (test data ทั้งหมด ไม่ใช่ลูกค้าจริง — ยืนยันจาก ADR-018) เดิม business_unit="reno" ทั้ง 3 แถว, notes ของทั้ง 3 แถวเป็นเรื่อง Fix & Flip/ที่ดิน (source: Land Analyzer, Reno Estimator, Budget Tool) ไม่ตรง keyword ทั้ง 2 ฝั่งเลย → apply fallback เดียวกับที่ code ใช้ (`"list"`) ผ่าน SQL ตรง ยืนยันหลัง migrate เหลือ `list` ทั้ง 3 แถว

**Files**: `lib/businessUnit.ts` (ใหม่), `components/CRM.tsx`, `components/DashboardOS.tsx`

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ grep ทั้ง repo ไม่มี `business_unit` ผูกกับ `"reno"`/`"build"` เหลือที่ไหนแล้ว ✅ Supabase migrate 3 แถว test data สำเร็จ

**Related**: ADR-018 (รอบแรกที่เจอปัญหา business_unit ผูก Unit 1 ที่เลิกทำ, พบก่อน ADR-019 นี้แค่ไม่กี่นาที), ADR-014/017 (Deals module ที่ Fix & Flip sourced ผ่านจริง), ADR-011 (สัดส่วนรายได้ 3 หน่วย)

---

## ADR-020 — "FB Post Performance Tracker" ไม่เคยเขียนข้อมูลจริงเลยสักครั้ง — root cause: anon key ชน RLS
**Date**: 2026-07-23 (session 29 ต่อๆๆ — จากคำถามภาพรวม "ระบบพิสูจน์ตัวเองว่าทำงานถูกหรือยัง")
**Status**: Fixed in workflow file ✅ — **ยังไม่ได้ import/activate ใน n8n จริง** (รอ Archi ใส่ service_role key จริงก่อน)

**Context**: ระหว่างตรวจสอบทีละโมดูลว่า AP-Home OS "พิสูจน์ตัวเองว่าทำงานถูก" ได้แค่ไหน (ต่อจากบทสนทนา reflective ของ Phase 1-3) พบว่า AI Content Studio มี schema พร้อมวัดผลจริงอยู่แล้ว 2 จุด (`content_posts.impressions/engagement/clicks`, ตาราง `post_performance` ทั้งตาราง — comment ในตารางเขียนไว้ชัดว่า "used for AI Content feedback loop") **แต่ทั้ง 13 แถวใน `content_posts` มีค่า impressions/engagement/clicks = 0 ทุกแถวไม่มีข้อยกเว้นเลย และ `post_performance` มี 0 แถว** ทั้งที่มีไฟล์ n8n workflow "FB Post Performance Tracker" อยู่จริง (cron ทุกวันจันทร์ 09:30) และ export ไว้ว่า `active: true`

Archi อัปโหลดไฟล์ workflow มาให้ตรวจ → เจอ root cause ตรงจุด: node "Config" hardcode `SUPABASE_SERVICE_KEY` เป็น key ที่ comment ในโค้ดเองก็บอกตรงๆว่าเป็น **anon key** (decode JWT payload ยืนยัน `"role":"anon"`) — แต่ `content_posts` และ `post_performance` ทั้งคู่เปิด RLS ไว้โดยไม่มี policy ให้ anon เข้าถึงได้เลยสักจุด (`content_posts` ไม่มี policy เลย, `post_performance` มีแค่ policy เดียวคือ `authenticated_read_post_performance` — SELECT สำหรับ `authenticated` เท่านั้น ไม่มี INSERT policy ให้ใครเลยด้วยซ้ำ) — เป็น pattern เดียวกับ ISSUE-013 ที่เจอมาก่อนหน้านี้ในโปรเจกต์ (RLS เปิด + ไม่มี policy = deny ทุกอย่างรวมถึง anon) แค่ครั้งนี้เกิดใน n8n workflow แทนที่จะเป็น Next.js API route

**ผลที่เกิดขึ้นจริง**: ทุกครั้งที่ workflow รัน (ถ้า active จริง) — "Get Posts from Supabase" อ่าน `content_posts` ด้วย anon key ได้ 0 แถวเสมอ (RLS filter เงียบๆ ไม่ throw error) → ทุกอย่างที่ตามมาไหลเข้า "skip path" → ไม่มีการเรียก FB Graph API ที่มีความหมาย ไม่มีการ upsert เข้า `post_performance` เลย

**บั๊กที่ 2 ซ้อนอยู่ (พบระหว่างอ่านโค้ดละเอียด)**: node "Build Telegram Message" อ่านข้อมูลจาก `$('Process & Prepare Upsert').all()` — ซึ่งเป็น node **ก่อนหน้า** node "Upsert to post_performance" ที่เป็นคนเติม field `_upserted`/`_upsert_error` เข้าไป แปลว่าต่อให้แก้ RLS แล้ว ถ้า Supabase write fail ด้วยเหตุผลอื่นในอนาคต (เช่น network, quota) ข้อความ Telegram ก็ยังจะรายงานว่า "บันทึกสำเร็จ" อยู่ดี เพราะมันไม่เคยเห็น field ที่บอกว่า fail เลย — เป็น "ระบบมโนว่าพิสูจน์ตัวเองได้" ในอีกชั้นหนึ่งซ้อนอยู่ในตัวกลไกที่ควรจะรายงานความล้มเหลว

**Decision**: แก้ 2 จุดในไฟล์ (ไม่แตะ node อื่น/wiring เลย):
1. node "Config" — เปลี่ยนค่า `SUPABASE_SERVICE_KEY` จาก anon key จริงเป็น placeholder `'REPLACE_WITH_REAL_SERVICE_ROLE_KEY__see_Supabase_Dashboard'` พร้อมคอมเมนต์อธิบาย root cause เต็ม — **Archi ต้องเอา service_role key จริงจาก Supabase Dashboard > Project Settings > API มาใส่เองก่อน import** (ไม่เดา/ไม่ใส่ค่าจริงให้ เพราะเป็น secret)
2. node "Build Telegram Message" — เปลี่ยนให้อ่านจาก `$('Upsert to post_performance').all()` (node ที่ถูกต้อง) แล้วเช็ค `_upserted` จริงก่อนจะนับเป็น "บันทึกสำเร็จ" — แยกรายงาน 3 สถานะชัดเจน: ไม่พบ post เลย / FB API error / DB write error (โชว์ error message ตัวอย่างด้วย) — ไม่ใช่แค่ "สำเร็จ" กับ "error" รวมๆกันเหมือนเดิม

**Files**: `memory/n8n-workflows/FB Post Performance Tracker (5_rls_fix).json` (ไฟล์ใหม่ — ไฟล์เดิม `(4).json` ไม่ถูกแตะ)

**Verify (ทำได้ในรอบนี้)**: ✅ parse JSON ผ่าน python `json.load` ✅ ยืนยัน RLS policies บน `content_posts`/`post_performance` ตรงจาก Supabase ผ่าน `pg_policies` จริง (ไม่ใช่เดา) ✅ ยืนยันว่า Hub v1 (`server.cjs`) เขียน `content_posts` สำเร็จได้จริงเพราะใช้ `SUPABASE_SERVICE_KEY` จาก Railway env var (service_role ตัวจริง) ต่างจาก n8n workflow นี้ที่ hardcode anon key ผิดตัว — ยังไม่ได้ import/activate ใน n8n จริง (รอ Archi ใส่ key จริงก่อน)

**ยังไม่ได้ทำ**: หลัง Archi ใส่ key + import + activate แล้ว ต้อง build UI มาโชว์ผลด้วย เพราะตอนนี้ไม่มีหน้าไหนใน dashboard อ่าน `content_posts.impressions/engagement` หรือ `post_performance` มาแสดงเลยแม้แต่จุดเดียว — ต่อให้ workflow เขียนข้อมูลถูกแล้ว ก็ยังเป็น "เขียนแล้วไม่มีใครเห็น" อยู่ดี (ตามแผนที่คุยไว้ก่อนหน้า ข้อ 1 ของ 5 ข้อ)

**Related**: ISSUE-013 (RLS-enabled-zero-policy pattern เดิม), ADR-015/017 (honest low-data-state pattern ที่จะใช้ตอนสร้าง UI ต่อ)

**Update (session 29 ต่อๆๆๆ) — สร้าง UI ต่อทันที ไม่รอ Archi import workflow ก่อน**: เพิ่ม `app/api/content/performance/route.ts` + `components/ContentPerformance.tsx` + tab ใหม่ "📈 Content Performance" ใน `DashboardOS.tsx` — ตาม honest low-data-state pattern เดียวกับ QC Accuracy/Deal ROI (`RELIABILITY_THRESHOLD=5` โพสต์ที่มีข้อมูลจริงคู่กัน ก่อนจะโชว์ค่าเฉลี่ย reach/engagement) — สำคัญ: route นี้ใช้ `post_performance` เป็น source of truth หลัก ไม่ใช่ `content_posts.impressions/engagement/clicks` เพราะคอลัมน์หลังไม่เคยถูก patch จากที่ไหนเลยหลัง insert ครั้งแรก (ยืนยันจาก grep `services/backend-hub/server.cjs` ไม่มีจุดไหนอัปเดตคอลัมน์พวกนี้เลย) — `content_posts` ใช้แค่ให้ context (topic/keyword/channel) จับคู่กับ `post_performance` ผ่าน `content_post_id` (fallback `fb_post_id`)
**Files**: `app/api/content/performance/route.ts` (ใหม่), `components/ContentPerformance.tsx` (ใหม่), `components/DashboardOS.tsx` (เพิ่ม tab)
**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด — ไม่แตะ schema/RLS เลย (อ่านผ่าน service_role อย่างเดียว) จึงไม่ต้องรัน `get_advisors` ซ้ำ
**สถานะข้อมูลจริงตอนนี้**: `post_performance` มี 0 แถว → หน้านี้จะโชว์ "ยังไม่มีข้อมูลพอสรุป" ทันทีที่เปิด จนกว่า Archi จะใส่ service_role key จริง + import + activate workflow (5_rls_fix) แล้วรอ cron รอบถัดไป (จันทร์) เขียนข้อมูลจริงสำเร็จ

---

## ADR-021 — WF1 AI Quality Gate feedback loop (item #2 ของแผน 3 ข้อ "ระบบพิสูจน์ตัวเองว่าทำงานถูก")
**Date**: 2026-07-23 (session 29 ต่อๆๆๆๆ) — **ปิดงาน 2026-07-25 (session 31)**
**Status**: ✅ LIVE in production — import + activate โดย Archi แล้ว, verify ผ่านจริง 2 ทาง (ดู "Go-live update" ท้ายรายการนี้)

**Context**: หลัง Archi ยืนยัน "ทำทั้ง 3 อันเลย เรียงตามลำดับ" จากแผน 3 ข้อที่เสนอไว้ (จากการ audit module-by-module) — ข้อแรกคือ WF1 AI Quality Gate (ADR-016, LIVE ตั้งแต่ session 29 ก่อนหน้า) เช็คบล็อก/ปล่อยผ่านบทความอัตโนมัติ แต่**ไม่มีที่ไหนเก็บ log การตัดสินใจของ Gate เลย** และ**ไม่มีทางให้มนุษย์ยืนยันย้อนหลังว่า Gate ตัดสินใจถูกไหม** — เหมือนกับที่ QC Line เคยเป็นก่อน ADR-015 (มี AI ตัดสินใจ แต่ไม่มีกลไกพิสูจน์ตัวเองว่าตัดสินใจถูก)

**Decision**:
1. สร้างตาราง Supabase ใหม่ `quality_gate_log` (`id, slug, title, pass, reasons text[], run_id, queue_item_id, created_at, human_feedback, human_feedback_at`) — RLS enabled, 0 policies (service_role only, ตาม convention เดิมทุกตารางใหม่ในโปรเจกต์นี้)
2. แก้ n8n workflow: เพิ่ม node ใหม่ "Log Quality Gate Decision" (Code node) คั่นระหว่าง `Parse AI Gate Result` → `Merge Guards` (index 1) — เขียน log ทุกครั้งที่ Gate ตัดสินใจ (ทั้งผ่านและบล็อก) ไปที่ `quality_gate_log` ผ่าน Supabase REST POST ตรง (hardcode service_role key placeholder แบบเดียวกับ ADR-020 — เหตุผลเดียวกัน: `$env` ถูกบล็อกใน Code node บน n8n instance นี้ และ workflow นี้ไม่เคยตั้ง Supabase credential type ไว้เลย) — **fail-open**: ถ้า log เขียนไม่สำเร็จ ต้องไม่บล็อก pipeline หลัก (`gate` object ไหลผ่านไปเหมือนเดิมไม่ว่า log จะสำเร็จหรือไม่)
3. ไฟล์ใหม่: `Finnhouses WF1 — Article + Publish (11_gate_log).json` — ไฟล์เดิม `(10_ai_quality_gate).json` ไม่ถูกแตะเลย (สร้างสำเนาก่อนแก้เหมือนทุกรอบที่ผ่านมา)
4. สร้าง `app/api/quality-gate/accuracy/route.ts` (GET, honest low-data-state pattern เดียวกับ `qc/accuracy` — `RELIABILITY_THRESHOLD=10`) + `app/api/quality-gate/feedback/route.ts` (PATCH ใหม่ — **ต่างจาก QC Line ตรงที่ Gate ไม่มีช่องทางยืนยันอื่นเลย (ไม่มี LINE bot คู่กัน) เพราะฉะนั้น dashboard นี้ต้องเป็นช่องทางยืนยันเดียวในตัว** ไม่ใช่แค่หน้าอ่านอย่างเดียวเหมือน `qc/accuracy`)
5. สร้าง `components/QualityGateAccuracy.tsx` — มีปุ่ม "✅ ถูกต้อง / ❌ ผิดพลาด" แบบ inline ต่อรายการ (ไม่ใช่แค่แสดงผลอย่างเดียว) ต่อยอดปุ่มยืนยันแล้วโหลดข้อมูลใหม่ทันที — เพิ่ม field คำนวณใหม่ที่ QC ไม่มี: `false_positives` (Gate บล็อกแต่จริงๆควรผ่าน) กับ `false_negatives` (Gate ปล่อยผ่านแต่จริงๆควรบล็อก) เพราะ Quality Gate มี 2 ทิศทางที่ผิดพลาดได้ต่างจาก QC ที่เป็นแค่ pass/fail รูปเดียว
6. เพิ่ม tab ใหม่ "🛡️ Quality Gate" ใน `DashboardOS.tsx`

**Wiring validation (ก่อน copy เข้า memory folder)**: parse JSON ผ่าน, node count 22→23, ยืนยัน `Parse AI Gate Result` → `Log Quality Gate Decision` (index 0) และ `Log Quality Gate Decision` → `Merge Guards` (index 1) ถูกต้อง, เช็คเพิ่มเติมรอบนี้ (ต่างจาก ADR-016 ที่ไม่ได้เช็คจุดนี้ตอนนั้น): ทุก node ใน workflow reachable จาก `Webhook` ผ่าน graph traversal จริง (ไม่ใช่แค่เช็ค 2 connection ที่เพิ่ง). ไม่มี node ไหนลอยเดี่ยว/ไม่มีสายเข้าเลย

**Files**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (11_gate_log).json` (ใหม่), `app/api/quality-gate/accuracy/route.ts` (ใหม่), `app/api/quality-gate/feedback/route.ts` (ใหม่), `components/QualityGateAccuracy.tsx` (ใหม่), `components/DashboardOS.tsx` (เพิ่ม import + tab)

**Verify**: ✅ Supabase migration `create_quality_gate_log` สำเร็จ ✅ n8n JSON parse ผ่าน + wiring + reachability ยืนยันด้วย Python ✅ `npx tsc --noEmit` ผ่านสะอาด

**ยังไม่ได้ทำ / รอ Archi (ตอนเขียนรอบแรก — ปิดครบแล้ว ดู Go-live update ด้านล่าง)**: (1) ใส่ service_role key จริงในไฟล์ (11_gate_log) ก่อน import (2) import เข้า n8n แทนตัวเดิม (10) (3) activate แล้วรอดูรอบถัดไปว่า `quality_gate_log` เริ่มมีแถวจริง (4) เมื่อมีข้อมูลสะสม ≥10 ครั้งที่ Archi กดยืนยันแล้ว ถึงจะเริ่มเห็น % ความแม่นยำจริงในหน้า dashboard

**Go-live update (2026-07-25, session 31)**:
- พบบั๊กเพิ่มก่อนส่งไฟล์ให้ Archi import: node "Log Quality Gate Decision" เขียนด้วย `fetch()` ตรงๆ ซึ่งขัดกับกฎที่ยืนยันแล้วจาก CRM Note Parser (Wave 16 — n8n Code node sandbox ไม่ expose `fetch()` ให้เชื่อถือได้) แก้เป็น `this.helpers.httpRequest()` + ใส่ service_role key จริง (ดึงจาก `memory/secrets/n8n.env` ที่ใช้อยู่แล้วกับ workflow อื่น) ก่อนส่งให้ Archi import — ถ้าไม่แก้จุดนี้จะกลับไปเจอ silent-fail แบบเดิม (fail-open ออกแบบไว้ไม่บล็อก publish แต่ก็ไม่มี error โผล่ให้เห็นเลย)
- Archi import แทน `(10_ai_quality_gate)` แล้ว activate สำเร็จ
- Verify ผ่านจริง 2 ทาง: (1) หน้า Quality Gate tab โชว์ "ตัดสินใจทั้งหมด 1" (2) query ตรง Supabase `quality_gate_log` มี 1 แถวจริง ตรงกับ dashboard เป๊ะ (`unverifiable_factual_claim`, blocked, human_feedback="correct")
- Archi ตั้งคำถามเรื่อง design ของปุ่มยืนยัน ✅/❌ ว่าดูย้อนแย้ง (AI ตรวจแล้วให้คนตรวจซ้ำ) — ชี้แจงแล้วว่าปุ่มนี้ไม่ใช่ส่วนหนึ่งของ pipeline บล็อก/ปล่อยผ่าน (Gate ตัดสินใจและมีผลจริงไปแล้วก่อนหน้านั้น) แต่เป็น retrospective audit เพื่อวัด calibration สะสมเท่านั้น — pattern เดียวกับ QC Line (ADR-015), ไม่บังคับกดทุกแถว
- Monitor ต่อเนื่อง — สะสม ≥10 ครั้งยืนยันก่อนจะเห็น % ความแม่นยำจริง (ตอนนี้ 1/10)

**ดูเพิ่ม**: `CLAUDE.md` Known Bugs #15, `docs/issues-log.md`

---

## ADR-022 — Land Analyzer → Fix & Flip Deals link (item #3 ของแผน 3 ข้อ)
**Date**: 2026-07-23 (session 29 ต่อๆๆๆๆๆ)
**Status**: Done ✅ (ไม่ต้อง import อะไรใน n8n — เป็น Next.js/Supabase ล้วน)

**Context**: item #3 ของแผน 3 ข้อที่ Archi อนุมัติ "ทำทั้ง 3 อันเลย เรียงตามลำดับ" — Land Analyzer คำนวณ ROI ประเมินไว้ตอนวิเคราะห์ที่ดิน (`projects.roi`) แต่ไม่เคยเชื่อมกับ Fix & Flip Deals (`reno_deals`, ADR-014/017) เลย ทั้งที่ Deals module มี actual-vs-estimate UI พร้อมอยู่แล้ว (Phase 3) — แค่ไม่มีตัวเลขประเมินจาก Land Analyzer มาเทียบ มีแต่ reno_budget/list_price ที่กรอกตอนสร้างดีลเอง

**Decision**:
1. เพิ่มคอลัมน์ `reno_deals.land_project_id uuid references projects(id) on delete set null` (nullable, optional link — ไม่บังคับทุกดีลต้องมาจาก Land Analyzer)
2. `LandAnalyzer.tsx` — เพิ่มปุ่ม "🔗 สร้างดีล Fix & Flip" ต่อโปรเจคที่บันทึกไว้แต่ละอัน → POST `/api/deals` พร้อม `land_project_id` เชื่อมกลับ, คำนวณ `reno_budget` จาก `plots × area × build_cost` (ไม่เคยถูกเก็บเป็นค่าเดียวมาก่อน มีแต่ input แยก), `purchase_price` จาก `land_price`, `list_price` จาก `market_price` ถ้ามี
3. `app/api/projects/route.ts` GET — เพิ่ม `?ids=uuid1,uuid2` filter (เดิมคืนแค่ 20 แถวล่าสุด ซึ่งอาจพลาดโปรเจคเก่าที่ถูกเชื่อมไว้) ให้ Deals.tsx query เฉพาะโปรเจคที่ deals อ้างถึงจริง
4. `Deals.tsx` — โหลด `landProjects` map (project id → roi) เมื่อมี deal ไหนมี `land_project_id`, แสดง badge "🔗 ROI ประเมิน (Land Analyzer) X% (+/-Y จุด)" ต่อการ์ด + เพิ่มคอลัมน์ที่ 3 ในการ์ดสรุป "ความแม่นยำของการประมาณการ" ระดับพอร์ต (ROI จริง vs ประเมินไว้ตอนวิเคราะห์ที่ดิน, n=จำนวนดีลที่ทั้งเชื่อมโปรเจคและมี roi_pct จริงแล้ว) — ใช้ honest-empty-state เดียวกันทั้ง 3 คอลัมน์

**Files**: `app/api/projects/route.ts` (แก้ GET), `components/LandAnalyzer.tsx` (ปุ่มสร้างดีล), `components/Deals.tsx` (fetch + แสดงผล variance)

**Verify**: ✅ Supabase migration เพิ่มคอลัมน์สำเร็จ (ยืนยัน `information_schema.columns`) ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ `get_advisors` (security) ไม่มี WARN/ERROR ใหม่ — เหลือ `rls_enabled_no_policy` (INFO) เดิมทั้งหมด ตาม convention เดียวกับตารางอื่นในโปรเจกต์

**สถานะข้อมูลจริงตอนนี้**: `reno_deals` ยังมีแค่ test deal ของ Archi (ไม่ได้เชื่อม project) → ROI variance การ์ดที่ 3 จะโชว์ "ยังไม่มีข้อมูลพอสรุป" จนกว่า Archi จะเริ่มใช้ปุ่ม "🔗 สร้างดีล Fix & Flip" จริงจากโปรเจคใน Land Analyzer แล้วปิดดีลจริงอย่างน้อย 1 ดีล

---

## ADR-023 — Market Intel confidence calibration (item #3 สุดท้ายของแผน 3 ข้อ)
**Date**: 2026-07-23 (session 29 ต่อๆๆๆๆๆๆ)
**Status**: Done ✅ — infra พร้อมใช้, feedback เริ่มจาก 0 (เหมือนทุก Phase ก่อนหน้า)

**Context**: item #3 สุดท้ายของแผน 3 ข้อที่ Archi อนุมัติ "ทำทั้ง 3 อันเลย เรียงตามลำดับ" — `market_insights` (135 แถวจริง, ไม่ใช่ตารางว่างแบบ quality_gate_log) มี AI ให้คะแนน `confidence` 1-5 ดาวต่อ insight ทุกอัน แต่**ไม่เคยมีใครยืนยันย้อนหลังว่าคะแนนนั้นแม่นจริงไหม** — คำถามที่ตอบไม่ได้เลยตอนนี้: insight ที่ AI ให้ 5 ดาว แม่นกว่า insight ที่ให้ 3 ดาวจริงหรือเปล่า (นี่คือความหมายของคำว่า "calibration" — ไม่ใช่แค่ accuracy เฉยๆ)

**Decision**:
1. เพิ่มคอลัมน์ `market_insights.human_feedback text check (in ('accurate','inaccurate'))` + `human_feedback_at timestamptz`
2. `app/api/market-intel/feedback/route.ts` (PATCH ใหม่) — เหมือน Quality Gate: `market_insights` ไม่มีช่องทางยืนยันอื่นเลย (ไม่มี LINE bot คู่กันเหมือน QC) ฉะนั้น dashboard ต้องเป็นช่องทางยืนยันเดียว
3. `app/api/market-intel/calibration/route.ts` (GET ใหม่) — honest low-data-state pattern เดียวกันทุกจุดก่อนหน้า (`RELIABILITY_THRESHOLD=10`) — จุดต่างจาก QC/Gate: เพิ่ม breakdown `by_confidence` (group by 1-5 ดาว, accuracy % แยกแต่ละระดับ) ซึ่งเป็นตัวชี้วัดที่ตอบคำถาม "calibration" จริงๆ ไม่ใช่แค่ accuracy รวม
4. `components/MarketIntel.tsx` — เพิ่ม tab ใหม่ "🎯 Calibration" (`CalibrationTab`) ในหน้า `/market-intel` เดิม (คนละไฟล์กับ `MarketIntelTab` ที่ฝังอยู่ใน `DashboardOS.tsx` — สองอันนี้แยกกันคนละ component มาตั้งแต่แรก ไม่ใช่บั๊ก) — มีปุ่ม "✅ ตรง / ❌ ไม่ตรง" ต่อ insight ในรายการล่าสุด

**Files**: `app/api/market-intel/feedback/route.ts` (ใหม่), `app/api/market-intel/calibration/route.ts` (ใหม่), `components/MarketIntel.tsx` (เพิ่ม tab)

**Verify**: ✅ Supabase migration เพิ่ม 2 คอลัมน์สำเร็จ (ยืนยัน `information_schema.columns`) ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ `get_advisors` (security) ไม่มี WARN/ERROR ใหม่

**สถานะข้อมูลจริงตอนนี้**: `market_insights` มี 135 แถวจริงอยู่แล้ว (ต่างจาก quality_gate_log/reno_deals.land_project_id ที่เริ่มจาก 0) แต่ `human_feedback` เป็น NULL ทุกแถวเพราะปุ่มยืนยันเพิ่งมีวันนี้ — หน้า Calibration จะโชว์ "ยังไม่มีข้อมูลพอสรุป" จนกว่า Archi จะเริ่มกดยืนยันสะสม ≥10 ครั้ง ถึงตอนนั้นจะเริ่มเห็นว่า AI ให้คะแนนความมั่นใจแม่นจริงไหม

**Update — เพิ่มเข้า Dashboard OS shell ด้วย (Archi ขอหลัง deploy)**: ADR-023 รอบแรกใส่ tab "🎯 Calibration" ไว้แค่ที่หน้า `/market-intel` (standalone, `components/MarketIntel.tsx`) เพียงจุดเดียว — แต่ Archi เปิดดูที่ tab "🧠 Market Intel" ที่ฝังอยู่ใน Dashboard OS หลัก (`DashboardOS.tsx` → `MarketIntelTab`, เป็นคนละ component คนละไฟล์กันมาตั้งแต่แรก ไม่ใช่บั๊กใหม่) แล้วไม่เห็น tab นี้ — แก้โดย export `CalibrationTab` จาก `components/MarketIntel.tsx` (เดิม private อยู่ในไฟล์เดียว) แล้ว import เข้า `DashboardOS.tsx`, เพิ่ม sub-tab switcher ("🧠 บันทึกข้อมูลตลาด" / "🎯 Calibration") ภายใน `MarketIntelTab` เอง — ใช้ component เดียวกันจริง ไม่ได้ copy โค้ดซ้ำ ดังนั้น fetch/feedback logic เป็นชุดเดียวกันทั้ง 2 หน้า
**Files**: `components/MarketIntel.tsx` (export `CalibrationTab`), `components/DashboardOS.tsx` (import + sub-tab switcher ใน `MarketIntelTab`)
**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด — ไม่แตะ schema/API เลย เป็นแค่ share component ระหว่าง 2 หน้า

**สรุปแผน 3 ข้อ "ระบบพิสูจน์ตัวเองว่าทำงานถูก" ครบแล้วทั้ง 3 ข้อ**: #1 WF1 AI Quality Gate feedback loop (ADR-021, รอ Archi import n8n) · #2 Land Analyzer → Deals link (ADR-022, ใช้งานได้ทันที) · #3 Market Intel confidence calibration (ADR-023, ใช้งานได้ทันที) — ทั้ง 3 ใช้ honest low-data-state pattern เดียวกันทั้งหมด (ADR-015 เป็นต้นแบบ)

**Related**: ADR-015 (QC Accuracy — ต้นแบบ pattern), ADR-021 (Quality Gate feedback — pattern เดียวกันสำหรับตารางที่ไม่มีช่องทางยืนยันอื่น)

**Related**: ADR-014 (Deals module เดิม), ADR-017 (actual-vs-estimate UI ที่ต่อยอดตรงนี้), ISSUE-013 (RLS/service_role pattern ที่ /api/projects ใหม่ยึดตาม)

**Related**: ADR-016 (AI Quality Gate ตัวเดิมที่ยังไม่มี log), ADR-015 (QC Accuracy — ต้นแบบ pattern เดียวกัน), ADR-020 (fail-open Code node pattern + hardcoded-key-in-Code-node เหตุผลเดียวกัน)

---

## ADR-024 — Data-flow graph verification (Obsidian-style) + useLiveData Hub bypass fix
**Date**: 2026-07-23 (session 30)
**Status**: Done ✅ (graph deliverable + code fix) — โค้ดแก้แล้วแต่ **ยังไม่ push** ณ ตอนปิด session นี้

**Context**: Archi ขอให้ทำ data-flow diagram ของทั้ง platform ในสไตล์ Obsidian Graph view (จาก screenshot อ้างอิง) — รอบแรกทำจาก mind-map เก่า ผลออกมา**ไม่ตรงกับระบบจริง**หลายจุด (ไม่มี QC Line เลย, สื่อว่าทุกอย่างผ่าน Hub v1 ทั้งที่ Market Intel/CRM Note Parser bypass ตรงเข้า Supabase, n8n ถูกยุบเหลือบับเบิลเดียวทั้งที่มี 12 workflow จริง) — Claude ยอมรับตรงๆ ว่าไม่ตรง ไม่ใช่ "ใกล้เคียงพอ" แล้วรื้อสร้างใหม่ (v2/v3) โดยเปิด JSON จริงทั้ง 12 n8n workflow + grep `server.cjs` + query Supabase สดเทียบทีละจุด

**สิ่งที่พบและแก้ระหว่างทาง (ไล่ verify มากกว่า 1 รอบ ตามที่ Archi ขอทุกครั้ง)**:
1. เส้น `market_listings → CRM` เป็นเส้นที่ผมใส่เองแบบไม่ verify — เช็คจริงพบว่า `market_listings` ไม่มีโค้ด live ตัวไหนอ่านเลย มีแต่ `public/dashboard.html` ซึ่งเป็นไฟล์ orphan (grep ทั้ง repo ไม่มีที่ไหน link ถึง) — ลบเส้นทิ้ง
2. ขาดเส้น `Wake-up → FB Backend` — เปิด JSON จริงพบ node `HTTP Request2 (FB Backend)` ที่ไม่เคยรู้มาก่อน (Wake-up ping ทั้ง Hub v1 และ FB Backend แยกกัน เพราะทั้งคู่ cold-start ได้)
3. `wf_qc_line 2` ขาดขั้นตอน "ดาวน์โหลดรูปจาก LINE → อัปโหลด Storage" ในคำอธิบาย
4. **ตามคำขอ "วาด hop /api/* ให้ครบทุกเส้นเพื่อความสม่ำเสมอ"**: เพิ่ม hop node กลุ่มใหม่ (สีฟ้า, `apiroute`) คั่นทุกเส้น Frontend→Data ให้เท่ากับที่ Hub v1 ถูกวาดเป็น hop อยู่แล้ว — verify แต่ละ route.ts จริงทีละไฟล์ (`/api/leads`, `/api/projects`, `/api/deals`, `/api/market-intel`, `/api/market-intel/calibration`, `/api/qc/accuracy`, `/api/content/performance`, `/api/quality-gate/accuracy`, `/api/property/*`) — พบว่า `/api/property/*` เป็นแค่ thin proxy ไป Hub v1 (ไม่แตะ Supabase เอง) ต่างจาก hop อื่นที่เป็น service_role ตรง
5. รอบแรกของงาน #4 พลาด 2 เส้น (ตรวจพบเมื่อ Archi ถามซ้ำ "ประเมินก่อน"/ให้ตรวจต่อ): `AI Content → FB Backend` ที่จริงผ่าน `/api/fb/publish` ก่อน และ `Blog Runner → Hub v1` ที่จริงผ่าน `/api/blog/*` ก่อน (verify จาก comment ในไฟล์เอง "Use Vercel server-side routes to avoid CORS/browser→Railway issues" + อ่าน route.ts ทั้ง 5 ไฟล์) — ระหว่างแก้เจอ duplicate edge บั๊กในกราฟเอง (`Blog Runner→Hub v1` เส้นตรงเก่ายังหลงเหลืออยู่คนละ block ที่ไม่ได้แตะตอนแก้รอบแรก) แก้แล้ว
6. **พบบั๊กจริงในโค้ด (ไม่ใช่แค่กราฟ) ระหว่างตรวจข้อ 5**: `DashboardOS.tsx`'s `useLiveData()` (poll ทุก 10 วิ) ยิง `fetch(NEXT_PUBLIC_HUB_URL + "/api/state")` ตรงจาก browser ไม่มี `x-hub-token` — ขัดกับกฎ CLAUDE.md "ห้าม call Railway URL โดยตรงจาก client-side" — ตอนแรกวาดเป็นเส้นประแดง "insecure" ในกราฟ แต่พอ Archi ขอ "ประเมินก่อน" ตรวจลึกกว่านั้นพบว่า**ไม่ใช่ data leak จริง** เพราะ Hub v1 มี middleware เช็ค `x-hub-token` ครอบทุก route (`server.cjs` บรรทัด 578-593) เว้น `/health*` — fetch ที่ไม่มี token จะโดน 401 ทุกครั้ง ไม่มีข้อมูลจริงรั่วออกมาเลย **แต่เป็น functional bug จริง**: เพราะ error ถูก catch เงียบๆแล้ว `setData` ไม่เคยถูกเรียกเมื่อ fail → การ์ด FB/Blog Engine โชว์ตัวเลข `MOCK` คงที่ตลอดกาล (queue 8/12, published 2/3 ฯลฯ) ทั้งที่ป้าย "OFFLINE" ด้านบนบอกตรงๆ อยู่แล้วว่าไม่ live — เสี่ยงให้คนดูแค่การ์ดตัวเลขเข้าใจผิดว่าเป็นข้อมูลจริง

**Decision (โค้ด, ไม่ใช่แค่กราฟ)**: แก้ `useLiveData()` ให้เรียก `/api/blog/state` (proxy ที่มีอยู่แล้ว ใช้งานจริงโดย `Marketing.tsx`, ใส่ `x-hub-token` ฝั่ง server ถูกต้อง) แทนยิง Railway ตรง + เพิ่มเช็ค `json?.error` เพราะ route นี้ตอบ `200 + {error}` เวลา Hub fail แทนที่จะส่ง non-2xx status — ตรวจ shape จริงของ Hub state (`baseState()` ใน `server.cjs`) ก่อนแก้ ยืนยันว่า `blog`/`fb` มีจริงตรงกับที่โค้ดใช้ และ `alerts` มี `?? []` กันไว้แล้ว, `leads` ไม่ได้อ่านจาก state ตัวนี้เลย (มาจาก `useLeadCounts()`/`/api/leads` แยกต่างหาก) — ไม่มีความเสี่ยงพังจาก field ที่ไม่มีจริง

**Files**: `components/DashboardOS.tsx` (แก้ `useLiveData`), กราฟ `finnhouses-graph-view-v2.html` (deliverable แยก ไม่ใช่ repo code — เก็บที่ `memory/finnhouses-graph-view-v2.html`)

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ อ่าน `baseState()`/`normalizeState()` จริงเทียบ field ที่โค้ด destructure ✅ กราฟ: script เช็ค node/link ทุกเส้นชี้ไปยัง node ที่มีจริง + ไม่มี duplicate edge (เจอและแก้ 1 จุด)

**อัปเดตปิดงาน (ต่อในวันเดียวกัน, session 30)**: Archi push แล้ว — commit รวม `85e964d` ("Fix OS Dashboard Hub-bypass bug (ISSUE-017/ADR-024) + update session docs") มี `components/DashboardOS.tsx` + doc sync ทั้งชุด verify ผ่าน Vercel `list_deployments` ตรง: `dpl_EvzvQdvpDATq14jWsrHKajLeipGJ`, `state:"READY"`, `target:"production"`, `githubCommitSha:"85e964ded5dc08587f14e792e74b18052645fe22"` ตรงกับที่ push เป๊ะ — จากนั้นอัปเดต `finnhouses-graph-view-v2.html` (v6): ลบเส้นประแดง "insecure" ออก เปลี่ยนเป็น `OS Dashboard → /api/blog/* → Hub v1` ให้ตรงกับโค้ดที่ deploy จริง, verify ด้วย script เดิม (ไม่มี broken link/duplicate edge) — **ปิดครบทั้ง ADR-024 และ ISSUE-017 ไม่มีจุดค้าง**

**Related**: CLAUDE.md security constraint ("ห้าม call Railway URL โดยตรงจาก client-side"), Known Bug #10/ISSUE-011 (FB Backend URL pattern เดียวกัน — proxy เสมอ ไม่ยิงตรง)

---

## ADR-025 — Business model audit (Claude, external session): BUSINESS_MODEL.md + assistant system prompt corrections
**Date**: 2026-09-19
**Status**: Done ✅

**Context**: Archi cloned the repo temporarily public (repo is normally private) to let a Claude session outside the usual workflow (claude.ai, not Cowork/CLI) re-audit `docs/BUSINESS_MODEL.md` against the live source code — the doc's own header rule says "ถ้า business model หรือ feature ในเอกสารขัดกับระบบที่ deploy/ใช้งานจริง ให้ตรวจ source code ก่อนแก้เอกสาร" ดังนั้นจึงตรวจทุก claim ในเอกสารทีละจุดเทียบกับไฟล์จริงและ ADR ที่เกี่ยวข้อง (ADR-005/010–024) ก่อนแก้ พบ 3 จุดที่ของจริงไม่ตรงกับเอกสาร/โค้ดที่มีอยู่

**สิ่งที่พบและแก้**:
1. **`docs/BUSINESS_MODEL.md` — Unit 2 list ผิด**: ยังระบุ "Budget Tool / public lead capture" เป็นระบบที่รองรับ Unit 2 ทั้งที่ `app/budget/page.tsx` ถูกปิดไปแล้วตั้งแต่ 2026-07-23 (ADR-018 update — เหลือแค่หน้าแจ้งปิดให้บริการ ไม่มีฟอร์มแล้ว, ตัด nav ออกจาก Sidebar ด้วย) — แก้เป็น note อธิบายว่าปัจจุบันไม่มี public lead-capture channel เหลืออยู่เลย, lead เข้าผ่าน CRM manual entry/CSV import เท่านั้น
2. **`app/api/assistant/route.ts` — `max_tokens: 1024` ตัดคำตอบยาวกลางคัน**: ทดสอบจริงผ่าน AssistantChat.tsx ด้วยคำถามวิเคราะห์ Fix & Flip deal (ปทุมธานี) แล้วคำตอบขาดกลางประโยค — root cause เดียวกับที่เคยเจอใน Market Intel Collector v2 มาก่อน (ADR-005, token limit ชนตอน output ยาว/ซับซ้อน) แต่จุดนี้ไม่มีการเช็ค `stop_reason` เลยทั้ง backend/frontend (`AssistantChat.tsx` แสดง `data.text` ตรงๆ บรรทัด 78-79 ไม่มี logic ตรวจ truncation) — แก้ 2 จุด: เพิ่ม `max_tokens` เป็น 4096 + เพิ่มเช็ค `response.stop_reason === "max_tokens"` แล้วแปะคำเตือนต่อท้าย text ให้ผู้ใช้เห็นตรงๆ ในแชท (ไม่ต้องแก้ frontend เพราะมันแค่ render text ที่ backend ส่งมา)
3. **`app/api/assistant/route.ts` — ไม่มี tool ดึงข้อมูล Fix & Flip deals จริง**: assistant มีแค่ 4 read tools (`get_dashboard_summary`, `get_leads`, `get_market_intel_recent`, `get_qc_status`) ไม่มีตัวไหนอ่าน `reno_deals` เลย — ตอนทดสอบข้อ 2 ด้านบน assistant เลยคำนวณ ROI จากตัวเลขที่ผู้ใช้พิมพ์เองล้วนๆ ไม่ได้เช็คกับดีลจริงในระบบก่อน — เพิ่ม tool `get_deals` (filter `stage`, `limit`) อ่านจาก `reno_deals` ผ่าน `supabaseSelect()` เดิม พร้อม description บังคับชัดว่าต้องเรียกก่อนตอบคำถามเกี่ยวกับดีลจริง ห้ามคำนวณจากตัวเลขที่ผู้ใช้พิมพ์มาเองเงียบๆ
4. **`app/api/assistant/route.ts` — `SYSTEM_PROMPT` ยังอ้าง Unit 1 ที่เลิกทำแล้ว**: บรรทัด "ธุรกิจ: รับสร้างบ้าน / โบรกเกอร์ / Fix & Flip / ที่ปรึกษาตรวจงานก่อสร้าง" มีคำว่า "รับสร้างบ้าน" (Unit 1, discontinued ตาม ADR-010) หลงเหลืออยู่ในสมองของ assistant ตัวนี้โดยตรง — เป็นจุดเดียวที่หลุดจาก business-model correction รอบก่อนๆ (BRAND_FACTS ใน `AIContent.tsx` กันไว้แล้ว, `/budget` ปิดไปแล้ว, CRM ตัด `reno`/`build` ออกแล้ว — เหลือจุดนี้จุดเดียว) — แก้เป็นระบุ 3 หน่วยจริงพร้อมสัดส่วน (Unit 3 60% / Unit 4 30% / Unit 2 10%) และเพิ่มบรรทัด guardrail ชัดเจนห้ามตอบว่า Finnhouses รับสร้างบ้านใหม่เอง แม้ผู้ใช้จะถามนำก็ตาม
5. **`app/api/assistant/route.ts` — assistant แอบใช้ความรู้ทั่วไปนอกระบบมาตอบ**: ตอนทดสอบข้อ 2-3 ด้านบน assistant คำนวณค่าโอน/ค่าคอมมิชชั่น/buffer % จากความรู้ทั่วไปของโมเดลเอง (ไม่ได้มาจาก tool ไหนใน 5 ตัว) แล้วนำเสนอปนกับตัวเลขที่ผู้ใช้พิมพ์มาเองราวกับเป็นการวิเคราะห์ที่อิงข้อมูลระบบทั้งหมด — เสี่ยงให้ผู้ใช้เข้าใจผิดว่าตัวเลขเหล่านั้นมาจากระบบจริง — เพิ่มกฎใน `SYSTEM_PROMPT` ห้ามตอบด้วยสมมติฐาน/ข้อมูลนอกระบบเด็ดขาด (เปอร์เซ็นต์ค่าธรรมเนียม, ราคาตลาดที่ไม่ได้มาจาก `get_market_intel_recent`) ถ้าขาดตัวเลขที่จำเป็นต้องถามผู้ใช้ก่อน ไม่เติมเอง และบังคับให้ระบุชัดเมื่อ deal เป็นตัวเลขที่ผู้ใช้พิมพ์มาเอง ยังไม่มีบันทึกใน `/deals` จริง

**Files**: `docs/BUSINESS_MODEL.md`, `app/api/assistant/route.ts` (5 จุดรวม: max_tokens, get_deals tool, ตัด Unit 1 ออกจาก system prompt, ห้ามใช้ความรู้นอกระบบ)

**Verify**: อ่าน source code จริงทุกจุดก่อนแก้ (component files, API routes, migration/ADR history) — ไม่มี `tsc`/build environment ในเซสชันนี้ให้รัน `npx tsc --noEmit` ยืนยันแบบที่ session อื่นทำได้ ควร verify เพิ่มเติมด้วย `npx tsc --noEmit` ใน session ปกติที่มี dependencies ครบก่อน deploy รอบถัดไปถ้ายังไม่ได้เช็ค

**Related**: ADR-005 (max_tokens truncation ที่เคยเจอมาก่อนใน Market Intel Collector v2 — root cause เดียวกัน), ADR-010/012 (business model correction รอบแรกของ AI Content Studio), ADR-014/017/022 (Deals module ที่ tool ใหม่นี้ต่อยอด), ADR-018 (ปิด `/budget`)

**หมายเหตุ**: repo ถูกเปิด public ชั่วคราวเพื่อให้ session นี้เข้าถึงได้ (ไม่ได้ผ่าน connector ปกติ) — ควรเช็คว่าเปลี่ยนกลับเป็น private แล้วหลัง session นี้จบ และ revoke personal access token ที่ใช้ push ด้วย
