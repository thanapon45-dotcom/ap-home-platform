@echo off
echo ============================================================
echo  Phase A Security — AP-Home Platform OS
echo  Jun 5, 2026
echo ============================================================
echo.
echo Changes in this push:
echo  - next.config.ts: allowedOrigins restricted to production domains
echo  - All Vercel-Hub proxy routes: X-Hub-Token header added (13 routes)
echo  - market-intel route: N8N_MARKET_INTEL_WEBHOOK env var (not hardcoded)
echo  - MarketIntel.tsx: /api/market-intel/submit -> /api/market-intel
echo  - Supabase RLS: all 13 tables now have RLS enabled (done via MCP)
echo.
echo BEFORE pushing — confirm these env vars are set:
echo  [Railway Hub]    HUB_SECRET=^<generate: openssl rand -hex 32^>
echo  [Vercel]         HUB_SECRET=^<same value^>
echo  [Vercel]         N8N_MARKET_INTEL_WEBHOOK=https://primary-production-8158a.up.railway.app/webhook/market-intel/manual
echo.
echo If HUB_SECRET is not set in Railway, Hub returns 500 on all requests.
echo.
pause

cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add -A
git commit -m "security: Phase A — X-Hub-Token, allowedOrigins, market-intel env var, consolidate submit route"
git push origin main
echo.
echo Done. Vercel will auto-deploy.
echo Remember to also deploy Hub if not auto-deployed via Railway GitHub integration.
echo.
pause
