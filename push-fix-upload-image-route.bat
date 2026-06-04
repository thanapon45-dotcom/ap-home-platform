@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add app/api/property/upload-image/
git add components/AIContent.tsx
git add services/backend-hub/server.cjs
git commit -m "fix: add missing upload-image Vercel route + property meta finn_ prefix + Listing CTA URL"
git push origin main
echo.
echo Done! Vercel auto-deploy ~1 min
echo - /api/property/upload-image ใช้งานได้แล้ว
echo - Listing tab CTA ใช้ property URL จริง
echo - Hub meta fields ใช้ finn_ prefix ถูกต้อง
pause
