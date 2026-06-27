@echo off
echo ============================================
echo  PUSH — Hub: Property Saved Webhook
echo  + supabaseUpsert helper
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /webhook/property-saved + supabaseUpsert helper"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1-2 min
echo.
echo  *** อย่าลืม upload functions.php ขึ้น cPanel ***
echo  ไฟล์: finnhouses-theme/functions.php
echo  cPanel path: public_html/wp-content/themes/finnhouses-theme/
echo ============================================
pause
