@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"

echo === Committing QC LINE System ===
git add services/backend-hub/server.cjs
git commit -m "feat: QC LINE System routes in Hub

- POST /api/qc/ingest    — รับรูปจาก n8n, call GPT-4o Vision, save result
- GET  /api/qc/list      — list inspections (for Dashboard)
- POST /api/qc/log-latency — update total latency from n8n
- GET  /api/qc/health    — health check
- Budget guard: QC_DAILY_BUDGET_THB (default 300 THB/day)
- Auto Telegram notify on pass/fail"

echo === Pushing to Railway ===
git push origin main

echo.
echo ============================================================
echo Push done! Railway auto-deploy ~1-2 min
echo.
echo ก่อน test ต้องเช็ค Railway env vars:
echo   OPENAI_API_KEY       — ต้องมี (สำหรับ Vision)
echo   OPENAI_MODEL         — optional (default: gpt-4o)
echo   QC_DAILY_BUDGET_THB  — optional (default: 300 THB)
echo.
echo Test health check:
echo   curl https://<hub-url>/api/qc/health
echo.
echo Test ingest (bypass LINE):
echo   curl -X POST https://<hub-url>/api/qc/ingest ^
echo     -H "Content-Type: application/json" ^
echo     -H "x-hub-token: <HUB_SECRET>" ^
echo     -d "{\"line_message_id\":\"test-001\",\"line_user_id\":\"Utest\",\"photo_url\":\"https://via.placeholder.com/400\",\"caption\":\"BKK-045 ห้องน้ำชั้น2\"}"
echo ============================================================
echo.
pause
