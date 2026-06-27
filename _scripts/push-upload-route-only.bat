@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
echo === Current git status ===
git status app/api/property/upload-image/
echo.
echo === Adding file ===
git add app/api/property/upload-image/route.ts
git add components/AIContent.tsx
git add services/backend-hub/server.cjs
echo.
echo === Committing ===
git commit -m "fix: upload-image route + meta finn_ + Listing CTA"
echo.
echo === Pushing ===
git push origin main
echo.
echo === Done! ===
echo Vercel deploy ~1 min. Then test: ap-home-platform.vercel.app/api/property/upload-image
pause
