@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/Marketing.tsx
git commit -m "feat: SEO keyword optimization + internal link context

- KEYWORD_POOLS: update all 32 keywords to high-intent, location-specific
  (กรุงเทพ/ปริมณฑล/ปทุมธานี/นนทบุรี), year 2026 targeting
- handleRun(): add site_url + internal_links payload to blog/run API call
- generateQueueItems(): add INTERNAL_LINKS constant + site_url/internal_links
  to each queue item
- Internal link targets: /contact, /service, /blog, /about"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
pause
