@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "fix: gallery_ids exclude slot 0 (cover) to prevent duplicate image on property page"

echo === Pushing ===
git push origin main

echo.
echo Done! Vercel deploy ~1 min
echo.
echo *** อย่าลืม upload single-property.php ขึ้น cPanel ด้วย ***
echo     Local:  D:\ARCHI\01_PROJECTS\CORE\threme web\finnhouses-theme\finnhouses-theme\single-property.php
echo     cPanel: public_html/wp-content/themes/finnhouses-theme/single-property.php
pause
