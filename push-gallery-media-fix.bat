@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "fix: filter gallery slots media_id=0 before publish — 3-image bug"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel deploy ~1-2 min
echo.
echo *** หลัง deploy แล้ว: ***
echo 1. ลบ property "บ้านรีโนเวทแล้ว" ออกจาก WP + Supabase (ถ้ายังมี)
echo 2. ส่งรูปใหม่ 4 รูปผ่าน LINE → n8n
echo 3. Dashboard PropertyReview → Approve
echo 4. ตรวจ finnhouses.com → ควรได้ 4-image magazine layout
echo.
pause
