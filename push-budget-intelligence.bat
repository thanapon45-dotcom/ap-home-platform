@echo off
echo ============================================
echo  PUSH — Budget Tool Intelligence Upgrade
echo  intent / urgency / location + smart score
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging budget page...
git add app/budget/page.tsx

echo.
echo [2/3] Committing...
git commit -m "feat(budget): add intent, urgency, location fields + smart score"

echo.
echo [3/3] Pushing to GitHub -> Vercel auto-deploy...
git push

echo.
echo ============================================
echo  Done! Vercel จะ build ใน ~2 min
echo  ตรวจสอบที่: ap-home-platform.vercel.app/budget
echo ============================================
pause
