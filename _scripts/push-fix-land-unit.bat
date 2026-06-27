@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/PropertyReview.tsx
git commit -m "fix: label ที่ดิน ตร.ม. -> ตร.ว. ใน PropertyReview"
git push
echo.
echo Done! Vercel deploying...
pause
