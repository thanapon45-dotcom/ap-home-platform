@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/AIContent.tsx services/backend-hub/server.cjs
git commit -m "fix: ListingTab CTA ใช้ property URL จริง + meta finn_ prefix"
git push origin main
echo.
echo Done! Vercel auto-deploy ~1 min, Railway Hub ~2 min.
pause
