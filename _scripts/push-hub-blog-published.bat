@echo off
echo ============================================
echo  PUSH — Hub: Blog Published Webhook
echo  + Supabase content_posts sync
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /webhook/blog-published + supabaseInsert/Update helpers"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1-2 min
echo  ตรวจสอบที่: Railway Dashboard -> Hub service
echo.
echo  *** อย่าลืมเพิ่ม Railway env vars: ***
echo  SUPABASE_URL=https://omvpagvqyfmkkhzuuzda.supabase.co
echo  SUPABASE_ANON_KEY=<anon public key จาก Supabase Settings>
echo ============================================
pause
