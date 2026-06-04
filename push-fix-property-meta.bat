@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "fix: WP property meta fields use finn_ prefix + taxonomy via wp:term embed"
git push origin main
echo.
echo Done! Railway Hub จะ redeploy ใน ~2 min.
pause
