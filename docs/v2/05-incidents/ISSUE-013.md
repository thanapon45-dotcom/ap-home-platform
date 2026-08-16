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
