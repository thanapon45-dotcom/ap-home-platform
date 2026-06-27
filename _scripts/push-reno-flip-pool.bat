@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/Marketing.tsx
git commit -m "feat: add Renovation Flip keyword pool #15 (Lam Luk Ka)

- Pool #15 'Renovation Flip (ลำลูกกา)' — 8 keywords, orange #f97316
- Covers: renovation costs 2026, house assessment, avg selling price
  by zone (Lam Luk Ka / Rangsit / Khlong 10), fastest-selling reno types
- Location-specific: ลำลูกกา, ปทุมธานี, กรุงเทพรอบนอก"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
pause
