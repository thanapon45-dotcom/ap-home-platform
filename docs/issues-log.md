# Issues Log

---

## ISSUE-001 — Vercel proxy 404 on /api/blog/queue/run-next
**Date**: 2026-06-30  
**Severity**: Critical  
**Status**: Resolved ✅

**Symptoms**: `POST https://ap-home-platform.vercel.app/api/blog/queue/run-next` → 404 `Route not found`

**Root cause**: `HUB_URL` env var = `https://exciting-creativity-production-4b85.up.railway.app/api`  
route.ts ต่อ path เพิ่ม → `https://.../api/api/blog/queue/run-next` → Hub v2 global 404

**Fix**: เพิ่ม URL normalization ใน route.ts:
```typescript
const HUB = (process.env.HUB_URL ?? "").replace(/\/api\/?$/, "").replace(/\/+$/, "");
```

**Commit**: `a0de659`

**Lesson**: อย่า assume ว่า env var format ถูกต้อง ให้ normalize ใน code เสมอ

---

## ISSUE-002 — Sandbox git add truncates files
**Date**: 2026-06-30  
**Severity**: Critical  
**Status**: Active bug (workaround documented)

**Symptoms**: หลัง Claude รัน `git add` ใน sandbox → commit มี "46 deletions" ผิดปกติ → TypeScript build fail ใน Railway

**Root cause**: Sandbox mount มี cache lag — file ที่ Edit tool เขียนลง Windows filesystem ยังไม่ reflect ใน sandbox mount ตอนรัน `git add`

**Workaround**: Claude รัน `git add` ใน sandbox ไม่ได้ → **user ต้องรัน git add/commit/push จาก Windows PowerShell เท่านั้น**

**Commit ที่เจอปัญหา**: `7c8ee74` (truncated) → fixed by `856683d`

---

## ISSUE-003 — Emoji corrupt ใน TypeScript template literal
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Resolved ✅

**Symptoms**: `server.ts(183,28): error TS1160: Unterminated template literal`

**Root cause**: Emoji `🖼️` ใน template literal ถูก encode ไม่ถูกต้องผ่าน sandbox mount → TypeScript compiler ตีความผิด

**Fix**: แทน emoji ด้วย plain text `[Image]` ใน server.ts

**Rule**: ห้ามใช้ emoji ใน TypeScript files ที่ Claude edit ผ่าน Cowork

---

## ISSUE-004 — Railway ไม่ auto-deploy หลัง git push
**Date**: 2026-06-30  
**Severity**: Medium  
**Status**: Workaround documented

**Symptoms**: git push สำเร็จ แต่ Railway ยังรัน code เก่า → smoke test ยังได้ NOT_FOUND

**Root cause**: Railway GitHub integration ไม่ trigger auto-deploy ในบางกรณี

**Workaround**: เปิด Railway dashboard → กด Redeploy ด้วยตนเอง

**Detection**: ตรวจ Railway build logs timestamp vs git push timestamp

---

## ISSUE-005 — Hub v2 cutover reverted: fb/blog queue routes ไม่มี implement จริง
**Date**: 2026-07-01 (session 18)  
**Severity**: Critical  
**Status**: Resolved via revert ✅ (ของจริงยังค้างใน Hub v2 Remaining tasks)

**Symptoms**: หลังเปลี่ยน `HUB_URL` ไปชี้ Hub v2 + path `/api/blog/queue/*` + header `x-hub-secret` (ตาม ADR-001/002) → ทุก queue request ได้ 404 ทั้งที่ path/header ถูกต้องแล้ว

**Root cause**: Hub v2 backend สร้างไปไกลกว่าที่คิด (AiGateway, BlogUseCase, QcUseCase, HealthMonitor, StateManager, EventBus มีจริงเกือบหมด) **แต่ `fbRoutes.ts` มีแค่ `/api/fb/publish` + `/api/fb/state` — ไม่มี `/api/fb/queue/{build,clear,run-next}` เลย** (blog มีครบ, fb ไม่มี)

**Fix**: Revert `HUB_URL` (Vercel) กลับไป Hub v1 ทันที ยืนยันแล้วว่าใช้งานได้ Jul 1

**Lesson**: ก่อน cutover ครั้งต่อไป ต้องยิง request จริงทดสอบทุก route ที่ Dashboard/n8n เรียกใช้บน Hub v2 ให้ผ่านหมดก่อน — ห้าม assume ว่า route "น่าจะมี" เพราะ module อื่นมีครบแล้ว

**Related**: `docs/decisions.md` ADR-004

---

## ISSUE-006 — n8n Code node: `URLSearchParams is not defined`
**Date**: 2026-07-02 (session 19d)  
**Severity**: Medium  
**Status**: Resolved ✅

**Symptoms**: Code node ที่ parse LINE postback query string ด้วย `new URLSearchParams(str)` พัง `ReferenceError: URLSearchParams is not defined`

**Root cause**: n8n รัน Code node ผ่าน task-runner แบบ sandboxed VM ที่ไม่ expose Node.js global ทุกตัว (ต่างจาก Node.js ปกติ) — `URLSearchParams`/`fetch` ไม่ชัวร์ว่ามีจริง

**Fix**: Parse query string เองด้วย `.split('&')` + `.split('=')` แทน ใช้ `require('https')` ได้ปกติเพราะเป็น Node built-in module ไม่ใช่ browser/global API

**Rule**: ห้าม assume ว่า global ใดๆ มีอยู่ใน n8n Code node sandbox นอกจาก Node built-in ที่ import ผ่าน `require()` เท่านั้น

---

## ISSUE-007 — Market Intel `content_frames` ไม่เคยเขียนสำเร็จเลยตั้งแต่ live
**Date**: 2026-07-02 (session 19e)  
**Severity**: High  
**Status**: Resolved ✅

**Symptoms**: ตาราง `content_frames` ไม่มีแถวเลยทั้งที่ Market Intelligence Collector "live" มาตั้งแต่ 29 พ.ค. — ไม่มี error โผล่ที่ไหนเลย

**Root cause**: Column mismatch ระหว่าง insert payload กับ schema จริงของ `content_frames` รวมกับ `try/catch` ที่กลืน error เงียบๆแทนที่จะ throw/log

**Fix**: แก้ column mapping ให้ตรง schema, เพิ่ม success/fail status เข้า Telegram notification กันเกิดซ้ำแบบไม่รู้ตัว, backfill เขียน FB post ใหม่ 26 โพสต์แทนของเดิมที่หายไป

**Lesson**: ห้ามให้ `try/catch` รอบ DB write กลืน error เงียบๆเด็ดขาด — ต้อง surface pass/fail ไปที่ monitored channel (Telegram) เสมอ

---

## ISSUE-008 — WF1 "Message a model1" ไม่มี retryOnFail → OpenAI transient 500 พัง blog run ทั้ง run
**Date**: 2026-07-05  
**Severity**: Medium  
**Status**: Resolved ✅ **verified in production เดียวกันวันนี้**

**Symptoms**: n8n execution ล้มที่ node "Message a model1" (article generation, `gpt-4o-mini`, `@n8n/n8n-nodes-langchain.openAi`) — error `500 server_error` จาก OpenAI ตรงๆ (ไม่ใช่ปัญหา credential/prompt) เวลา 09:00:36 น. 5 ก.ค. 2026

**Root cause**: node นี้เป็น AI call เดียวใน WF1 ที่สร้างเนื้อหาบทความหลัก — ตรวจ JSON แล้วพบว่า**ไม่มี `retryOnFail` ตั้งไว้เลย** ต่างจาก WF2 (`Upload Media to WordPress`, `PATCH WP Post Featured Image`, `Notify Hub Image Done` มี `retryOnFail:true, maxTries:2, waitBetweenTries:5000` ครบ) และ Queue Auto-run ที่มี retry config อยู่แล้ว — เอกสาร CLAUDE.md Wave 13 (May 31) เคยเขียนว่า "n8n Queue Auto-run + WF1 + WF2 — Retry On Fail: 2, Wait: 5000ms set แล้ว" แต่ตรวจไฟล์ JSON จริงพบว่า **WF1 ไม่เคยมี retry config นี้จริง** — เอกสารผิดมาตั้งแต่ Wave 13

**Fix**: เพิ่ม `retryOnFail:true, maxTries:2, waitBetweenTries:5000` ให้ node "Message a model1" ใน `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (8_wb_fix).json` ให้ตรงกับ pattern ของ WF2 — **ยังไม่ได้ import เข้า n8n จริง ต้อง import ไฟล์ใหม่ทับ workflow ที่ active อยู่**

**Bonus finding**: WF2 node "Generate an image" มี `maxTries:2, waitBetweenTries:5000` ตั้งไว้แต่ `retryOnFail:false` (ปิดอยู่จริง) — น่าจะเป็นความตั้งใจเดิมที่ไม่ต้องการ retry การ generate รูป (ทำให้เปลืองเงินซ้ำถ้า prompt มีปัญหา) แต่ยังไม่ยืนยันกับ Archi — ทิ้งไว้เป็น pending ให้เช็คทีหลัง ไม่แตะตอนนี้

**Lesson**: อย่าเชื่อว่า CLAUDE.md/docs อธิบายสถานะ workflow ถูกต้อง 100% — ตรวจ JSON node property จริงเสมอก่อนสรุปว่า retry/error-handling ถูกตั้งค่าไว้แล้ว โดยเฉพาะ node ที่เรียก external API (OpenAI, WordPress) ซึ่งเสี่ยง transient failure สูง

**Full incident timeline (2026-07-05):**
1. 09:00 — "Message a model1" hit OpenAI 500, workflow died silently (no callback to Hub) → `blog.status` ค้างที่ `running` ไม่มีวันจบเอง
2. Health Check แจ้งเตือนซ้ำ 3 ครั้ง (55 / 85 / 115 นาที) ผ่าน Telegram — ตรงตามที่ระบบควรทำ
3. Archi import ไฟล์ JSON ที่แก้ retryOnFail เข้า n8n แทนตัวเก่า + archive workflow เก่าทิ้ง (ตาม governance rule — ห้าม 2 workflow แย่ง webhook เดียวกัน)
4. เจอว่า content_queue มี 3 รายการ (07-03, 07-04, 07-05) ล้วนโชว์ `status:"running"` ทั้งที่ 07-03/07-04 เผยแพร่สำเร็จไปแล้วจริง (ยืนยันจาก `lastSuccessfulKeyword`) — เป็นบั๊กแยกต่างหาก ไม่ใช่ตัวเดียวกับที่ค้างจริง (ดู ISSUE-009)
5. แก้ด้วย `POST /action/blog/queue/clear` แล้ว `POST /action/blog/queue/build` ใหม่เฉพาะ 07-05 ถึง 07-09 (ไม่เอา 07-03/07-04 ที่เผยแพร่แล้วกลับเข้าคิว กันโพสต์ซ้ำ)
6. สั่ง `POST /action/blog/queue/run-next` ทันทีเพื่อรัน 07-05 ผ่าน workflow ตัวใหม่ (มี retryOnFail แล้ว)
7. ✅ ยืนยันสำเร็จ — `blog.status` เป็น `completed`

**Remaining housekeeping (not urgent)**: ไฟล์ local `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (8_wb_fix).json` ถูกแก้ในไฟล์เดิมโดยตรง (in-place) แทนที่จะสร้างไฟล์เวอร์ชันใหม่ตาม naming convention ใน AI_TEAM.md section 12 (ควรเป็น `(9_retry_fix).json`) — เบี่ยงเบนจาก convention เล็กน้อย ไม่กระทบการทำงานจริงเพราะ n8n import แล้ว ใช้งานได้ปกติ แต่ควรตั้งชื่อไฟล์ใหม่ให้ถูกต้องภายหลังเพื่อความสะอาดของ repo

---

## ISSUE-009 — content_queue item status ไม่เคยอัปเดตเป็น "completed" แม้เผยแพร่สำเร็จจริง
**Date**: 2026-07-05  
**Severity**: Low (cosmetic — ไม่กระทบการเผยแพร่จริง)  
**Status**: Open — พบระหว่างแก้ ISSUE-008 ยังไม่ได้แก้

**Symptoms**: `content_queue` items ของ 07-03 และ 07-04 ยังโชว์ `"status": "running"` ทั้งที่บทความเผยแพร่สำเร็จไปแล้วจริง (ยืนยันจาก `blog.lastSuccessfulKeyword` ที่ตรงกับ keyword ของ 07-04)

**Root cause**: ยังไม่ได้ตรวจโค้ด — สงสัยว่า Hub อัปเดตแค่ top-level `blog.status`/`lastSuccessfulKeyword` ตอนเสร็จงาน แต่ไม่ได้วนกลับไปแก้ `status` ของ item ที่ตรงกันใน `content_queue` array

**Impact ตอนนี้**: ต่ำ — ไม่กระทบการเผยแพร่จริง แต่ทำให้ดู `/api/state` แล้วเข้าใจผิดว่างานค้างอยู่ (เป็นสาเหตุที่ทำให้ session นี้ต้องเสียเวลาแยกแยะว่าอันไหนค้างจริงอันไหนแค่โชว์ผิด)

**Fix ที่แนะนำ (ยังไม่ทำ)**: หา code ใน Hub v1 (`server.cjs`) ที่ handle callback สำเร็จ (`/webhook/n8n`) แล้วเพิ่ม logic อัปเดต `content_queue` item ที่ตรง `runId` ให้เป็น `status:"completed"` ด้วย ไม่ใช่แค่ top-level state

---

## ISSUE-010 — Market Intel v2: Claude Haiku response truncated mid-JSON บน production post จริงที่ยาว/ละเอียด
**Date**: 2026-07-08 (พบระหว่าง Post-Deployment Monitoring ของ ADR-005 Stage 2 — ตรงตาม Outstanding Risk ที่ report เขียนไว้ล่วงหน้า)
**Severity**: High (data loss — โพสต์จริงไม่ถูกบันทึก)
**Status**: Resolved ✅ **verified บน production ด้วยโพสต์จริง 3 รายการติดต่อกันหลังแก้**

**Symptoms**: Telegram แจ้ง error "Market Intelligence Error (v2 test)" พร้อม `Expected ',' or '}' after property value in JSON at position 2346` บนโพสต์ขายบ้านจริง (#ขายบ้าน พฤกษา 8 ซอย 18 — มีรายละเอียดของแถม/ขนาด/โปรโมชันเยอะ)

**Root cause**: `raw_model_text_debug` (debug field ที่เพิ่มไว้ตั้งแต่ Phase 4.1a เพื่อ diagnose เคสแบบนี้โดยเฉพาะ) แสดงว่า response ของ Claude Haiku **ถูกตัดกลางคำจริง** — `"rubric_note": "การสูญเสียรายรับเพื่อให้ได้ผู้ซื้อและปิ` (คำว่า "ปิดการขาย" ขาดหาย) — `maxTokens:1600` (ค่าที่ตั้งไว้ตั้งแต่ Phase 4.1a หลังเจอปัญหาเดียวกันแบบเบากว่าตอน dry run) ไม่พอสำหรับโพสต์ที่มีรายละเอียดเยอะ เพราะ prompt สั่งให้ Claude ใส่ evidence array + rubric_note ยาวสำหรับทั้ง 8 signal key ต่อโพสต์ ยิ่งโพสต์ยาว/ซับซ้อน model ยิ่งเขียนตอบยาวตาม

**Fix**: เพิ่ม `maxTokens` จาก 1600 → 3000 (ประมาณ 2 เท่าของจุดที่โดนตัด เผื่อ headroom) ใน `this.helpers.request` body ของทั้ง 2 Parse node (`🤖 FB: Normalize + Parse`, `🤖 Manual: Normalize + Parse`) — ให้ user copy-paste โค้ดเต็มทั้ง 2 node แทนการแก้แบบ positional ตามที่ user ขอไว้ตั้งแต่ต้น session

**Verification**: หลังแก้ ทดสอบด้วยโพสต์จริง 3 รายการติดต่อกันผ่าน production Manual Input webhook — ทั้งหมดบันทึกสำเร็จ (`content_frames.id=87,88,89`), 2 ใน 3 รันใช้เวลานานผิดปกติ (25.9s, 30.5s เทียบกับ ~11s ของรันปกติ) ยืนยันว่าเป็นการ generate ยาว/ละเอียดจริง ไม่ใช่แค่ post สั้นๆที่บังเอิญผ่าน — ไม่มี `raw_model_text_debug` โผล่อีกเลย, ทุก signal key ครบ 9 ตัว, `urgency`/`seller_motivation` ยังคง distinct evidence ตามกฎเดิม

**Fail-safe ที่ทำงานถูกต้องอยู่แล้ว (ไม่ต้องแก้)**: `parse_ok:false` เมื่อ parse fail, error routed ไป `❌ Telegram: Error`, ไม่มีการเขียนข้อมูลผิดพลาดลง Supabase เลย, `normalizeSignal()` ให้ default ปลอดภัยทุก field — ระบบ fail-safe ทำงานตามที่ออกแบบไว้ 100% ปัญหาจริงคือ "โพสต์นั้นหายไป" ไม่ใช่ "ข้อมูลผิดถูกบันทึก"

**Lesson**: token limit ที่ปรับจาก mocked/scripted test cases (สั้น จำกัด) ไม่การันตีว่าพอสำหรับ organic production traffic จริงที่หลากหลายกว่ามาก — ต้องเผื่อ headroom กว้างกว่าที่ dry run บ่งชี้ไว้ (2x ไม่ใช่ 1.1x) และ debug field แบบ `raw_model_text_debug` ที่เตรียมไว้ล่วงหน้าตั้งแต่ Phase 4.1a ทำให้ diagnose ปัญหานี้ได้ในไม่กี่นาทีแทนที่จะต้องเดา — คุ้มค่าที่เตรียมไว้ก่อน

**Related**: `docs/decisions.md` ADR-005, `docs/ADR/2026-07-08-market-intel-v2-stage2-production-cutover-report.md` (Outstanding Risks section ที่ระบุความเสี่ยงนี้ไว้ล่วงหน้าก่อนเกิดจริง)

---

## ISSUE-011 — ListingTab "Post to Facebook" คืน HTTP 500 แม้เปลี่ยน token ใหม่แล้ว
**Date**: 2026-07-10/11 (session 23)
**Severity**: High (ฟีเจอร์หลักใช้ไม่ได้)
**Status**: **RESOLVED 2026-07-11 (session 23 ต่อ)** — โพสต์ผ่านจริงแล้ว ยืนยันจาก user (screenshot ปุ่มขึ้น "✅ โพสต์แล้ว!" และเห็นโพสต์บน Facebook จริง)

**Root cause ที่แท้จริง (ไม่ใช่ token)**: `FB_BACKEND_URL` env var **ไม่เคยถูกตั้งค่าใน Vercel project เลย** (คนละที่จาก Railway `easygoing-friendship` env vars ที่เคยเช็คแล้ว) — `app/api/fb/publish/route.ts` เช็ค `if (!FB_BACKEND)` แล้ว return `{ok:false, error:"FB_BACKEND_URL not configured"}` ที่ status 500 ทันทีโดยไม่เคยยิง fetch ไป Railway เลยด้วยซ้ำ — เพราะงั้น token ที่เปลี่ยนไปหลายรอบก่อนหน้าไม่มีผลอะไรกับปัญหานี้เลย

**วิธี diagnose ที่ได้ผลจริง (แทนการง้อ browser DevTools)**:
1. เพิ่ม `console.error` ใน `route.ts` (ไม่ช่วย — Vercel `get_runtime_logs` ไม่จับ console output แยก เห็นแค่ summary line `POST ... 500`)
2. **วิธีที่ได้ผลจริง**: แก้ `ListingTab.postToFacebook()` ให้เก็บ `data.error` ลง state แล้วโชว์เป็นข้อความสีแดงใต้ปุ่มใน UI ตรงๆ — เจอข้อความ `"FB_BACKEND_URL not configured"` ทันทีโดยไม่ต้องพึ่ง DevTools เลย → ชี้ตรงไปที่ env var ที่หายไป
3. เพิ่ม `FB_BACKEND_URL=https://easygoing-friendship-production-e663.up.railway.app` ใน Vercel Environment Variables (Production + Preview) → redeploy → ผ่านทันที

**Lesson**: เวลา proxy route คืน error, ต้องเช็คก่อนว่า error message มาจาก "proxy เอง" (เช่น env var validation) หรือมาจาก "upstream service จริง" — ทั้งสองแบบคืน status 500 เหมือนกันแต่ root cause ต่างกันคนละเรื่อง การโชว์ error message จริงใน UI (แทนที่จะซ่อนไว้แล้วโชว์แค่ "❌ ผิดพลาด") ทำให้ diagnose ได้เร็วกว่าการไล่ browser DevTools มาก — ควรทำแบบนี้กับทุก proxy route ที่มี env var dependency

**Symptoms**: กดปุ่ม "Post to Facebook" ใน ListingTab (`components/AIContent.tsx`) → UI แสดง "❌ ผิดพลาด" — เกิดซ้ำ 2 ครั้งคนละวัน รวมถึงหลังเปลี่ยน `FB_PAGE_ACCESS_TOKEN` เป็นค่าใหม่แล้ว

**สิ่งที่ตรวจไปแล้วและ "ไม่ใช่" สาเหตุ (ตัดออกแล้ว)**:
- ไม่ใช่ STUB mode — `/health` ยืนยัน `fb_configured:true`, `page_id` ตรง `107645087471724`
- ไม่ใช่ token เก่าหมดอายุ — เดิน user ผ่าน Graph API Explorer เต็มกระบวนการ (short-lived → 60-day long-lived → derived Page token จาก `/me/accounts`) ใส่ Railway env var ใหม่แล้ว redeploy แล้ว → **ยังพัง 500 เหมือนเดิม**

**Root cause**: **ยังไม่ทราบ** — diagnostic path ที่มีอยู่ตันหมด:
1. Vercel `get_runtime_logs` เห็นแค่ `POST /api/fb/publish 500` (status code, ไม่มี body) เพราะ `app/api/fb/publish/route.ts` proxy status ต่อจาก FB-backend ตรงๆ ไม่มี `console.error` log body
2. sandbox `curl` ตรง Railway host โดน network allowlist บล็อก (exit code 56) — ยิง authenticated request จาก sandbox ไม่ได้
3. user ส่ง browser **Console tab** มาให้ 2 รอบ (ไม่ใช่ Network tab) — มีแต่ noise ไม่เกี่ยวข้อง (MozBar, LaunchDarkly, CORS บน `/api/state`, RSC prefetch fail) ไม่มี error body จริงจาก `/api/fb/publish` เลย

**สิ่งที่ต้องทำต่อ (ตอนเปิด session ใหม่)**: ขอ user เปิด browser DevTools → แท็บ **Network** (ไม่ใช่ Console) → กด Post to Facebook → คลิกแถว `publish` (สีแดง, 500) → แท็บ **Response/Preview** → คัดลอก JSON เต็ม (`{"ok":false,"error":"..."}`) มาให้ก่อน — ห้ามเดา fix โดยไม่มี error body จริง (อาจเป็น permission/scope ไม่พอ, ต้อง Business Verification, malformed request payload ใน `postToFacebook()`, หรือ Graph API reject ด้วยเหตุผลอื่น)

**Files ที่เกี่ยวข้อง**: `app/api/fb/publish/route.ts` (Next.js proxy, ยิงตรง `FB_BACKEND_URL`) → `services/fb-backend/server.js` (`postToFacebook()` เรียก Graph API จริง `graph.facebook.com/{version}/{PAGE_ID}/photos\|feed`) — **คนละ code path** จาก Hub v1's `/action/fb/publish` ใน `server.cjs` (ที่มี `withRetry` + state write + Telegram alert) ซึ่ง ListingTab ไม่ได้เรียกใช้เลย

**Lesson (ชั่วคราว จนกว่าจะแก้จบ)**: อย่า assume ว่า token คือสาเหตุเสมอเวลา FB API คืน error — ต้องดู error body จริงก่อน ไม่งั้นเสียเวลาไล่ผิดทาง (รอบนี้เสีย 1 รอบเต็มไปกับการขอ token ใหม่ที่สุดท้ายไม่ใช่ตัวแก้)

---

## ISSUE-012 — ListingTab AI เขียนประเภทบ้านผิด ("บ้านเดี่ยว" ทั้งที่ทรัพย์จริงเป็นทาวน์เฮ้าส์)
**Date**: 2026-07-11 (session 23 ต่อ, พบทันทีหลังแก้ ISSUE-011 เสร็จ — โพสต์แรกที่ทดสอบจริง)
**Severity**: Medium (เนื้อหาโพสต์ผิดข้อเท็จจริง กระทบความน่าเชื่อถือ ไม่ใช่ระบบล่ม)
**Status**: Fix แล้ว รอ verify — ยังไม่ได้ redeploy/test ซ้ำ

**Symptoms**: โพสต์ "หมู่บ้านสวนทองวิลล่า7 ลำลูกกา คลอง 4" ที่ user ยืนยันว่าเป็น**ทาวน์เฮ้าส์** แต่เนื้อหาที่ AI สร้างเขียนว่า "บ้านเดี่ยว 2 ชั้น ใน..." — ผิดประเภททรัพย์

**Root cause**: prompt ใน `ListingTab.generate()` ส่ง `ประเภท: ${selected.property_type}` เข้า system prompt ถูกต้องอยู่แล้ว แต่กฎ "ห้าม hallucinate" เดิมพูดกว้างๆ แค่ "ราคา/ห้องนอน/ทำเล/พื้นที่" ไม่ได้เจาะจงเรื่อง "ประเภทบ้าน" ไว้ตรงๆ — Claude เผลอเขียน "บ้านเดี่ยว" เป็น default word choice ทั้งที่ข้อมูลจริงบอกเป็นทาวน์เฮ้าส์

**Fix**: เพิ่มกฎเหล็กข้อใหม่ใน system prompt (`components/AIContent.tsx`, ฟังก์ชัน `generate()` ของ `ListingTab`) บังคับให้ประเภทบ้านต้องตรงกับ `selected.property_type` เป๊ะๆ ห้ามเขียน "บ้านเดี่ยว" ถ้าข้อมูลจริงไม่ได้ระบุว่าเป็นบ้านเดี่ยว — ยังไม่ commit/push/redeploy ณ ตอนบันทึก

**สิ่งที่ต้องทำต่อ**: commit + push + redeploy แล้วให้ user gen ทรัพย์ทาวน์เฮ้าส์/บ้านแฝดซ้ำอีกรอบ เช็คว่าประเภทถูกต้อง — ถ้ายังพลาดอีก อาจต้องเช็คว่า `selected.property_type` จาก WordPress API ส่งค่ามาถูกต้องหรือเปล่าด้วย (เผื่อ field ว่างเปล่าที่ WP source เอง ไม่ใช่ prompt)
