@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add services/backend-hub/server.cjs

echo === Committing ===
git commit -m "fix: append-line-image uses Supabase RPC atomic function (DB-level concurrency)"

echo === Pushing ===
git push origin main

echo.
echo Done! Railway Hub redeploy ~1-2 min
echo.
echo *** ก่อนทดสอบ: รัน SQL ใน Supabase SQL Editor ก่อน ***
echo     ดู create_append_rpc.sql ที่อยู่ใน memory/
pause
