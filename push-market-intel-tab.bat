@echo off
cd /d "%~dp0"
git add components/AIContent.tsx app/api/market-intel/route.ts
git commit -m "feat: Market Intel tab + /api/market-intel proxy route"
git push
echo Done!
pause
