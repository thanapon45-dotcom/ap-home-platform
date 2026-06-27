@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "fix(qc): update AI prompt to focus on workmanship quality not worker safety"
git push
echo.
echo Done — Railway will auto-deploy in ~1 min
pause
