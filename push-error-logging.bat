@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "feat: add Telegram error alerts for FB publish, FB queue, Blog queue failures"
git push
echo Done!
pause
