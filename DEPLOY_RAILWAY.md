# 🚀 Finnhouses Platform — Railway Deployment Guide

## Architecture Overview

```
Vercel (Next.js Dashboard)
        │  NEXT_PUBLIC_HUB_URL
        ▼
Railway: backend-hub  ──► Railway: n8n ──► WordPress
        │                       ▲
        │  FB_BACKEND_URL        │ (n8n calls Hub /webhook/n8n)
        ▼
Railway: fb-backend ──► Facebook Graph API
```

---

## Step 0 — Initialize Git (one-time)

Open PowerShell in `C:\PROJECTS\CORE\ap-home-platform` and run:

```powershell
git init
git add .
git commit -m "Initial commit"
```

Then create a GitHub repo (private) and push:

```powershell
git remote add origin https://github.com/YOUR_USERNAME/ap-home-platform.git
git branch -M main
git push -u origin main
```

---

## Step 1 — Deploy `backend-hub` on Railway

1. Go to [railway.app](https://railway.app) → **New Project** → **Deploy from GitHub repo**
2. Select your repo
3. Click **Add service** → choose the repo again (for the second service later)
4. On the service settings:
   - **Root Directory**: `services/backend-hub`
   - **Start Command**: `node server.cjs` (or leave blank — nixpacks.toml handles it)
5. Add **Environment Variables** (Settings → Variables):

| Variable | Value |
|---|---|
| `N8N_BLOG_WEBHOOK_URL` | `https://YOUR-N8N.up.railway.app/webhook/blog-run` |
| `FB_BACKEND_URL` | `https://YOUR-FB-BACKEND.up.railway.app` |
| `DASHBOARD_ORIGIN` | `https://YOUR-APP.vercel.app` |
| `TELEGRAM_BOT_TOKEN` | your token (optional) |
| `TELEGRAM_CHAT_ID` | your chat id (optional) |

> **Note**: `PORT` is injected automatically by Railway — do NOT set it manually.

6. Click **Deploy** → wait for green status
7. Copy the service URL (e.g. `https://backend-hub-production-xxxx.up.railway.app`) — you'll need it later

---

## Step 2 — Deploy `fb-backend` on Railway

1. In the same Railway project → **+ New Service** → **GitHub Repo**
2. Select repo again
3. Service settings:
   - **Root Directory**: `services/fb-backend`
   - **Start Command**: `node server.js`
4. Add **Environment Variables**:

| Variable | Value |
|---|---|
| `FB_PAGE_ACCESS_TOKEN` | your long-lived token |
| `FB_PAGE_ID` | `107645087471724` |
| `FB_API_VERSION` | `v21.0` |
| `HUB_FB_WEBHOOK_URL` | `https://YOUR-HUB.up.railway.app/webhook/fb` |

5. Deploy → verify `/health` returns `"fb_configured": true`

---

## Step 3 — Deploy n8n on Railway

1. In the same Railway project → **+ New Service** → **Template**
2. Search: **n8n** → select official template
3. Railway will add n8n + PostgreSQL automatically
4. Add extra **Environment Variables** to the n8n service:

| Variable | Value |
|---|---|
| `N8N_HOST` | `0.0.0.0` |
| `WEBHOOK_URL` | `https://YOUR-N8N.up.railway.app/` |
| `N8N_PROTOCOL` | `https` |
| `N8N_ENCRYPTION_KEY` | generate: `openssl rand -hex 32` |
| `N8N_BASIC_AUTH_ACTIVE` | `true` |
| `N8N_BASIC_AUTH_USER` | `admin` |
| `N8N_BASIC_AUTH_PASSWORD` | choose a strong password |

5. Deploy → open the n8n URL, log in with the credentials above
6. **Import your workflow**: n8n → Settings → Import from File → import your exported workflow JSON

---

## Step 4 — Wire Up URLs

After all 3 services are running, go back and **update env vars** with the real Railway URLs:

**backend-hub** — update:
- `N8N_BLOG_WEBHOOK_URL` = `https://YOUR-REAL-N8N.up.railway.app/webhook/blog-run`
- `FB_BACKEND_URL` = `https://YOUR-REAL-FB-BACKEND.up.railway.app`

**fb-backend** — update:
- `HUB_FB_WEBHOOK_URL` = `https://YOUR-REAL-HUB.up.railway.app/webhook/fb`

Railway will auto-redeploy each service when you save new vars.

---

## Step 5 — Deploy Next.js Dashboard to Vercel

1. Go to [vercel.com](https://vercel.com) → **New Project** → import the same GitHub repo
2. Framework: **Next.js** (auto-detected)
3. Root directory: `.` (the repo root)
4. Add **Environment Variables** in Vercel:

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_HUB_URL` | `https://YOUR-REAL-HUB.up.railway.app` |
| `NEXT_PUBLIC_SUPABASE_URL` | your supabase url |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | your supabase anon key |
| `OPENAI_API_KEY` | your key |
| `ANTHROPIC_API_KEY` | your key |

5. Deploy → your dashboard is live at `https://YOUR-APP.vercel.app`
6. Go back to Railway backend-hub → update `DASHBOARD_ORIGIN` = `https://YOUR-APP.vercel.app`

---

## Step 6 — Smoke Test

Run these checks after deployment:

```
# 1. Hub health
curl https://YOUR-HUB.up.railway.app/health

# 2. FB Backend health  
curl https://YOUR-FB-BACKEND.up.railway.app/health

# 3. Hub state
curl https://YOUR-HUB.up.railway.app/api/state

# 4. n8n — open in browser
https://YOUR-N8N.up.railway.app/
```

Expected:
- Hub `/health` → `{ "ok": true, "status": "idle" }`
- FB Backend `/health` → `{ "ok": true, "fb_configured": true }`
- n8n login page loads

---

## Notes

### State Persistence
`hub-state.json` resets on each Railway redeploy (Railway filesystem is ephemeral across deploys, persistent across restarts). This is fine for the dashboard — state is transient anyway.

### n8n Workflow Export
Before deploying, export your local n8n workflows:
- Local n8n → Settings → Import/Export → Export all workflows
- Save the JSON file
- After deploying to Railway, import the same JSON

### Token Expiry
Facebook long-lived tokens expire in ~60 days. Set a calendar reminder to refresh:
```
https://graph.facebook.com/v21.0/oauth/access_token
  ?grant_type=fb_exchange_token
  &client_id=YOUR_APP_ID
  &client_secret=YOUR_APP_SECRET
  &fb_exchange_token=CURRENT_TOKEN
```

---

## Cost Estimate (Railway)

| Service | Plan | Monthly |
|---|---|---|
| backend-hub | Hobby ($5/mo) | ~$1–3 |
| fb-backend | Hobby ($5/mo) | ~$1–2 |
| n8n | Hobby ($5/mo) | ~$2–4 |
| PostgreSQL (n8n) | Included | $0 |
| **Total** | | **~$5–10/mo** |

Vercel (Next.js) is free on the Hobby plan.
