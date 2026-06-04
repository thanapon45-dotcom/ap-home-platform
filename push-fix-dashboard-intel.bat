@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/DashboardOS.tsx app/api/market-intel/route.ts
git commit -m "fix: dashboard market intel use vercel proxy + forward timing_signal"
git push
echo Done!
pause
