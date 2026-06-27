@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/Marketing.tsx
git commit -m "fix: Blog Runner category IDs — Land=33, Reno=34, Zone=35, Seller=36 (match actual WP category IDs)"
git push
echo Done! Vercel deploying...
pause
