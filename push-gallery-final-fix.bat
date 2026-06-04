@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "fix: cover media_id validation + explicit slot[0] for featured_media + debug badge"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel deploy ~1-2 min
echo.
echo ========================================
echo สิ่งที่ต้องทำหลัง deploy:
echo.
echo 1. WP Admin - ลบ post #710 ออก (trash it)
echo    https://finnhouses.com/wp-admin/edit.php?post_type=property
echo.
echo 2. เปิด Dashboard - tab ทรัพย์รอ Review
echo    https://ap-home-platform.vercel.app/dashboard
echo.
echo 3. Upload รูป 4 รูป ใหม่ทั้งหมด
echo    - ดูว่าแต่ละ slot แสดง #ID (เขียว) = OK
echo    - ถ้า badge แดง (warning) = upload ไม่ผ่าน
echo.
echo 4. Approve
echo ========================================
echo.
pause
