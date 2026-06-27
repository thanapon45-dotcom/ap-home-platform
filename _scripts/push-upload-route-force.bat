@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks if exist ===
if exist ".git\index.lock" (
    del /f ".git\index.lock"
    echo index.lock removed.
)
if exist ".git\HEAD.lock" (
    del /f ".git\HEAD.lock"
    echo HEAD.lock removed.
)
if exist ".git\refs\heads\main.lock" (
    del /f ".git\refs\heads\main.lock"
    echo main.lock removed.
)
echo Done clearing locks.

echo.
echo === Current git status ===
git status app/api/property/upload-image/

echo.
echo === Adding files ===
git add app/api/property/upload-image/route.ts
git add components/AIContent.tsx
git add services/backend-hub/server.cjs

echo.
echo === Git status after add ===
git status --short

echo.
echo === Committing ===
git commit -m "fix: upload-image route + finn_ meta + Listing CTA"

echo.
echo === Pushing ===
git push origin main

echo.
echo === Done! ===
echo Vercel deploy ~1 min. Then test:
echo   ap-home-platform.vercel.app/api/property/upload-image
echo   (POST request should return JSON, not HTML)
pause
