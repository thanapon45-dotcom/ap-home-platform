# Finnhouses Platform

แพลตฟอร์มบริหารธุรกิจรับสร้างบ้าน Finnhouses — รวม AI Content, Blog Automation, Lead Pipeline และ Image Generation ไว้ในที่เดียว

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15 App Router, TypeScript, Tailwind CSS |
| Database | Supabase (leads, projects) |
| AI Text | Claude Haiku (`claude-haiku-4-5-20251001`) |
| AI Image | Gemini Flash (default, ฟรี) / OpenAI DALL-E 3 (fallback) |
| Automation | n8n self-hosted |
| Notifications | Telegram Bot |
| Blog | WordPress (finnhouses.com) |

---

## Services

| Service | Port | ไฟล์ | หน้าที่ |
|---|---|---|---|
| **Next.js Dashboard** | 3000 | `npm run dev` | UI หลักทั้งหมด |
| **Backend Hub** | 4000 | `services/backend-hub/server.cjs` | Middleware — รับคำสั่งจาก Dashboard → ส่งต่อ n8n |
| **FB Backend** | 3001 | `services/fb-backend/server.js` | Publish โพสต์ไป Facebook Page |
| **n8n** | 5678 | self-hosted | Blog automation workflow |

---

## Modules

### ⚡ OS Dashboard `/dashboard`
ภาพรวมระบบ สถานะทุก engine แบบ real-time

### 🎯 CRM `/crm`
Lead Pipeline บริหาร Lead จากทุกช่องทาง
- **Stages**: New Lead → Follow Up → Qualified → Closed
- **Sources**: Budget Tool, FB Content, Blog/SEO, LINE OA, Facebook Ads, TikTok, Google Ads, Website, Referral, Walk-in
- AI วิเคราะห์ Lead + สร้างแผน Nurture Personalized

### ✨ AI Content `/ai-content`
ผลิต Content สำหรับ Facebook Page
- สร้าง Post จาก Keyword (12 preset + custom) — เลือกสไตล์บ้าน 6 แบบ
- **Tone Selector**: เป็นกันเอง / มืออาชีพ / Educate / สนุกสนาน
- สร้างภาพบ้าน AI (Gemini Flash) — architectural pencil sketch ตามสไตล์ที่เลือก
- **BRAND_FACTS lock** — ป้องกัน Claude สร้างข้อมูลผิดพลาด (ตัวเลข, จังหวัด, ราคา)
- แปลง Blog เป็น FB Post (ดึงข้อมูลผ่าน `/api/fetch-blog` — CORS bypass)
- ดู FB Engine Status + History จาก Hub
- Output tags: Post Type · Style · Tone

### 📰 Blog Runner `/marketing`
สั่ง Publish Blog ไปที่ finnhouses.com ผ่าน n8n
- เลือก Keyword (8 preset Thai) + Category
- Backend Hub รับคำสั่ง → ส่งต่อ n8n webhook
- n8n สร้างบทความ → Publish WordPress → Callback Hub
- Hub แจ้งเตือน Telegram

### 🗺️ Land Analyzer `/land-analyzer`
วิเคราะห์ที่ดิน

### 💰 Budget Tool `/budget`
คำนวณงบสร้างบ้าน → ส่ง Lead เข้า CRM + แจ้ง Telegram

---

## Environment Variables

### Next.js (`.env.local`)

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=

# AI
GEMINI_API_KEY=           # ← สำคัญที่สุด (image gen default)
ANTHROPIC_API_KEY=        # ← AI Content / CRM analysis
OPENAI_API_KEY=           # optional (fallback image)
IDEOGRAM_API_KEY=         # optional

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Backend Hub URL (localhost สำหรับ dev, public URL สำหรับ production)
NEXT_PUBLIC_HUB_URL=http://localhost:4000
```

### Backend Hub (`services/backend-hub/.env`)

```env
PORT=4000
HUB_HOST=127.0.0.1
HUB_PUBLIC_BASE_URL=http://127.0.0.1:4000
DASHBOARD_ORIGIN=http://localhost:3000
N8N_BLOG_WEBHOOK_URL=http://127.0.0.1:5678/webhook/blog-run
FB_BACKEND_URL=http://127.0.0.1:3001
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=
```

---

## การรัน Local

```bash
# 1. Next.js Dashboard
npm run dev                    # http://localhost:3000

# 2. Backend Hub
cd services/backend-hub
node server.cjs                # http://localhost:4000

# 3. FB Backend
cd services/fb-backend
node server.js                 # http://localhost:3001

# 4. n8n (แยก terminal)
n8n start                      # http://localhost:5678
```

---

## API Endpoints (Backend Hub)

| Method | Endpoint | หน้าที่ |
|---|---|---|
| GET | `/api/state` | ดึงสถานะ Blog + FB engine |
| GET | `/health` | Health check |
| POST | `/action/blog/run` | สั่ง run blog workflow |
| POST | `/action/blog/reset` | Reset blog state |
| POST | `/action/fb/publish` | Publish FB post |
| POST | `/webhook/n8n` | รับ callback จาก n8n (blog result) |
| POST | `/webhook/fb` | รับ callback จาก FB backend |

---

## n8n Workflow

- ชื่อ workflow: **"Finnhouses FULL PRO MASTER FLOW V3.2 + Sketch Vision QA + Binary Guard"**
- Trigger: **Webhook** ที่ path `blog-run`
- Hub callback URL: `http://127.0.0.1:4000/webhook/n8n`
- Workflow ต้อง Publish ก่อนใช้งาน

---

## Deploy to Vercel

1. Deploy Backend Hub ที่ Railway / Render / VPS
2. ตั้ง `NEXT_PUBLIC_HUB_URL` ใน Vercel → Public URL ของ Hub
3. ตั้ง n8n webhook URL ใน Hub .env → Public URL ของ n8n
4. ตั้ง Environment Variables ทั้งหมดใน Vercel Dashboard

---

## Project Structure

```
ap-home-platform/
├── app/
│   ├── ai-content/page.tsx      # AI Content module
│   ├── crm/page.tsx             # CRM Lead Pipeline
│   ├── marketing/page.tsx       # Blog Runner
│   ├── dashboard/page.tsx       # OS Dashboard
│   ├── budget/page.tsx          # Budget Tool
│   ├── land-analyzer/page.tsx   # Land Analyzer
│   └── api/
│       ├── chat/route.ts        # Claude Haiku — AI Content + CRM analysis
│       ├── image/route.ts       # Gemini Flash / DALL-E / Ideogram image gen
│       └── fetch-blog/route.ts  # Server-side URL fetch (CORS bypass for Blog tab)
├── components/
│   ├── Sidebar.tsx
│   ├── DashboardOS.tsx
│   ├── CRM.tsx                  # Lead Pipeline
│   ├── AIContent.tsx            # FB Content Engine
│   └── Marketing.tsx            # Blog Runner UI
└── services/
    ├── backend-hub/
    │   ├── server.cjs           # Hub Express server
    │   └── hub-state.json       # State file (auto-created)
    └── fb-backend/
        └── server.js            # FB publish server
```
