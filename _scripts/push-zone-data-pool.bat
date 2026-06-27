@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/Marketing.tsx
git commit -m "feat: add Zone Data keyword pool #16 (Real Estate Intelligence)

- Pool #16 'Zone Data (ราคารายโซน)' — 8 keywords, purple #e879f9
- Covers 4 zones: ลำลูกกา / รังสิต-ปทุมธานี / นนทบุรี / สมุทรปราการ
- Focus: avg price per zone, best value areas, fastest appreciating land
- Part of Real Estate Intelligence Media content strategy"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
pause
