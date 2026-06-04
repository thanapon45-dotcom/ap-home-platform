@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/MarketIntel.tsx
git add components/Sidebar.tsx
git add app/market-intel/page.tsx
git add app/api/market-intel/submit/route.ts
git add app/api/market-intel/insights/route.ts
git commit -m "feat: Market Intelligence page (/market-intel)

- components/MarketIntel.tsx: 3-tab page (submit form, insights table, content)
- app/market-intel/page.tsx: new route
- app/api/market-intel/submit/route.ts: proxy to n8n webhook
- app/api/market-intel/insights/route.ts: query Supabase market_insights + content_frames
- components/Sidebar.tsx: add Market Intel nav item"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
echo URL: ap-home-platform.vercel.app/market-intel
pause
