@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/DashboardOS.tsx app/budget/page.tsx
git commit -m "fix: BizCard counts (|| not ??) + budget intent maps to correct business_unit (reno/list/build)"
git push
echo Done! Vercel deploying...
pause
