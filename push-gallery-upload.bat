@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx
git add components/AIContent.tsx

echo === Committing ===
git commit -m "feat: gallery_ids sent on publish + ListingTab layout fix"

echo === Pushing ===
git push origin main

echo.
echo === Done! ===
echo Vercel ~1 min
echo.
echo *** NEXT STEP ***
echo อัพโหลด functions.php ขึ้น cPanel ด้วย:
echo D:\ARCHI\01_PROJECTS\CORE\threme web\finnhouses-theme\finnhouses-theme\functions.php
echo → cPanel → File Manager → public_html/wp-content/themes/finnhouses-theme/functions.php
pause
