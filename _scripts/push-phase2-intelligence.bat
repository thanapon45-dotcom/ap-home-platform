@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/AIContent.tsx

echo === Committing ===
git commit -m "feat: Phase 2 buyer intelligence — decision maker, conversion triggers, ghost signal, content insights"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel ~1 min
pause
