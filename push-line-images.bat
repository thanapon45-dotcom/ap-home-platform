@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"
if exist ".git\refs\heads\main.lock" del /f ".git\refs\heads\main.lock"

echo === Adding ===
git add services/backend-hub/server.cjs
git add components/PropertyReview.tsx

echo === Committing ===
git commit -m "feat: LINE image auto-save — append-line-image endpoint + auto-load slots in PropertyReview"

echo === Pushing ===
git push origin main

echo.
echo === Done! ===
echo Vercel ~1 min, Railway Hub ~2 min
echo.
echo *** NEXT STEPS ***
echo 1. Supabase SQL: ALTER TABLE properties ADD COLUMN IF NOT EXISTS line_images jsonb DEFAULT '[]';
echo 2. Import n8n workflow: memory\n8n-workflows\Finnhouses_LINE_Seller_Intake_v3.json
echo 3. ใน n8n workflow ใหม่: ตรวจสอบ Credentials ของ LINE Channel Token (ตรงกับของเดิม)
echo 4. Deactivate workflow เดิม (v2), Activate v3
pause
