@echo off
echo === Push fix: Property Review fetch failed (SUPABASE_ANON_KEY → SUPABASE_REST_KEY) ===
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add services/backend-hub/server.cjs
git commit -m "fix: replace undefined SUPABASE_ANON_KEY with SUPABASE_REST_KEY in property routes"
git push
echo Done! Railway deploying Hub...
pause
