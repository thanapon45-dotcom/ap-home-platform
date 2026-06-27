@echo off
echo === Push S-10 Fix: FB Backend Auth ===
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/fb-backend/server.js services/backend-hub/server.cjs
git commit -m "fix(security): S-10 add x-hub-token auth to FB Backend"
git push
echo Done! Railway deploying both Hub and FB Backend...
pause
