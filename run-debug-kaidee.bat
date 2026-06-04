@echo off
echo ==============================================
echo  Debug Kaidee — ดู HTML structure ของ ad-card
echo ==============================================
cd /d "%~dp0"
node scripts/debug-kaidee.js
echo.
echo ไฟล์ผลลัพธ์: scripts\debug-kaidee-output.txt
echo ==============================================
pause
