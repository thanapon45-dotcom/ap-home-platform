@echo off
echo ============================================
echo  PUSH — Hub: Land Analyzer / Reno Estimator
echo  + POST /action/land-lead
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /action/land-lead for Land Analyzer + Reno Estimator lead capture"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1-2 min
echo.
echo  *** ขั้นต่อไป ***
echo  1. Upload page-land-analyzer.php ขึ้น WordPress via cPanel
echo     path: wp-content/themes/finnhouses-theme/page-land-analyzer.php
echo  2. WordPress Admin -^> Pages -^> Add New
echo     - Title: วิเคราะห์ที่ดิน / Reno ROI
echo     - Slug: land-analyzer
echo     - Template: Land Analyzer
echo     - Publish
echo  3. URL จะเป็น: finnhouses.com/land-analyzer
echo ============================================
pause
