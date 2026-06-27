@echo off
echo ============================================
echo  PUSH — Hub: LINE Seller Property Intake
echo  + /webhook/property-line-intake
echo ============================================
cd /d "%~dp0"

echo.
echo [1/3] Staging server.cjs...
git add services/backend-hub/server.cjs

echo.
echo [2/3] Committing...
git commit -m "feat(hub): add /webhook/property-line-intake for LINE seller submissions"

echo.
echo [3/3] Pushing to GitHub -> Railway auto-deploy...
git push

echo.
echo ============================================
echo  Done! Railway Hub จะ redeploy ใน ~1-2 min
echo.
echo  *** ขั้นต่อไป ***
echo  1. รัน SQL ใน Supabase: ALTER TABLE properties ADD COLUMN source/notes/line_user_id
echo  2. Import n8n workflow: memory/n8n-workflows/Finnhouses_LINE_Seller_Intake.json
echo  3. Set LINE_CHANNEL_ACCESS_TOKEN ใน Railway n8n env vars
echo  4. Set LINE OA Webhook URL = https://primary-production-8158a.up.railway.app/webhook/line-seller-intake
echo ============================================
pause
