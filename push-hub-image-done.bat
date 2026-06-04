@echo off
echo ============================================
echo  PUSH — Hub: /webhook/image-done endpoint
echo  WF2 Image Patch callback + Telegram notify
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /webhook/image-done for WF2 image patch callback"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1 min
echo  ตรวจสอบที่: ap-home-platform-production.up.railway.app
echo ============================================
pause
