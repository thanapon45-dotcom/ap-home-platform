@echo off
echo ============================================
echo  PUSH — Hub: Property Publish to WordPress
echo  + /action/property/publish
echo  + /api/properties/pending
echo  + WP_URL / WP_USER / WP_APP_PASS env vars
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /action/property/publish and /api/properties/pending"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1-2 min
echo.
echo  *** ขั้นต่อไป ***
echo  1. เพิ่ม Vercel proxy routes:
echo     app/api/property/publish/route.ts
echo     app/api/property/pending/route.ts
echo  2. สร้างหน้า Dashboard /properties (review UI)
echo ============================================
pause
