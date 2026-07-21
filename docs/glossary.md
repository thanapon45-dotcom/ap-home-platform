# Glossary — AP-Home Platform

---

## Services

| Term | ความหมาย |
|---|---|
| **Hub v1** | ⚠️ **LIVE ตอนนี้** — backend (`server.cjs`, Express) บน Railway — `ap-home-platform-production.up.railway.app` — `HUB_URL` (Vercel) ชี้ที่นี่หลัง revert Jul 1, 2026 |
| **Hub v2** | TypeScript backend (clean architecture) บน Railway — `exciting-creativity-production-4b85.up.railway.app` — **Shadow only** (ไม่ serve production traffic) ตั้งแต่ revert Jul 1 — ห้าม cutover จนกว่า `/api/fb/queue/*` + `/api/blog/queue/*` จะ implement ครบ (ดู decisions.md ADR-004) |
| **Dashboard** | Next.js frontend บน Vercel — `ap-home-platform.vercel.app` |
| **n8n** | Workflow automation — `primary-production-8158a.up.railway.app` |
| **Shadow mode** | Hub v2 status ปัจจุบัน — deploy อยู่, รับ request ทดสอบได้ แต่ `HUB_URL` การันตีไม่ได้ชี้มา ไม่ได้ serve production traffic จริง |

---

## n8n Workflows

| Term | ความหมาย |
|---|---|
| **WF1** | Workflow 1 — Article + Publish: รับ webhook จาก Hub **v1** (หลัง revert), เขียน article, publish ไป WordPress, callback กลับ Hub v1 `/webhook/n8n?token=<hmac>` |
| **WF2** | Workflow 2 — Image + Patch: รับ webhook จาก WF1, generate image, patch WordPress post, callback Hub v1 `/webhook/image-done` |
| **Queue Auto-run** | Schedule workflow — ดึง item จาก content queue แล้ว trigger blog/fb run ทุกวัน (Cron `09:05` ปัจจุบัน) ผ่าน Vercel proxy → Hub v1 `/action/blog\|fb/queue/run-next` |
| **Wake-up** | Schedule workflow — ping Hub v1 health ทุกวัน (Cron `09:02`) เพื่อป้องกัน Railway sleep |
| **Market Intelligence Collector v2 (ADR-005)** | ⚠️ **LIVE ตอนนี้** — n8n workflow ID `lrLOjW4GPd5atYhz`, webhook path `market-intel/fb` + `market-intel/manual` (path เดิม ไม่เปลี่ยน) — รับโพสต์/observation → Claude Haiku parse เป็น 9-signal JSON → เขียน `market_insights`, `buyer_context_signals` (conditional), `content_frames` ผ่าน native Supabase node → Telegram แจ้งผล พร้อม saveOk/saveError status. เข้าแทนที่ `Finnhouses — Market Intelligence Collector v1(2)` (ID `F3i4dQMubgbm21d6`) ตั้งแต่ 2026-07-08 ~16:01 — ตัวเก่า unpublished เก็บไว้ rollback ไม่ได้ลบ |

---

## Authentication

| Term | ความหมาย |
|---|---|
| **HUB_SECRET / HUB_TOKEN** | Shared secret ระหว่าง Dashboard, n8n, Hub — ค่าจริงดูใน Smoke Test Commands section ของ CLAUDE.md (ไม่ hardcode ซ้ำที่นี่) |
| **x-hub-token** | ⚠️ **Header ที่ใช้จริงตอนนี้** — Hub v1 ใช้ตรวจ auth ทุก protected route (`/api/state`, `/action/...`) |
| **x-hub-secret** | Header convention ของ **Hub v2** เท่านั้น (ยังไม่ live) — อย่าใช้กับ Hub v1 |
| **HMAC token** | `/webhook/n8n` ใช้ HMAC-SHA256(HUB_SECRET, runId) เป็น query param `?token=` แยกจาก header auth |

---

## State Fields

| Term | ความหมาย |
|---|---|
| **blog.status** | `idle` / `running` / `completed` / `failed` |
| **blog.runId** | ID ของ blog run ปัจจุบัน เช่น `run_da089n87` |
| **image_status** | สถานะ image callback จาก WF2: `patched` / `failed` / `binary_failed` |
| **content_queue** | Array ของ ContentQueueItem — pending items รอ blog run |
| **ContentQueueStatus** | `pending` / `running` / `completed` / `failed` |
| **qc_inspections.human_feedback** | `"correct"` / `"incorrect"` — inspector กดยืนยันผ่าน LINE Quick Reply ว่า AI ตรวจ QC ถูกหรือผิด (เพิ่ม session 19d, Jul 2) เก็บ raw data เท่านั้น ยังไม่มี dashboard/query สรุป % |
| **human_feedback_at** | timestamp ที่ inspector กดปุ่ม feedback |
| **content_frames** | ตาราง Market Intel เก็บ content angle ที่สกัดจาก FB post — เคยพังเงียบๆตั้งแต่ live (ดู issues-log.md ISSUE-007) แก้แล้ว Jul 2. **สคีมาจริง (verified ผ่าน Supabase MCP, Jul 7)**: 18 คอลัมน์ — `id, created_at, frame_text, frame_type, target_segment, target_context, keyword, tone, channel, publish_date, engagement_score, likes, comments, shares, post_url, is_starred, star_note, performance_data` (ไม่มี `area`/`timing_signal`/`source_type` เป็นคอลัมน์จริง — ข้อมูลพวกนี้ถูกยัดรวมอยู่ใน `target_context` แบบ composite string ตาม fix ของ ISSUE-007). ADR-005 (Jul 7) เพิ่ม 4 คอลัมน์ additive: `signals JSONB, positioned_content JSONB, ai_summary JSONB, collector_version TEXT DEFAULT 'v1'` — migrate แล้ว (75 แถวเดิม, ไม่กระทบข้อมูลเก่า) ดู `docs/ADR/2026-07-07-market-intel-signals-schema.md` และ `docs/market-intel-collector-source-of-truth.md`. **ตั้งแต่ Jul 8 แถวใหม่ทั้งหมดมี `collector_version:"v2"`** — เขียนโดย Market Intelligence Collector v2 (ดู n8n Workflows section ด้านบน) |
| **signals (JSONB)** | field ใน `content_frames` — object 9 keys เสมอ: `demand, price, offer, finance, value, location, urgency, seller_motivation` (มาจาก Claude Haiku ต่อโพสต์) + `liquidity` (**บังคับด้วยโค้ดเสมอ ไม่ใช่ LLM-generated** — `{level:null, confidence:0, source_scope:"area_aggregate"}` จนกว่า Hub aggregation job จะสร้าง ดู Phase 5 INTEL-001) แต่ละ key ย่อยมี `level` (`low`\|`medium`\|`high`\|`null`), `confidence` (0.0-1.0), `evidence` (array คำ/วลีจริงจากข้อความ), `rubric_note`, `source_scope`. **กฎ**: `urgency` ต้องเป็นภาษาที่ปรากฏตรงๆ (เช่น "ด่วน"), `seller_motivation` ต้องเป็นเหตุผลที่อนุมานได้ (ย้ายงาน/หนี้สิน) — ห้าม restate กัน ตรวจแล้วว่า distinct จริงบน real model response (ดู ADR-005) |
| **maxTokens** | ค่า token budget ที่ส่งให้ Claude Haiku ต่อ 1 call ใน Market Intel Parse node — ปัจจุบัน **3000** (เพิ่มจาก 1600 หลัง ISSUE-010, Jul 8) โพสต์ที่มีรายละเอียดเยอะ (ของแถม/ขนาด/โปรโมชัน) ทำให้ model ตอบยาว เสี่ยงชนค่านี้แล้ว JSON ถูกตัดกลางคำ ตรวจได้จาก field `raw_model_text_debug` |
| **ListingTab** | Tab ใน `components/AIContent.tsx` — สร้าง FB copy จากทรัพย์จริง (WordPress `/api/property/list`) ต่างจาก Keyword tab ที่สร้างจาก keyword ล้วนๆ ตั้งแต่ session 23 (Jul 10) ดึง `BUYER_SEGMENTS` persona `"resale"` + `BRAND_FACTS` เข้า system prompt แล้ว (ก่อนหน้านี้ไม่ได้ใช้ persona เลย) — บังคับโครงสร้าง hook 5 ข้อ ประโยคเปิดต้องเป็นฉาก/อารมณ์ล้วนๆ ห้ามมีราคา/hype ปนบรรทัดแรก ดู decisions.md ADR-007 |
| **FB publish path (ListingTab)** | `ListingTab.postToFacebook()` → `POST /api/fb/publish` (`app/api/fb/publish/route.ts`, Next.js proxy) → `FB_BACKEND_URL` (Railway service `easygoing-friendship`, `services/fb-backend/server.js` `postToFacebook()`) → Facebook Graph API ตรง — **คนละ path จาก Hub v1's `/action/fb/publish`** (ที่มี retry + state write + Telegram alert) ซึ่ง ListingTab ไม่ได้ใช้เลย ✅ **RESOLVED Jul 11** — root cause คือ `FB_BACKEND_URL` env var ไม่เคยตั้งใน Vercel เลย (ไม่ใช่ token) เพิ่มแล้ว ดู issues-log.md ISSUE-011 |
| **postError (ListingTab/BlogTab)** | state ใหม่ใน `AIContent.tsx` (เพิ่ม session 23, Jul 11) เก็บ `data.error` จริงจาก `/api/fb/publish` response แล้วโชว์เป็นข้อความสีแดงใต้ปุ่ม "Post to Facebook" — แก้ปัญหาที่โค้ดเดิมทิ้ง error message ทิ้งไปเลย ทำให้ diagnose ปัญหา publish ไม่ได้เลยถ้าไม่พึ่ง browser DevTools |
| **RLS status (Supabase, `omvpagvqyfmkkhzuuzda`)** | **Hardened Jul 11 (session 23, ISSUE-013)** — เกือบทุกตารางล็อกแล้ว (เปิด RLS + ลบ permissive policy) ยกเว้น `leads` (CRM) และ `projects` (Land Analyzer) ที่ยังเปิด anon CRUD เต็มที่เพราะ **platform ไม่มีระบบ login เลย** `market_listings` anon-insert เก็บไว้ตามเดิมเพราะเป็นของจริง (`scripts/scrape-market.js`) Hub ทุกจุด (v1+v2) ใช้ `SUPABASE_SERVICE_KEY` เขียนอยู่แล้ว ไม่กระทบจากการล็อกนี้เลย |
| **BUYER_SEGMENTS** | Array ใน `components/AIContent.tsx` — **เปลี่ยนจาก 3 เป็น 2 กลุ่ม (Jul 20, session 26, ADR-010)**: `resale` (ซื้อ/ฝากขายบ้าน — ค่าเดิม ไม่เปลี่ยน value เพื่อไม่กระทบ `ListingTab` ที่ hardcode หา `"resale"`) และ `inspection` (ที่ปรึกษา/ตรวจสอบงานก่อสร้าง — ใหม่) — ตัวเก่า `build_handsoff`/`build_handson` (สร้างบ้าน Hands-off/Hands-on) ถูกลบทิ้งเพราะ Finnhouses ไม่ทำธุรกิจรับเหมาก่อสร้างแล้ว แต่ละ segment มี `fear`/`need`/`key_message`/`framed` examples ใช้กำหนด hook ใน prompt |
| **Buyer Segment selector (KeywordTab)** | **เดิม (ก่อน Jul 20)**: ซ่อนอยู่ใต้เงื่อนไข `tone === "positioned"` เท่านั้น ใช้กับโทนอื่นไม่ได้เลย **ตอนนี้ (session 26, ADR-009)**: เป็น section แยกที่แสดงตลอด อยู่เหนือ Keyword field (บนสุดของ Settings panel) ใช้ร่วมกับทุกโทนได้ — Awareness Level + Timing Signal ยังผูกอยู่กับ Positioned Mode เท่านั้นเหมือนเดิม (ไม่ decouple เพราะเป็นโครงสร้าง prompt เฉพาะของโทนนั้น) |
| **segment (ContentItem field / Taste Library)** | Field ใหม่บน `ContentItem` type (session 26, ADR-009) — tag กลุ่มลูกค้าตอนกด ⭐ star เก็บ content เป็น reference ใน `HistoryTab` ใช้กรอง `starredRefs` ก่อน inject เข้า prompt ให้ตรงกับ `buyerSeg` ที่กำลังเลือกอยู่ (เดิม inject 2 อันแรกจาก global list เสมอไม่กรองอะไรเลย) — ถ้ายังไม่มี ref ไหน tag ตรงกลุ่มปัจจุบันเลย fallback ไปใช้ global list เหมือนพฤติกรรมเดิม |
| **STYLES (house design style selector)** | **ลบทิ้งทั้งหมดแล้ว (Jul 20, session 26, ADR-010)** — เคยเป็น selector "สไตล์บ้าน" (Contemporary/Nordic/Minimal/Modern Tropical/Luxury) ใน `KeywordTab` ไม่เกี่ยวกับธุรกิจจริงอีกต่อไปเพราะ Finnhouses ไม่ทำธุรกิจสร้างบ้านแล้ว `generateImageConcept()`/`generateImage()` เปลี่ยนจาก "house style + architectural pencil sketch" เป็น real-estate photo concept ทั่วไปแทน `ContentItem.style` field ยังอยู่ใน type เพื่อ backward-compat กับ `BlogConvertTab`/`ListingTab` ที่ set เป็น `"—"` แต่ไม่มี UI selector แล้ว |
| **`callClaude()` model default rule** | **เพิ่ม session 27, Jul 20 (ADR-012, ISSUE-016)** — helper ใน `AIContent.tsx` (`components/AIContent.tsx:227`) มี default `model = "claude-haiku-4-5-20251001"` — Haiku ใช้ได้เฉพาะงานที่ไม่ user-facing โดยตรง (เช่น `generateImageConcept()` ที่เป็น prompt ภาษาอังกฤษสั้นๆ) เนื้อหาไทยที่จะโพสต์จริง**ต้องระบุ `"claude-sonnet-4-6"` เสมอ** — เคยลืมใส่ใน `KeywordTab.generate()` มาก่อน ทำให้ FB post ที่ generate ออกมาภาษาเพี้ยน/คำขาด กว่าจะเจอเพราะ Archi ตรวจ output เอง — เพิ่ม `generate()` ใหม่ที่ไหนต้องเช็ค default model ก่อนเสมอ |
| **Platform Structure — 2 Pillars** | **เพิ่ม session 27, Jul 20 (ADR-013)** — กรอบคิดของ Archi แบ่ง product ในแพลตฟอร์มเป็น 2 กลุ่ม: **การตลาดและขาย** (AI Content Studio, CRM, OS Dashboard — สนับสนุน Unit 2 โบรกเกอร์ + ฝั่งขายของ Unit 3 Fix & Flip) กับ **การบริหารงานก่อสร้าง** (Land Analyzer, Budget Tool, QC — สนับสนุนฝั่งปฏิบัติการของ Unit 3 + Unit 4 ที่ปรึกษา/ตรวจสอบโดยตรง) — 7 Intelligence Modules ไม่ได้แยกคนละ pillar แต่เชื่อมโยงข้อมูลกันทั้งหมดเป็น data layer กลางที่ใช้เป็นกลยุทธ์บริหารภาพรวม ดู `docs/BUSINESS_MODEL.md` |

---

## File Naming Convention

| Pattern | ความหมาย |
|---|---|
| `WF2 (5_hub_v2).json` | WF2 version 5, ชี้ Hub v2 — ไฟล์ล่าสุดใช้ import n8n |
| `WF1 (8_wb_fix).json` | WF1 version 8, webhook body fix |
| `Queue Auto-run (4).json` | Queue Auto-run version 4 |

---

## Dev Workflow Rules

| Rule | เหตุผล |
|---|---|
| `git add/commit/push` จาก **Windows PowerShell เท่านั้น** | Sandbox mount cache ตัดไฟล์ |
| ไม่ใช้ **emoji** ใน TypeScript files | Encoding corrupt ผ่าน sandbox |
| ไม่ใส่ `/api` ต่อท้าย `HUB_URL` | route.ts normalize เองแล้ว |
| Railway อาจต้อง **Redeploy ด้วยตนเอง** | auto-deploy ไม่ trigger เสมอไป |
| PowerShell ใช้ **`;`** แทน **`&&`** | PowerShell รุ่นเก่าไม่รู้จัก `&&` |
| Vercel: ห้ามใช้ปุ่ม **"Redeploy"** เพื่อดึง commit ล่าสุด | Redeploy rebuild commit เดิมของ deployment ที่กดเสมอ ไม่ pull `main` ล่าสุด — เช็ค `git log origin/main` เทียบ Vercel deployment commit ก่อน แล้ว push commit เปล่า (`--allow-empty`) เพื่อ force trigger แทน (ดู issues-log.md ISSUE-015) |
