@echo off
echo ============================================
echo  PUSH — CRM Intelligence Upgrade
echo  intent / urgency / outcome / location fields
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging CRM.tsx...
git add components/CRM.tsx

echo.
echo [2/3] Committing...
git commit -m "feat(crm): add intent, urgency, outcome, location + Supabase sync"

echo.
echo [3/3] Pushing to GitHub -> Vercel auto-deploy...
git push

echo.
echo ============================================
echo  Done! Vercel จะ build ใน ~2 min
echo  ตรวจสอบที่: ap-home-platform.vercel.app/crm
echo ============================================
pause
