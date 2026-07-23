# Session Handoff — สำหรับ Claude session ถัดไป

> อ่าน CLAUDE.md ก่อนเสมอ แล้วค่อยอ่านไฟล์นี้

---

## Last Updated: 2026-07-23 (session 30 — data-flow graph verification (ADR-024) + useLiveData Hub-bypass bug found & fixed (ISSUE-017) — ✅ ปิดครบ push+deploy+graph verify แล้ว

**บริบท**: Archi ขอ data-flow diagram สไตล์ Obsidian Graph view จาก reference screenshot → ทำแบบ static (จาก mind-map เก่า) รอบแรกก่อน แต่พอ Archi ถามตรงๆ "ตรงกันไหมกับระบบที่เราทำ" Claude ตรวจสอบอย่างละเอียดแล้วตอบว่า**ไม่ตรงทั้งหมด** (ไม่มี QC Line เลย, สื่อผิดว่าทุกอย่างผ่าน Hub v1, n8n ยุบเหลือบับเบิลเดียว) → รื้อสร้างใหม่โดยเปิด JSON จริงทั้ง 12 n8n workflow + grep `server.cjs` + query Supabase สด

**ผลลัพธ์เป็น deliverable แยก** (ไม่ใช่ repo code): `memory/finnhouses-graph-view-v2.html` — interactive D3 force graph, verify หลายรอบตามที่ Archi ขอ ("อยาก" ให้ตรวจต่อ, "ประเมินก่อน" ก่อนแก้โค้ด) เจอ+แก้เอง 5 จุดที่ผิด (เส้นสมมติ, เส้นขาด, duplicate edge) — รายละเอียดเต็มดู `docs/decisions.md` ADR-024

**บั๊กจริงที่เจอระหว่างตรวจกราฟ (ไม่ใช่แค่ diagram)**: `components/DashboardOS.tsx`'s `useLiveData()` ยิง Hub v1 ตรงจาก browser (`NEXT_PUBLIC_HUB_URL`) ไม่มี `x-hub-token` → โดน 401 ทุกครั้ง (Hub v1 มี auth middleware ครอบทุก route ยกเว้น `/health*`) → ไม่ใช่ data leak แต่เป็น functional bug จริง: การ์ด FB/Blog Engine บนหน้า `/dashboard` โชว์ตัวเลข `MOCK` คงที่ตลอดกาลมาตั้งแต่เขียนโค้ดนี้ครั้งแรก เพราะ error ถูก catch เงียบๆไม่เคย `setData()` ใหม่ — **แก้แล้ว**: เปลี่ยนไปเรียก `/api/blog/state` (proxy ที่มีอยู่แล้ว, ใช้จริงโดย `Marketing.tsx`) แทน — ดู `docs/issues-log.md` ISSUE-017

**Verify**: ✅ `npx tsc --noEmit` ผ่านสะอาด ✅ ตรวจ `baseState()`/`normalizeState()` จริงเทียบ field ที่โค้ดใช้ก่อนแก้ (ไม่มีความเสี่ยง `leads`/`alerts` undefined) ✅ Archi push แล้ว (commit `85e964d`) ✅ verify deploy ผ่าน Vercel `list_deployments` ตรง commit จริงเป๊ะ (`dpl_EvzvQdvpDATq14jWsrHKajLeipGJ`, `state:"READY"`, `target:"production"`) ✅ อัปเดตกราฟ (v6) ลบเส้นประแดง "insecure" ออกแล้ว เปลี่ยนเป็น `OS Dashboard → /api/blog/* → Hub v1` ให้ตรงกับโค้ดที่ deploy จริง

**สถานะ**: ปิดครบทั้ง ADR-024 และ ISSUE-017 — ไม่มีจุดค้างจาก session นี้ (session ถัดไปไม่ต้องทำอะไรต่อเรื่องนี้ เว้นแต่พบปัญหาใหม่)

---

## Last Updated (เดิม): 2026-07-11 (session 23 ต่ออีกรอบ — ISSUE-011/012 resolved, platform critique + Supabase RLS hardening ISSUE-013, session ปิดปกติ)

## ✅ RESOLVED — "Post to Facebook" ใน ListingTab (ISSUE-011) + ประเภทบ้านผิด (ISSUE-012)

**ISSUE-011 root cause จริง (ไม่ใช่ token)**: `FB_BACKEND_URL` env var **ไม่เคยถูกตั้งใน Vercel เลย** (คนละที่จาก Railway `easygoing-friendship` ที่เช็คไปหลายรอบก่อนหน้า) — `route.ts` เช็ค `if (!FB_BACKEND)` แล้ว return 500 ทันทีโดยไม่เคยยิงไป Railway เลย วิธี diagnose ที่ได้ผลจริง: แก้ `ListingTab.postToFacebook()` ให้โชว์ `data.error` เป็นข้อความสีแดงใต้ปุ่มใน UI ตรงๆ (แทนที่จะง้อ browser DevTools ที่ user เจอปัญหาจับ request ไม่ถูกหลายรอบ) → เจอข้อความ `"FB_BACKEND_URL not configured"` ทันที → เพิ่ม env var ใน Vercel → ผ่าน

**ISSUE-012 (พบทันทีหลังแก้ 011)**: โพสต์แรกที่ทดสอบจริงเขียนผิดประเภทบ้าน ("บ้านเดี่ยว" ทั้งที่เป็นทาวน์เฮ้าส์) — เช็คแล้ว**ไม่ใช่บั๊ก prompt/AI** แต่เป็น WordPress taxonomy term ที่กรอกผิดตั้งแต่ต้น — user แก้ตรงที่ WP admin โดยตรง (prompt rule ที่เพิ่มเข้าไประหว่างทางยังมีประโยชน์เป็น safety net แต่ไม่ใช่ตัวแก้จริง)

**เอกสารที่ sync แล้ว**: `memory/tokens.md` ยังไม่ sync ด้วย token ใหม่ — ตอนนี้ทราบแล้วว่า token ไม่ใช่สาเหตุของ ISSUE-011 เลย ไม่จำเป็นเร่งด่วนอีกต่อไป แต่ยังควร sync ให้ตรงในโอกาสหน้า

**ดู**: `docs/issues-log.md` ISSUE-011 (resolved), ISSUE-012 (resolved), ISSUE-013 (ใหม่ — ดูด้านล่าง)

---

## ✅ ใหม่ — Supabase RLS/permission hardening (ISSUE-013)

**บริบท**: user ขอ critique ภาพรวม platform → เลือกแก้ RLS ก่อน (effort ต่ำ/impact สูง) → เช็ค advisor จริงพบ scope ใหญ่กว่าที่ CLAUDE.md pending tasks บันทึกไว้มาก (ไม่ใช่แค่ 6 ตารางไม่มี RLS แต่มีอีกชุดใหญ่ที่เปิด RLS แล้วแต่ policy เป็น `USING (true)` เปิดโล่งเหมือนเดิม)

**แก้แล้ว**: เปิด RLS 6 ตาราง + ลบ permissive policy อีก ~11 ตาราง/policy + revoke PUBLIC execute บน `append_line_image_atomic` (เจอว่าต้อง revoke จาก PUBLIC ไม่ใช่แค่ per-role) + pin search_path 2 ฟังก์ชัน + fix `qc_inspections_view` SECURITY DEFINER → security_invoker — verify ผ่าน Supabase advisor ก่อน/หลัง + `has_function_privilege()` ยืนยันครบ Hub (service_role) ไม่กระทบเลย

**ตั้งใจไม่แตะ**: `leads` (CRM) + `projects` (Land Analyzer) ยังเปิด anon CRUD เต็มที่ เพราะ platform นี้**ไม่มีระบบ login เลย** — ต้องออกแบบ auth ก่อนถึงจะล็อกได้จริงโดยไม่พัง CRM/Land Analyzer — เป็น pending task ใหม่ รอคุย scope กับ user

**ดู**: `docs/issues-log.md` ISSUE-013 (รายละเอียดเต็ม migration SQL + วิธี verify)

---

## Last Updated (เดิม): 2026-07-10 (session 23 — AI Content: ListingTab resale persona fix)

## ⚠️ ล่าสุด: AI Content Studio — ListingTab ใช้ resale persona แล้ว (Jul 10, session 23)

**บริบท:** Archi อยากปรับ AI Content ให้สร้าง content ขายบ้านมือสองได้ดีขึ้น — เอา prompt "House Matching System v1.0" (customer profile + scoring engine เต็มรูปแบบ) มาถาม — วิเคราะห์แล้วพบว่า scope ใหญ่เกินและชนกับสถานะ Hub v1/v2 จริง (`IAiProvider` มีแค่ Hub v2 ที่ยัง shadow ไม่ live) เลยเสนอ 3 ทางเลือก Archi เลือก **option 1 (ปรับ ListingTab ที่มีอยู่ก่อน)** — option 2/3 (matching engine เต็มรูป / persona tag บน property) พักไว้พัฒนาต่อวันหน้า

**Root cause ที่เจอ:** `BUYER_SEGMENTS` มี persona "resale" (บ้านมือสอง/Listing — fear/need/key_message/framed) สร้างไว้แล้วตั้งแต่ก่อนหน้านี้ แต่ **ใช้ได้แค่ใน Keyword tab** (`isPositioned` branch) — `ListingTab` (ที่ผูกกับทรัพย์จริงจาก WordPress ผ่าน `/api/property/list`) เขียน system prompt แบบทั่วไป ไม่ดึง persona หรือ `BRAND_FACTS` มาใช้เลย → output เป็น copy ระดับ feature (Level 1) แทนที่จะเป็น emotion/identity (Level 2-3) ตามที่ระบบ intelligence framework ออกแบบไว้

**แก้:** `components/AIContent.tsx` → `ListingTab.generate()`
- inject `BRAND_FACTS` + `BUYER_SEGMENTS.find(s => s.value === "resale")` (fear/need/key_message/framed) เข้า system prompt
- เพิ่ม state + UI selector "Awareness Level" (unaware/problem_aware/solution_aware) ต่อโพสต์ — pattern เดียวกับ Keyword tab
- Hook ต้องมาจาก fear/need ของกลุ่มเป้าหมายก่อน ค่อยโชว์ราคา/สเปค — guardrail เดิม (ห้าม hallucinate, ≤200 คำ, ห้าม "ปรึกษาฟรี"/"ลิงก์ใน Bio") ยังอยู่ครบ
- ไม่แตะ Hub/API/Database เลย — ไม่ต้อง ADR

**Deploy:** `_scripts/push-listing-persona.bat` (ตาม pattern เดิมของโปรเจกต์ เช่น `push-fix-listing-ui.bat`) — Archi push แล้ว Jul 10 → รอ Vercel auto-deploy

**Verify:** ✅ ทดสอบผ่านจริงบน production (Jul 10) — เห็นทันทีว่า deploy รอบแรกไม่ขึ้นจริง เพราะ `.bat` เดิมพัง 2 จุดพร้อมกัน: (1) `.git/index.lock` ค้าง (2) commit message หลายบรรทัดขึ้นต้นด้วย `-` ทำให้ cmd.exe parse ผิดจนไม่มีอะไรถูก push เลย (เช็คยืนยันผ่าน Vercel `list_deployments` — deployment ล่าสุดยังเป็น commit เก่าจากหลายวันก่อน) แก้ `.bat` ให้ลบ lock file ก่อนเสมอ + commit message บรรทัดเดียว → push สำเร็จ commit `25b31dc` → ทดสอบ generate จริงเห็น hook เปิดด้วยฉากชีวิตประจำวัน ("เช้าออกบ้านสาย 7 โมง เย็นกลับทัน 5 โมง") ไม่มีราคา/hype ปนบรรทัดแรกแล้ว ตรงตาม spec
**บทเรียนใหม่:** เวลาเขียน `.bat` deploy script ห้ามใช้ multi-line commit message ที่มีบรรทัดขึ้นต้นด้วย `-` (cmd.exe ตีความเป็นคำสั่งแยก ไม่ใช่ต่อเนื่องจาก `-m "..."` เหมือน bash) — ใช้บรรทัดเดียวเสมอ + เพิ่ม `if exist ".git\index.lock" del /f` ไว้ต้น script ทุกไฟล์เป็น pattern มาตรฐาน

**ค้างไว้พัฒนาต่อ (ตามที่ Archi ตกลง):** option 2 (House Matching Engine เต็มรูป — ต้องรอ Hub v2 cutover ตัดสินใจก่อน) หรือ option 3 (เพิ่ม persona/lifestyle tag ให้ property ใน Supabase เป็น foundation data)

---

## Last Updated (เดิม): 2026-07-08 (session 22 — ADR-005 Market Intel Collector v2: dry run + production cutover + same-day incident fixed)

## ⚠️ สถานะสำคัญที่สุด: Hub v1 คือของจริงตอนนี้

Session ก่อนหน้า (Jun 30) เขียน HANDOFF ตอน Hub v2 ถูก cutover ไปแล้ว — **สถานะนั้นถูก revert ไปแล้วตั้งแต่ Jul 1** เพราะ `/api/fb/queue/*` และ `/api/blog/queue/*` ไม่มี implement จริงบน Hub v2 เลย (ดู decisions.md ADR-004, issues-log.md ISSUE-005)

**ตอนนี้**: `HUB_URL` (Vercel) ชี้ Hub v1 (`ap-home-platform-production.up.railway.app`), header คือ `x-hub-token`, path คือ `/action/blog\|fb/queue/*` — **ไม่ใช่** `/api/blog/queue/*` + `x-hub-secret` แบบที่เอกสารเก่าเขียนไว้

---

## ⚠️ ล่าสุด: Market Intelligence Collector v2 (ADR-005) live ตั้งแต่ Jul 8

Workflow ใหม่ `Finnhouses — Market Intelligence Collector v2 (ADR-005)` (ID `lrLOjW4GPd5atYhz`) เข้าแทนที่ `v1(2)` (ID `F3i4dQMubgbm21d6`, unpublished เก็บไว้ rollback ไม่ได้ลบ) — webhook path เดิม (`market-intel/fb`, `market-intel/manual`), เพิ่ม 9-signal schema ต่อโพสต์ (`signals` JSONB), ใช้ native Supabase node เขียนแทน Code node เดิม ดู `docs/decisions.md` ADR-005 และ `docs/glossary.md` สำหรับรายละเอียดเต็ม

**ระหว่างวันเดียวกันเจอ + แก้บั๊กจริงบน production**: Claude Haiku ตอบยาวเกิน `maxTokens:1600` บนโพสต์ที่มีรายละเอียดเยอะ → JSON ถูกตัดกลางคำ → โพสต์นั้นหาย (fail-safe ทำงานถูกต้อง ไม่มีข้อมูลผิดถูกบันทึก) → แก้เป็น `maxTokens:3000` → verify ผ่านโพสต์จริง 3 รายการติดต่อกัน (`content_frames.id=87,88,89`) ดู `docs/issues-log.md` ISSUE-010

---

## สิ่งที่ทำเสร็จ session 22 (Jul 8) — ADR-005 v2: dry run → production cutover → same-day incident

### Stage 1 — Dry run (test webhook paths, ไม่แตะ production)
- เจอ + แก้ 3 บั๊กจริงที่ mocked test ก่อนหน้าตรวจไม่เจอ: Code node `getCredentials()`/`$env` ใช้ไม่ได้ (n8n bug #29603) → ปรับเป็น native Supabase node ทั้ง 3 จุดเขียน; `market_insights.category` CHECK constraint violation (model ตอบ signal key แทน category) → เพิ่ม whitelist; `market_insights.confidence` type violation (model ตอบ 0.9 แทน integer 1-5) → เพิ่ม clamp
- ผล: PASS ทั้ง 7 validation criteria — `docs/ADR/2026-07-08-market-intel-v2-stage1-dry-run-report.md`

### Stage 2 — Production cutover
- Unpublish v1(2) → publish v2 บน webhook path เดิม → 15/15 smoke test PASS
- ผล: `docs/ADR/2026-07-08-market-intel-v2-stage2-production-cutover-report.md` — Outstanding Risks ระบุไว้ล่วงหน้าว่ายังไม่มี extended production monitoring

### Same-day production incident (ตรงตามความเสี่ยงที่ report เขียนไว้)
- โพสต์จริง (#ขายบ้าน พฤกษา 8) ยาว/ละเอียดเกินกว่าที่ทดสอบไว้ → Claude Haiku ตอบเกิน `maxTokens:1600` → JSON ตัดกลางคำ → parse fail → fail-safe ทำงานถูกต้อง แต่โพสต์หาย
- Diagnose ผ่าน `raw_model_text_debug` field (เตรียมไว้ตั้งแต่ Phase 4.1a) — เห็นจุดตัดชัดเจนภายในไม่กี่นาที
- Fix: `maxTokens` 1600 → 3000 ในทั้ง 2 Parse node — verify ผ่าน 3 โพสต์จริงติดต่อกัน (2 รันใช้เวลา 25.9s/30.5s ยืนยันว่าเป็น generation ยาวจริง)
- ผล: `docs/issues-log.md` ISSUE-010

### Phase 5 — proposal only (ยังไม่เริ่ม ตามที่ user สั่งห้ามแตะ architecture ที่ไม่เกี่ยวข้อง)
- `docs/ADR/2026-07-08-phase5-roadmap-proposal.md` — INTEL-001 (liquidity aggregation), INTEL-002 (dashboard), INTEL-003 (prompt drift monitor), ADR-006 (validation layer) — รอ user prioritize

---

## สิ่งที่ทำเสร็จในช่วง session 18–19e (Jul 1–2)

### Session 18 (Jul 1) — Hub v2 revert
- ตรวจพบ fb/blog queue routes ไม่มีจริงบน Hub v2 → revert `HUB_URL` กลับ Hub v1
- ยืนยันแล้วว่าใช้งานได้ปกติหลัง revert

### Session 19b (Jul 2) — QC LINE end-to-end test
- ✅ PASS — ส่งรูปจริง 4 เคสจาก LINE OA, reply ภาษาไทยครบภายใน ≤15s
- Audit พบ Hub v2 backend สร้างไปไกลกว่าที่คิด (79% ของ tasks) — เหลือแค่ fb queue routes ที่ขาด

### Session 19d (Jul 2) — QC feedback loop
- ✅ เพิ่ม `human_feedback`/`human_feedback_at` ใน `qc_inspections`
- ✅ endpoint `POST /api/qc/feedback`
- ✅ n8n `wf_qc_line (2)` — Quick Reply "✅ ตรง / ❌ ไม่ตรง" + postback branch, สลับ active workflow แล้ว
- แก้บั๊ก `URLSearchParams is not defined` ระหว่างทาง (issues-log.md ISSUE-006)
- ⚠️ ยังไม่มี dashboard/query ดูสถิติ % ถูก/ผิดสะสม — เก็บแค่ raw data

### Session 19e (Jul 2) — Market Intel content_frames bug
- แก้บั๊ก `content_frames` ไม่เคยเขียนสำเร็จเลยตั้งแต่ live 29 พ.ค. (column mismatch + try/catch กลืน error, issues-log.md ISSUE-007)
- เพิ่ม success/fail status ใน Telegram notification
- Backfill เขียน FB post ใหม่ 26 โพสต์แทนของเดิมที่หายไป

### Doc sync (Jul 4 — this pass)
- อัปเดต decisions.md (ADR-004), issues-log.md (ISSUE-005/006/007), glossary.md, AI_TEAM.md ให้ตรงกับสถานะ Hub v1 live จริง — เอกสารเหล่านี้เขียนไว้ตอน Jun 30 ก่อน revert เลยผิดหมด

### Session 21 (Jul 5) — WF1 stuck run incident, full resolution
- OpenAI 500 (transient) ที่ node "Message a model1" (สร้างบทความ) → WF1 ไม่มี `retryOnFail` เลย → run ค้างที่ `blog.status:"running"` ยาว 115+ นาที, Telegram Health Alert แจ้งซ้ำ 3 รอบ
- Root cause ยืนยันจากไฟล์ JSON จริง: WF1 ไม่เคยมี retry config ทั้งที่ CLAUDE.md Wave 13 เขียนว่ามีแล้ว (เอกสารผิด)
- แก้: เพิ่ม `retryOnFail:true, maxTries:2, waitBetweenTries:5000` ใน local JSON → Archi import เข้า n8n + archive workflow เก่า
- เจอเพิ่ม: `content_queue` items เก่า (07-03, 07-04) โชว์ `status:"running"` ทั้งที่เผยแพร่สำเร็จจริงแล้ว — บั๊กแยกต่างหาก (ดู ISSUE-009) ไม่รีบแก้
- แก้ของค้างจริง: `queue/clear` → `queue/build` ใหม่เฉพาะ 07-05 ถึง 07-09 (ข้าม 07-03/07-04 ที่เผยแพร่แล้ว) → `queue/run-next` ทันที → ✅ ยืนยันสำเร็จ `blog.status:"completed"`
- รายละเอียดเต็ม: `issues-log.md` ISSUE-008 (timeline ครบ) + ISSUE-009 (บั๊กใหม่ที่พบ ยังไม่แก้)

---

## สถานะปัจจุบันของ workflows

| Workflow | Status | Hub endpoint ที่ใช้จริงตอนนี้ |
|---|---|---|
| Queue Auto-run | Active | Hub v1 `/action/blog/queue/run-next` + `/action/fb/queue/run-next` ผ่าน Vercel proxy |
| WF1 — Article + Publish | Active (retryOnFail fix imported + verified Jul 5, old version archived) | Hub v1 `/webhook/n8n?token=<hmac>` |
| WF2 — Image + Patch | Active | Hub v1 `/webhook/image-done` |
| Wake-up | Active | Hub v1 `/api/state` |
| wf_qc_line (2) | Active (สลับจากตัวเก่าแล้ว) | Hub v1 `/api/qc/ingest` + `/api/qc/feedback` |

---

## งานที่ยังค้างอยู่ (เรียงตาม priority — ดึงจาก CLAUDE.md Pending Tasks)

### 🔴 Critical
0. **[ใหม่ Jul 8]** Market Intel Collector v2 — ยังอยู่ในช่วง monitoring แรกหลัง cutover + hotfix (maxTokens 3000) — แนะนำ spot-check ต่ออีกสักพักว่าไม่มี truncation ซ้ำบนโพสต์ที่ยาวกว่านี้อีก (ดู issues-log.md ISSUE-010)
1. Verify FB token expiry — tokens.md ขัดแย้ง (Jun 26 vs Aug 2), health check ล่าสุด (Jul 2) บอก "เหลือ 30 วัน" ยังไม่ reconcile
2. ~~Import/verify WF1 v8 ACTIVE ใน n8n~~ → **DONE Jul 5** — WF1 ถูกแทนที่ด้วยเวอร์ชันใหม่ที่มี `retryOnFail` แล้ว (ตัวเก่า archived) verified end-to-end ว่าเผยแพร่สำเร็จจริง (ดู issues-log.md ISSUE-008)
3. เอาเกณฑ์ตัวเลขจริงจาก QC checklist/PDF ไปเสริม `QC_SYSTEM_PROMPT` ใน server.cjs — สกัดไว้บางส่วนแล้ว ยังไม่ได้ใส่จริง
4. เช็ค Health Check "Blog Queue ว่าง" (พบ Jul 2) ทั้งที่เพิ่งเติม 7 รายการ — ยังไม่ verify ว่าเป็นปัญหาจริงหรือ timing เฉยๆ
5. เพิ่มรูปอ้างอิง qc_standards หมวด structure, cleanliness — ยังไม่มีรูปเลยทั้งคู่
6. **[ใหม่ Jul 5]** แก้ ISSUE-009 — `content_queue` item status ไม่อัปเดตเป็น `completed` แม้เผยแพร่สำเร็จจริง (ต่ำ severity แต่ทำให้ debug สับสน แนะนำแก้เร็วๆนี้)
7. **[ใหม่ Jul 5]** เปลี่ยนชื่อไฟล์ local `Finnhouses WF1 — Article + Publish (8_wb_fix).json` → `(9_retry_fix).json` ให้ตรง naming convention (housekeeping เท่านั้น ไม่กระทบการทำงาน)
8. **[ใหม่ Jul 8]** Phase 5 roadmap (INTEL-001/002/003, ADR-006) เป็น proposal only — รอ user ตัดสินใจ priority ก่อนเริ่มงานจริง (ดู `docs/ADR/2026-07-08-phase5-roadmap-proposal.md`)

### 🟡 Security
6. ~~Enable RLS: `sites`, `line_users`, `qc_inspections`, `qc_defects`, `qc_standards`, `qc_daily_usage`~~ → **DONE Jul 11 (session 23)** — ดู ISSUE-013
7. ~~`REVOKE anon FROM append_line_image_atomic`~~ → **DONE Jul 11** — ต้อง revoke จาก `PUBLIC` ด้วย ไม่ใช่แค่ per-role
8. ~~`DROP` policy `hub_state` anon_update~~ → **DONE Jul 11**
9. **[ใหม่ Jul 11]** `leads`/`projects` ยังเปิด anon CRUD เต็มที่ (ไม่มีระบบ login เลย) — ต้องออกแบบ auth ก่อนถึงจะล็อกได้จริง รอคุย scope กับ user

### ⚪ Hub v2 Remaining (ห้าม cutover จนกว่าจะครบ)
9. สร้าง `/api/fb/queue/{build,clear,run-next}` บน Hub v2 (งานหลักที่ขาด — ก็อปแพทเทิร์นจาก blog module มาใช้)
10. TASK-303 CacheManager
11. TASK-304 HistoryManager
12. TASK-313 Property Use Cases
13. Cutover TASK-601/602/603 (หลังข้อ 9 เสร็จ + smoke test ผ่านทุก route)

---

## Session 26 (Jul 20, 2026) — AI Content Studio: segment decoupling + full business rebrand

**1. Buyer Segment decoupled from "Positioned" tone + Taste Library segment tagging**
- ปัญหาเดิม: `BUYER_SEGMENTS` selector ใน `components/AIContent.tsx` ใช้ได้แค่ตอนเลือกโทน "Positioned" เท่านั้น และ Taste Library (⭐ starred references) inject ตัวอย่าง 2 อันแรกจาก global list เข้า prompt เสมอ ไม่กรองตามกลุ่มลูกค้า
- แก้: ย้าย segment selector ออกมาเป็น section แยกที่โชว์ตลอด (ใช้ร่วมกับทุกโทนได้), เพิ่ม `segment` field ใน `ContentItem`, เพิ่ม segment-tag ตอน star ใน `HistoryTab`, filter `starredRefs` ด้วย segment ที่เลือกอยู่ก่อน inject เข้า prompt (fallback ไป global ถ้ายังไม่มีตัวไหน tag ตรงกลุ่ม)
- ต่อมา Archi ขอ reorder เพิ่ม — ย้าย section "กลุ่มลูกค้าเป้าหมาย" ขึ้นเป็นอันดับแรกสุด เหนือ Keyword
- ดู `docs/decisions.md` ADR-009

**2. Business model correction — เลิกอ้างอิง "รับสร้างบ้าน" ทั้งหมด**
- Archi ยืนยันตรงๆ ระหว่างคุยเรื่อง keyword ว่า **ไม่ทำธุรกิจรับเหมาก่อสร้าง** — ลูกค้าจริงมีแค่ 2 กลุ่ม: ซื้อ/ฝากขายบ้าน + ที่ปรึกษา/inspector งานก่อสร้าง
- รีแบรนด์ `components/AIContent.tsx` ทั้งไฟล์: `BRAND_FACTS`, `KEYWORDS` (แทนที่ทั้งชุด), `BUYER_SEGMENTS` (3→2), ลบ `STYLES` selector ทิ้งทั้งหมด (house design style ไม่เกี่ยวกับธุรกิจแล้ว), เขียน system prompt ทุกจุดใหม่ (`KeywordTab`/`BlogConvertTab`/`ListingTab`) + `FB_QUEUE_TEMPLATES` (manual queue templates ที่โพสต์ตรงเข้า FB ได้ — เจอ fabricated claims เก่าที่ขัดกฎ "ห้ามปั้นตัวเลข" อยู่แล้วด้วย เช่น "ประสบการณ์สร้างบ้านกว่า 50 หลัง")
- อัปเดต `docs/BUSINESS_MODEL.md` — mark Business Unit 1 (รับสร้างบ้าน) เป็น **DISCONTINUED** (ยังไม่ยืนยันสถานะ Unit 3 Fix & Flip — ต้องถาม Archi ต่อ)
- ดู `docs/decisions.md` ADR-010

**3. Deploy gotcha ที่เจอระหว่างทาง — Vercel "Redeploy" ปุ่มใน dashboard rebuild commit เก่า**
- Push แล้ว "ยังเหมือนเดิม" — เช็คผ่าน Vercel MCP เจอว่า production ยัง pin commit เก่าอยู่ แม้ GitHub มี commit ใหม่แล้วและกด "Redeploy" ไปแล้วก็ตาม เพราะปุ่มนั้น rebuild commit ของ deployment ที่กดจากเมนูเสมอ ไม่ใช่ pull commit ล่าสุด
- Fix: `git commit --allow-empty` + push เพื่อ force trigger webhook ใหม่
- ดู `docs/issues-log.md` ISSUE-015

**Commits**: `e1d73cc` (segment decouple), `d53de6f` (rebrand), `0dc0c42` (reorder), `27387fb` (empty commit trigger redeploy)
**Verify**: ✅ `npx tsc --noEmit` ผ่านทุกรอบ, ✅ ทดสอบจริงบน production — Archi ยืนยัน "ทดสอบแล้ว" พร้อม screenshot output ที่ไม่มีภาษา home-building ปนแล้ว

---

## Session 27 (Jul 20, 2026, ต่อ) — แก้ภาษาไทยเพี้ยนใน AI Content Studio + ยืนยันสัดส่วนธุรกิจ + Platform Structure

**1. AI Content Studio ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ — 2 root cause ซ้อนกัน**
- Archi ส่ง FB post ที่ generate มาให้ตรวจ พบ hashtag สุดท้ายตัดกลางคำ (`#ความมั่นใ`) และคำเพี้ยนกลางประโยค (`วัใจ` แทน "วางใจ")
- วิเคราะห์แยก 2 สาเหตุจากตำแหน่งคำผิด: (1) `callClaude()` ส่ง `maxTokens: 800` fixed ต่ำเกินไปสำหรับเนื้อหาไทย ~220 คำ + hashtag 6-8 อัน → ตัดท้ายข้อความ (2) `KeywordTab.generate()` เรียก `callClaude()` โดยไม่ระบุ model → หลุดไปใช้ default Haiku แทน Sonnet ที่อีก 2 tab (`BlogConvertTab`/`ListingTab`) ใช้อยู่แล้ว
- แก้: `maxTokens` 800→2000 (commit `264ac72`), เปลี่ยนเป็น `"claude-sonnet-4-6"` (commit `c4a9f07`) — ทั้ง 3 จุด generate เนื้อหาไทยตอนนี้ใช้ Sonnet ตรงกันหมด
- ดู `docs/decisions.md` ADR-012, `docs/issues-log.md` ISSUE-016, `CLAUDE.md` Known Bugs #13

**2. Business Unit 3 (Fix & Flip) ยืนยัน active + สัดส่วนธุรกิจจริง 3 หน่วย**
- Archi ยืนยันสัดส่วนธุรกิจจริง: **Develop/Fix & Flip 60% · ที่ปรึกษา/ตรวจสอบ (Unit 4) 30% · โบรกเกอร์ (Unit 2) 10%**
- Clarify ก่อนแก้เอกสาร (AskUserQuestion): คำว่า "Develop" ที่ Archi ใช้ = Fix & Flip (Unit 3 เดิม) **ไม่ใช่** การกลับไปทำ Unit 1 (รับสร้างบ้านใหม่) ที่ discontinued ไปแล้วใน ADR-010 — ยืนยันชัดว่าไม่มีการ revert
- อัปเดต `docs/BUSINESS_MODEL.md`: Unit 3 ลบ flag "ยังไม่ยืนยัน" ระบุเป็นหน่วยธุรกิจหลัก 60%, Unit 2/Unit 4 ระบุสัดส่วน 10%/30%
- ดู `docs/decisions.md` ADR-011

**3. Platform Structure — 2 Pillars (กรอบคิดของ Archi)**
- Archi อธิบายว่าแพลตฟอร์มแบ่งเป็น 2 ส่วน: การตลาดและขาย (AI Content Studio, CRM, OS Dashboard) กับ การบริหารงานก่อสร้าง (Land Analyzer, Budget Tool, QC)
- เพิ่ม section นี้ใน `docs/BUSINESS_MODEL.md` พร้อม note ตามที่ Archi ยืนยันเพิ่มว่า **7 Intelligence Modules ไม่ได้แยกคนละ pillar แต่เชื่อมโยงข้อมูลกันทั้งหมดเพื่อใช้เป็นกลยุทธ์บริหารภาพรวม** (เช่น Construction Intelligence จาก QC ป้อนกลับเข้า Renovation Intelligence ที่ใช้ตัดสินใจ Fix & Flip ครั้งถัดไป)
- ดู `docs/decisions.md` ADR-013

**4. Deprioritized items — confirm จาก Archi**
- ล็อกหน้า `/crm`/`/land-analyzer`: ไม่ต้องทำตอนนี้ ผู้ใช้หลักมีคนเดียว ยอมรับความเสี่ยง
- Hub v2 cutover/archive decision: ไม่รีบ

**Commits**: `264ac72` (maxTokens fix), `c4a9f07`/`ef54b3d`/`2105201` (model fix + docs sync)
**Verify**: ✅ `npx tsc --noEmit` ผ่านทุกรอบ, ✅ deploy ยืนยันผ่าน Vercel MCP (`list_deployments` เทียบ commit), ✅ Archi ทดสอบ regenerate จริงบน production ยืนยันไม่มีคำเพี้ยนอีก

---

## Blog run — สถานะล่าสุด (Jul 5)
- run ค้างของวันที่ 07-05 ถูกแก้แล้ว (`blog.status:"completed"` ยืนยันแล้ว) — queue ปัจจุบันมี 07-05 ถึง 07-09 (5 รายการ, ไม่มี 07-03/07-04 เพราะเผยแพร่แล้วไม่ requeue ซ้ำ)
- ถ้าเจอ stuck อีก ("running" ค้างนาน + Telegram Health Alert แจ้งซ้ำ): เช็คก่อนว่า item ไหนค้างจริง (ดู `content_queue` เทียบกับ `lastSuccessfulKeyword` — ระวัง ISSUE-009 ทำให้ item เก่าที่เผยแพร่แล้วยังโชว์ `running` ปนอยู่) แล้ว reset เฉพาะ item ที่ค้างจริงด้วย `POST /action/blog/queue/clear` + `/action/blog/queue/build` ใหม่โดยไม่เอา item ที่เผยแพร่แล้วกลับเข้าไป
