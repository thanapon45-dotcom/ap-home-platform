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
