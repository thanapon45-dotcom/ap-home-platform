@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add services/backend-hub/server.cjs
git add app/api/property/dismiss/route.ts
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "fix: Dismiss button updates Supabase status=dismissed (persists across refresh)"

echo === Pushing ===
git push origin main

echo.
echo Done! Railway Hub ~1-2 min, Vercel ~1 min
echo.
echo *** Dismiss แล้วจะไม่กลับมาอีกแม้กด tab ใหม่ ***
pause
