# Tokens & Credentials Expiry

> อัปเดตทุกครั้งที่ต่ออายุ token ใด ๆ

---

## FB_PAGE_ACCESS_TOKEN

| Field | Value |
|---|---|
| **Expiry** | **~Aug 2, 2026 — confirmed (session 25, Jul 16)** |
| **Where** | Railway env var: `FB_PAGE_ACCESS_TOKEN` (service: **fb-backend / Railway alias "easygoing-friendship"** — ⚠️ ไม่ใช่ Hub v2 ตามที่เคยเขียนผิดไว้ ดู `CLAUDE.md` § FB Backend Service) |
| **Renew via** | Graph API Explorer → Page Token → exchange for Long-lived |
| **After renew** | Update Railway **fb-backend (easygoing-friendship)** env var → verify FB routes |
| **Note** | Jun 26 vs Aug 2 conflict resolved: user โพสต์ผ่าน ListingTab สำเร็จจริงวันที่ 16 Jul 2026 — ถ้า token หมดตั้งแต่ 26 Jun จะโพสต์ไม่ผ่าน ยืนยันว่า **Aug 2, 2026 ถูกต้อง** ตั้ง reminder renew ล่วงหน้า ~25 Jul 2026 |

## LINE_CHANNEL_ACCESS_TOKEN

| Field | Value |
|---|---|
| **Expiry** | On 401 error |
| **Where** | n8n workflow node (hardcoded ใน QC LINE workflow) |
| **Renew via** | LINE Developers Console → Messaging API → Issue new token |

## HUB_SECRET

| Field | Value |
|---|---|
| **Current** | `b3672e1c252790351ace2334d6fb149b9da36a3b616c3c017a21cff933e55d4c` |
| **Rotate when** | Suspected breach |
| **Update all 3** | Railway Hub v2 + Vercel Dashboard + n8n workflows พร้อมกัน |

## SUPABASE_SERVICE_KEY

| Field | Value |
|---|---|
| **Expiry** | Annually / on breach |
| **Where** | Railway Hub v2 env var |
| **Renew via** | Supabase Dashboard → Project Settings → API → Regenerate |

## OPENAI_API_KEY

| Field | Value |
|---|---|
| **Expiry** | Annually / on breach |
| **Where** | Railway Hub v2 env var |
| **Renew via** | platform.openai.com → API Keys |

## TELEGRAM_BOT_TOKEN

| Field | Value |
|---|---|
| **Expiry** | On suspected breach |
| **Where** | n8n Credentials (`Telegram account`) |
| **Renew via** | @BotFather → /revoke |

---

*Last updated: 2026-06-30*
