@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx
git add services/backend-hub/server.cjs
git add app/api/fb/publish/route.ts
git add components/AIContent.tsx

echo === Committing ===
git commit -m "feat: 4-slot image upload, LINE photo auto-fill, append-line-image Hub endpoint, FB timeout fix"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel ~1 min, Railway Hub auto-redeploy
pause
