@echo off
echo ============================================
echo  PUSH — Property Review UI + Dashboard Tab
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging files...
git add components/DashboardOS.tsx
git add components/PropertyReview.tsx
git add app/properties/page.tsx
git add app/api/property/publish/route.ts
git add app/api/property/pending/route.ts

echo.
echo [2/3] Committing...
git commit -m "feat: Property Review tab in Dashboard + WP publish pipeline"

echo.
echo [3/3] Pushing...
git push

echo.
echo ============================================
echo  Done! Vercel จะ deploy ใน ~1-2 min
echo  URL: https://ap-home-platform.vercel.app/dashboard
echo  -> คลิก tab "ทรัพย์รอ Review"
echo ============================================
pause
