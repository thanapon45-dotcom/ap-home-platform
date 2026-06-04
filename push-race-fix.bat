@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add services/backend-hub/server.cjs
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "fix: atomic append-line-image (mutex) + gallery_ids exclude cover slot"

echo === Pushing ===
git push origin main

echo.
echo Done! Railway Hub auto-redeploy ~1-2 min, Vercel ~1 min
echo.
echo *** จากนั้น: ลูกค้าส่งรูปใหม่อีกครั้งผ่าน LINE → ครั้งนี้จะได้ครบ 4 รูป ***
pause
