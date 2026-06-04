@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "feat: add withRetry helper + retry on FB publish and FB queue run-next (2x, 4s delay)"
git push
echo Done!
pause
