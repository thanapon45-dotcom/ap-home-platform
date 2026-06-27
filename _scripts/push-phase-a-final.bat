@echo off
echo === Push Phase A Security (Final) ===
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

git add ^
  app/api/blog/queue/clear/route.ts ^
  app/api/blog/queue/run-next/route.ts ^
  app/api/blog/reset/route.ts ^
  app/api/blog/run/route.ts ^
  app/api/blog/state/route.ts ^
  app/api/fb/queue/clear/route.ts ^
  app/api/fb/queue/run-next/route.ts ^
  app/api/market-intel/route.ts ^
  app/api/property/dismiss/route.ts ^
  app/api/property/list/route.ts ^
  app/api/property/pending/route.ts ^
  app/api/property/publish/route.ts ^
  app/api/property/upload-image/route.ts ^
  components/MarketIntel.tsx ^
  next.config.ts ^
  services/backend-hub/server.js

git commit -m "security(phase-a): x-hub-token on all proxy routes + next.config origins + delete server.js"
git push
echo Done! Vercel deploying Phase A Security...
pause
