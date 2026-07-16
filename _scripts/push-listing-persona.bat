@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
git add components/AIContent.tsx
git commit -m "fix(ai-content): resale persona in ListingTab, enforce scene-first hook (no price/hype in opening line)"
git push
echo.
echo Done -- Vercel will auto-deploy in ~1-2 min
echo Test at: ap-home-platform.vercel.app/ai-content -^> Listing tab
pause
