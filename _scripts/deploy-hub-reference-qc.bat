@echo off
echo Step 1: Upload reference photos to Supabase (PowerShell)...
powershell -ExecutionPolicy Bypass -File "%~dp0upload-qc-standards.ps1"
echo.
echo Step 2: Deploy Hub to Railway...
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "feat(qc): reference-photo comparison mode — match work photo vs standard"
git push
echo.
echo Done — Railway auto-deploy ~1 min
echo Then send LINE photo with caption e.g. "งานฉาบ" to test reference matching
pause
