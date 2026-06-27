@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "feat: 4-slot image upload in PropertyReview — cover + gallery"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel ~1 min
pause
