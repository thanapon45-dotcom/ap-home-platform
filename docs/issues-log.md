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
**Status**: **RESOLVED 2026-07-11** — root cause คือ data entry ผิดใน WordPress ไม่ใช่บั๊กโค้ด (prompt fix ที่ทำไปยังมีประโยชน์เป็น safety net แต่ไม่ใช่ตัวแก้จริง)

**Symptoms**: โพสต์ "หมู่บ้านสวนทองวิลล่า7 ลำลูกกา คลอง 4" ที่ user ยืนยันว่าเป็น**ทาวน์เฮ้าส์** แต่เนื้อหาที่ AI สร้างเขียนว่า "บ้านเดี่ยว 2 ชั้น ใน..." — ผิดประเภททรัพย์ แม้หลัง deploy prompt fix (commit `29070b7`) แล้วก็ยังเขียนผิดเหมือนเดิม

**Root cause ที่แท้จริง**: `property_type` ที่ Hub v1 ส่งมา (`server.cjs` → `getTaxTerm("property_type")` บรรทัด 1656) ดึงมาจาก **WordPress taxonomy term ของโพสต์นั้นๆ ตรงๆ** — user เช็ค WP admin แล้วยืนยันว่าโพสต์นี้ติด taxonomy term **"บ้านเดี่ยว" ผิดประเภทมาตั้งแต่ต้น** (data entry error ตอนสร้างโพสต์ใน WordPress) ไม่เกี่ยวกับ prompt/AI เลย — AI เขียนตาม data ที่ได้รับมาถูกต้องแล้ว เพียงแต่ data ต้นทางผิด

**สิ่งที่แก้ไปก่อนหน้า (ยังคงประโยชน์)**: prompt rule ใหม่ใน `components/AIContent.tsx` (commit `29070b7`) ที่บังคับให้ AI ใช้ `property_type` ตรงตามที่ระบุเป๊ะๆ — ไม่ใช่ตัวแก้ปัญหานี้โดยตรง แต่ป้องกันไม่ให้ AI hallucinate เพิ่มเติมในกรณีอื่นที่ data ถูกต้อง ควรเก็บไว้

**Fix จริง**: user แก้ taxonomy term ในโพสต์ WordPress จาก "บ้านเดี่ยว" → "ทาวน์เฮ้าส์" โดยตรงผ่าน WP admin

**Lesson**: เวลาบั๊กเนื้อหาแบบนี้เกิดซ้ำหลัง fix โค้ดแล้ว ต้องไล่เช็คต้นทางข้อมูลจริง (WordPress taxonomy ในกรณีนี้) ก่อนจะสันนิษฐานว่าเป็นบั๊ก AI/prompt เสมอ — ควรพิจารณาเพิ่ม validation หรือ warning ใน ListingTab UI ในอนาคตถ้าพบว่า field สำคัญ (property_type, price) ว่างเปล่าหรือดูผิดปกติ เพื่อลดความเสี่ยงจาก data entry error ที่ WP source

---

## ISSUE-013 — Supabase RLS/permission hardening (พบระหว่าง critique ภาพรวม platform)
**Date**: 2026-07-11 (session 23 ต่อ)
**Severity**: High (security debt สะสมมาตั้งแต่ PROJECT_AUDIT.md มิ.ย. 5 — scope จริงใหญ่กว่าที่บันทึกไว้)
**Status**: ส่วนใหญ่ RESOLVED — เหลือ 1 ส่วนที่ตั้งใจไม่แตะ (ต้องตัดสินใจ scope auth ก่อน)

**บริบท**: user ขอให้ critique platform โดยรวม → เสนอ 3 ลำดับความสำคัญ (RLS, CI/CD, data validation) → user เลือกให้เริ่ม RLS ก่อนเพราะ effort ต่ำสุด/impact สูงสุด → เช็ค Supabase advisor จริงแล้วพบว่า scope ใหญ่กว่าที่ CLAUDE.md pending tasks บันทึกไว้มาก (ไม่ใช่แค่ 6 ตารางไม่มี RLS แต่มีอีกชุดใหญ่ที่เปิด RLS แล้วแต่ policy เขียนแบบ `USING (true)`/`WITH CHECK (true)` ซึ่งผลลัพธ์เหมือนไม่มี RLS)

**วิธี verify ก่อนแก้ (สำคัญ — ป้องกันพังโปรดักชัน)**:
1. ไล่ grep หา `supabase.from(` ทุกไฟล์ client-side (`.tsx`) → พบว่ามีแค่ `components/CRM.tsx` (table `leads`) และ `components/LandAnalyzer.tsx` (table `projects`) ที่เขียนตรงจาก browser ด้วย `NEXT_PUBLIC_SUPABASE_ANON_KEY` (`lib/supabase.ts`) — ตารางอื่นทั้งหมดไม่มี client-side code แตะเลย
2. เช็ค `server.cjs`/`SupabaseClient.ts` (Hub v1+v2) ยืนยันว่าใช้ `SUPABASE_SERVICE_KEY` (bypass RLS) ทุก query — ตารางที่ไม่มี client-side anon access จึงล็อกได้โดยไม่กระทบ Hub เลย
3. เช็ค row count + `max(created_at)` ของตารางที่ policy เป็น anon_insert (`fb_listings`, `fb_sellers`, `fb_listing_history`, `agent_reports`) → พบว่านิ่งมา 30+ วัน (ตายแล้ว/legacy) ปลอดภัยที่จะล็อก
4. เช็ค `scripts/scrape-market.js` ยืนยันว่า `market_listings` anon-insert เป็นของจริง (hardcoded anon key ในสคริปต์) — เก็บไว้แบบเดิม ไม่แตะ

**สิ่งที่แก้ (ผ่าน Supabase MCP `apply_migration`, 2 migrations)**:
1. `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` บน 6 ตารางที่ไม่มี RLS เลย (sites, line_users, qc_standards, qc_defects, qc_daily_usage, qc_inspections)
2. `DROP POLICY` ที่เขียนแบบเปิดโล่งออกจาก 7 ตาราง (area_memory, buyer_context_signals, buyer_profiles, content_frames, market_insights, content_posts, properties)
3. `DROP POLICY` anon_insert บน 4 ตารางที่ตายแล้ว (fb_listings, fb_sellers, fb_listing_history, agent_reports) + hub_state (anon_insert + anon_update)
4. `REVOKE EXECUTE ... FROM PUBLIC` (ไม่ใช่แค่ `FROM anon, authenticated`) บน `append_line_image_atomic` — เจอว่า Postgres grant EXECUTE ให้ PUBLIC เป็น default แยกจาก per-role grant ต้อง revoke จาก PUBLIC ด้วยถึงจะปิดจริง (verify ผ่าน `has_function_privilege()`)
5. Pin `search_path` บน 2 ฟังก์ชันที่ advisor เตือน (`update_updated_at_column`, `append_line_image_atomic`)
6. `ALTER VIEW qc_inspections_view SET (security_invoker = true)` — แก้ SECURITY DEFINER view ให้รันด้วยสิทธิ์ผู้เรียกแทนเจ้าของ

**Verify**: รัน `get_advisors` ซ้ำหลังแก้ — ERROR ทั้งหมดหายไป เหลือแค่ INFO "RLS enabled, no policy" (ตามที่ตั้งใจ — default deny แต่ service_role ยัง bypass ได้) และ WARN ที่เหลือ 2 รายการซึ่งเป็นของจริงที่ตั้งใจเก็บไว้ (`leads`/`projects` anon insert, `market_listings` scraper_insert) ยืนยัน `append_line_image_atomic` execute privilege: `anon=false, authenticated=false, service_role=true`

**ที่ตั้งใจไม่แตะตอนนั้น — ปิดแล้วจริง session 25 (Jul 16, 2026)**: `leads` และ `projects` เดิมเปิด anon **SELECT + INSERT** (ไม่มี UPDATE/DELETE policy เลย — RLS default-deny ป้องกัน update/delete ผ่าน anon key ไว้อยู่แล้วตั้งแต่ต้น เป็นข้อมูลที่แก้ไขจากที่เข้าใจผิดไว้ก่อนหน้าว่าเปิด CRUD เต็มที่) แต่ anon SELECT ที่เปิดโล่งหมายความว่าใครก็ตามที่มี anon key (ฝังอยู่ใน browser bundle ทุกหน้า) อ่านข้อมูล lead ทั้งหมด (ชื่อ/เบอร์โทร/งบประมาณ) ได้ตรงๆ และ anon INSERT เปิดให้ยัด lead ปลอมได้ไม่จำกัด — ตัดสินใจแก้โดยไม่ต้องสร้างระบบ auth เต็มรูป: ย้าย CRUD ทั้งหมดไปทำฝั่ง server แทน (`/api/leads/*`, `/api/projects/*` ใช้ `SUPABASE_SERVICE_KEY` เหมือน pattern ที่ `/api/market-intel/insights` ใช้อยู่แล้ว) แก้ `components/CRM.tsx`, `components/LandAnalyzer.tsx`, `components/DashboardOS.tsx`, `app/budget/page.tsx` ให้เรียก API แทนเรียก Supabase ตรง แล้ว `DROP POLICY` anon SELECT/INSERT ทั้ง 4 policy บน `leads`/`projects` → verify ผ่าน `get_advisors` แล้วว่าทั้งสองตารางกลายเป็น "RLS enabled, no policy" (default-deny) เหมือนตารางอื่นที่แก้ไปแล้ว ไม่มี WARN ใหม่เกิดขึ้น

**หมายเหตุ**: การย้าย write ไป server-side ปิดช่องโหว่ "ยิง Supabase REST ตรงด้วย anon key ที่ public" ได้เต็มที่ แต่**ไม่ใช่ auth** — หน้า `/crm` และ `/land-analyzer` เองยังไม่มี login gate ใครก็เปิดเว็บแล้วเรียก `/api/leads` ของแอปเองได้อยู่ (ผ่าน UI ปกติ) เป็นความเสี่ยงที่เหลืออยู่และเป็นที่ยอมรับได้ตามที่ user เลือก scope ไว้ (ไม่ทำ Supabase Auth เต็มรูปตอนนี้)

**Lesson**: ก่อนแก้ RLS ต้อง trace ให้ชัดว่า client-side code ตัวไหนใช้ anon key เขียนตารางไหนบ้าง ไม่ใช่ดูแค่ advisor แล้วรัวแก้ตามที่ขึ้นเตือน — ถ้าข้ามขั้นตอนนี้ไปมีสิทธิ์ทำ CRM/Land Analyzer พังทันทีเพราะระบบนี้ไม่มี auth มารองรับการจำกัดสิทธิ์แบบปกติ

**Update (ต่อในวันเดียวกัน, หลัง deploy)**: user ทดสอบจริงหลัง deploy แล้วเจอ 2 บั๊กที่ **มีอยู่ก่อนแล้ว** ไม่เกี่ยวกับการย้าย write ไป server-side (payload ที่ส่งเหมือนเดิมทุกตัวอักษร แค่เปลี่ยน transport) — บันทึกและแก้ไปพร้อมกันเพราะเจอระหว่างทดสอบ:
1. **CRM "เพิ่ม Lead"** — `leads.area` เป็นคอลัมน์ `numeric` (ตร.ม. จาก Budget Tool) แต่ `AddLeadModal` ส่งชื่อเขตเป็น text (เช่น "ปทุมธานี") เข้าคอลัมน์เดียวกัน → error `invalid input syntax for type numeric` ทุกครั้งที่กด "เพิ่ม Lead" ด้วยมือ **แก้**: เอาค่านั้นไปรวมกับ `location` แทน (คอนเซปต์เดียวกับช่อง "พื้นที่ที่สนใจ" ที่มีอยู่แล้ว) ไม่ส่ง `area` จากฟอร์มนี้อีกต่อไป — เจอบั๊กเดียวกันซ้ำใน CSV import ด้วย (`area: cols[4] || ""` เป็น text จาก CSV) แก้ให้ parse เป็นตัวเลขถ้าได้ ไม่งั้น fold เข้า notes แทน — และแก้ `PipelineTab` filter (`l.area.includes(search)`) ที่จะ crash ทั้งแท็บถ้ามี lead ที่ `area` เป็นตัวเลขหรือ null (Budget Tool leads ทุกตัว) เพราะ number ไม่มี `.includes()`
2. **Land Analyzer "บันทึก"** — `LandAnalyzer.tsx` เดิมส่ง `type`/`pin`/`form`/`result` เข้า insert แต่ตาราง `projects` จริงมีแต่คอลัมน์ normalized (`land_price`, `land_size`, `dev_cost`, `plots`, `area`, `build_cost`, `profit_per_plot`, `market_price`, `roi`, `lat`, `lng`, `notes`) ไม่มี `type`/`pin`/`form`/`result` เลย → error `PGRST204 Could not find the 'type' column` ทุกครั้งที่กด "บันทึก" **แก้**: `ALTER TABLE projects ADD COLUMN type text, ADD COLUMN result numeric` (2 คอลัมน์ที่หน้า saved-projects list ยังใช้อยู่จริง) + แก้ `save()` ให้ map ค่าเข้าคอลัมน์ normalized ที่มีอยู่แล้วให้ครบ (ก่อนหน้านี้ไม่เคยถูกใช้เลยทั้งที่มีอยู่ในตาราง) แทนที่จะยัดเป็น JSON blob แบบเดิม — `pin` (lat/lng) เก็บแยกเป็น 2 คอลัมน์ที่มีอยู่แล้วพอดี
**สรุป**: ทั้งสองจุดคือ schema/form mismatch ที่มีมาก่อนงานความปลอดภัยรอบนี้ (แค่ไม่เคยมีใครกดทดสอบฟอร์มเหล่านี้จริงจนกระทบให้เห็น) ไม่ใช่ regression จากการย้าย write ไป server-side

---

## ISSUE-014 — WF1 Publish Guard บล็อกเงียบ — slug fallback สั้นเกินไป + ไม่มี node แจ้งเตือน
**Date**: 2026-07-13 (session 24)
**Severity**: High (Blog Runner ค้าง "running" 11+ ชม. ไม่มีใครรู้จนกว่า Health Check จะเตือน)
**Status**: **RESOLVED 2026-07-13 (session 24)**

**หมายเหตุการบันทึก (session 25, Jul 16)**: บั๊กนี้ถูกแก้จริงและบันทึกไว้ใน `CLAUDE.md` Known Bugs #11 ตั้งแต่ session 24 แต่ cross-reference ชี้ไปที่ "ISSUE-012" ผิด (เลขนั้นถูกใช้ไปแล้วกับบั๊กคนละเรื่อง — "AI เขียนประเภทบ้านผิด" จาก session 23) และไม่เคยถูกเพิ่มเป็น entry จริงใน `issues-log.md` เลย เพิ่มเป็น ISSUE-014 ตอนนี้เพื่อให้เลขตรงกับที่อ้างถึง

**ปัญหา**: node "Edit Fields" มี fallback `article_slug = ... || 'post'` เวลา AI model ไม่คืนค่า slug มา แต่ node "Publish Guard + Dedupe History" เช็คว่า slug ต้องยาว ≥6 ตัวอักษร — "post" มีแค่ 4 ตัว **ไม่มีทางผ่านได้เลย** (fallback ขัดแย้งกับกฎของตัวเอง) → เดินไปทาง "Blocked Log" ซึ่งไม่มี node ไหน callback กลับ Hub เลย → `content_queue` item + `state.blog` ค้าง "running" ตลอดไป จนกว่า Health Check จะเตือนทาง Telegram (ค้างไป 11+ ชม.ก่อนพบ)

**วิธีตรวจพบ**: เช็ค execution ใน n8n เห็นว่า "Succeeded" ทุก node เขียว (ไม่มี error) — แต่ดูที่ node ไหน**เดินผ่านจริง**ไม่ใช่แค่ดูสถานะรวม พบว่าไปทาง "Blocked Log" ไม่ใช่ "Create a post"

**แก้**: (1) เปลี่ยน slug fallback เป็น chain: slug จากโมเดล → derive จาก title ถ้าสั้นเกิน → `post-<timestamp>` ถ้ายังสั้นอีก (การันตีผ่าน guard เสมอ) (2) เพิ่ม node "Notify Hub Blocked" ต่อจาก Blocked Log ให้ callback กลับ Hub ด้วย `status:"failed"` + `queue_item_id` เสมอ (3) เพิ่ม `queue_item_id` เข้า "Notify Hub Published" ด้วย (เดิมไม่มี ทำให้ item ที่ publish สำเร็จก็ค้าง "running" เหมือนกัน)

**ไฟล์**: `memory/n8n-workflows/Finnhouses WF1 — Article + Publish (9_queue_sync_fix).json`

**กฎใหม่**: (1) ห้ามตั้ง fallback value ที่สอบตกกฎ validation ที่ตามมาทันที — เช็คทุก fallback เทียบกับทุก guard/validation ที่อยู่ downstream (2) ทุก branch ที่จบ workflow แบบไม่ publish (blocked/error/skip) ต้อง callback กลับ Hub เสมอ ห้ามจบเงียบๆ — ไม่งั้น state ค้างและไม่มีใครรู้จนกว่า Health Check จะจับได้

**ดู**: `CLAUDE.md` Known Bugs #11, `docs/HANDOFF.md` session 24

---

## ISSUE-015 — Vercel "Redeploy" ปุ่มใน dashboard rebuild commit เก่า ไม่ใช่ commit ล่าสุด
**Date**: 2026-07-20 (session 26)
**Severity**: Low (แค่ทำให้ deploy ดูเหมือนไม่ update — ไม่ใช่ data loss หรือ production down)
**Status**: Resolved ✅ (เข้าใจ root cause แล้ว มี workaround ชัดเจน)

**อาการ**: push commit ใหม่ (`0dc0c42` — reorder buyer segment selector) ขึ้น `origin/main` สำเร็จ (ยืนยันด้วย `git log origin/main --oneline`) แต่หน้าเว็บ production ยังโชว์ UI แบบเก่า Archi กด "Redeploy" ใน Vercel dashboard เอง build log ก็ผ่านปกติ (`✓ Compiled successfully`) แต่ยังไม่เห็นการเปลี่ยนแปลง

**Root cause**: Vercel deployment list (เช็คผ่าน Vercel MCP `list_deployments`) แสดงว่า production ยัง pin อยู่ที่ commit `d53de6f` (commit ก่อนหน้า) ไม่มี deployment ไหนของ `0dc0c42` เลย — ปุ่ม **"Redeploy" ใน Vercel dashboard rebuild ด้วย commit เดิมของ deployment ที่กดจากเมนู `...` เสมอ ไม่ได้ pull commit ล่าสุดจาก `main`** นี่คือพฤติกรรมปกติของ Vercel (Redeploy = re-run build เดิม สำหรับ rollback/retry) ไม่ใช่ "deploy commit ใหม่ล่าสุด" อย่างที่คนทั่วไปคาดหวัง — build log ที่ Archi วางมายืนยันชัดเจน: `Cloning ... Commit: d53de6f` (commit เก่า) ทั้งที่กดปุ่มหลังจาก push `0dc0c42` ไปแล้ว

**วิธีตรวจพบ**: ใช้ Vercel MCP (`list_deployments` + `list_projects` + `list_teams`) เทียบ `githubCommitSha` ของ deployment ล่าสุดกับ `git log origin/main` — เจอว่าไม่ตรงกันทันที แทนที่จะเดาว่าเป็น browser cache หรือ GitHub webhook พัง

**Fix**: `git commit --allow-empty -m "chore: trigger redeploy"` แล้ว `git push` — บังคับให้เกิด push event ใหม่ที่ GitHub ส่ง webhook ไปหา Vercel ตามปกติ (auto-deploy flow ที่ใช้ได้กับทุก commit ก่อนหน้านี้ ทำงานถูกต้องเสมอ ไม่ใช่ webhook พัง) → deployment ใหม่ตรง commit ล่าสุดขึ้นทันที (`state: BUILDING` → `READY` ภายใน ~1 นาที)

**กฎใหม่**: ถ้า deploy ดูเหมือนไม่ update หลัง push — **อย่าใช้ปุ่ม "Redeploy" ของ deployment เก่าใน dashboard** (มันจะ rebuild commit เดิมซ้ำ) ให้ตรวจ `git log origin/main --oneline -3` เทียบกับ commit ของ deployment ล่าสุดก่อนเสมอ ถ้าไม่ตรงกันและไม่มี deployment ใหม่เกิดขึ้นเองภายในไม่กี่วินาทีหลัง push ให้ push commit เปล่า (`--allow-empty`) เพื่อ force trigger แทนการกด Redeploy

**ดู**: `docs/decisions.md` ADR-009/ADR-010 (งานที่กำลัง ship ตอนเจอปัญหานี้)

---

## ISSUE-016 — AI Content Studio (FB post) ผลิตภาษาไทยเพี้ยน/ตัดกลางคำ — 2 root cause ซ้อนกัน
**Date**: 2026-07-20 (session 27)
**Severity**: Medium (เนื้อหาที่จะโพสต์จริงเข้า Facebook อาจผิดไวยากรณ์/สื่อความหมายผิด ถ้าไม่ตรวจก่อนโพสต์ — ยังไม่ใช่ data loss หรือ production down)
**Status**: Resolved ✅

**อาการ**: Archi ส่ง FB post ที่ generate จาก AI Content Studio (KeywordTab, โทน 3T, กลุ่มลูกค้า "ที่ปรึกษา/ตรวจสอบงานก่อสร้าง") มาให้ตรวจ พบ hashtag สุดท้ายตัดกลางคำ (`#ความมั่นใ`) และคำเพี้ยนกลางประโยค (`ถามผู้รับเหมาก็ไม่วัใจ` — ที่ถูกคือ "วางใจ") พร้อม hook ที่ผสมภาษาของกลุ่มลูกค้าคนละกลุ่มปนกัน (ภาษา "ฝากขายบ้าน" ปนเข้ากับ fear ของกลุ่ม "ตรวจสอบงานก่อสร้าง")

**Root cause**: 2 อย่างซ้อนกัน ไม่ใช่จุดเดียว —
1. `callClaude()` helper ส่ง `maxTokens: 800` fixed แต่เนื้อหา FB post ที่ต้องการ (~220 คำภาษาไทย + hashtag 6-8 อัน) ใช้ output token มากกว่านั้นมาก เพราะภาษาไทย tokenize หนักกว่าอังกฤษหลายเท่า → โดนตัดกลางประโยค/hashtag เสมอเมื่อเนื้อหายาว
2. `KeywordTab.generate()` (จุด generate FB post หลักที่ใช้บ่อยที่สุด) เรียก `callClaude(system, prompt)` โดยไม่ระบุ `model` → หลุดไปใช้ default `claude-haiku-4-5-20251001` ทั้งที่ `BlogConvertTab`/`ListingTab` ใช้ `"claude-sonnet-4-6"` อยู่แล้วตามคอมเมนต์ในโค้ดเองว่า Sonnet คุณภาพภาษาไทยดีกว่า — Haiku ภายใต้ system prompt ที่ซับซ้อนหนาแน่นผลิตคำเพี้ยน/ตัดพยางค์ได้แม้ไม่ชนขีดจำกัด token เลย

**วิธีตรวจพบ**: อ่าน output ที่ Archi วางมาอย่างละเอียด แยกวิเคราะห์ตำแหน่งคำที่ผิด — ท้ายข้อความ (hashtag ตัด) ชี้ไปที่ truncation/maxTokens ส่วนคำเพี้ยนกลางประโยคชี้ไปที่ model quality (truncation ตัดได้แค่ท้ายสุดของ generation เท่านั้น ไม่ใช่กลางประโยค) — แยกแก้ทั้ง 2 สาเหตุแทนที่จะแก้จุดเดียวแล้วคิดว่าจบ

**แก้**: (1) `callClaude()` default `maxTokens` 800→2000 ให้ตรงกับ cap ของ `route.ts` (2) `KeywordTab.generate()` เปลี่ยนเป็น `callClaude(system, prompt, "claude-sonnet-4-6")` ให้ตรงกับอีก 2 tab

**กฎใหม่**: เนื้อหาภาษาไทยที่จะโพสต์จริง (user-facing) ต้องใช้ Sonnet เป็นค่าเริ่มต้นเสมอ ไม่ใช่ Haiku — Haiku เก็บไว้ใช้กับงานที่ไม่ใช่ผู้ใช้ปลายทางเห็นโดยตรง (เช่น image concept generation ภาษาอังกฤษสั้นๆ) ก่อนเพิ่ม `generate()` function ใหม่ที่เรียก `callClaude()` ต้องเช็ค default model ให้ตรงตามนี้เสมอ

**ดู**: `docs/decisions.md` ADR-012, `CLAUDE.md` Known Bugs #13
