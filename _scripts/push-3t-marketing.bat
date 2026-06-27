@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/AIContent.tsx
git commit -m "feat: add 3T marketing framework to FB Content Engine

- BRAND_FACTS: add 3T philosophy (Transfer/Trust/Take Care)
- KEYWORDS: add 3T-focused topics (12 new keywords across all 3T angles)
- TONES: add 3T Story tone with dedicated instruction
- generate(): is3T flag rewires system prompt + prompt structure for 3T storytelling
- Non-3T flows unchanged"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
pause
