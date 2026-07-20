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
