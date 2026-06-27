@echo off
echo ==============================================
echo  Finnhouses Market Scraper
echo  DDproperty: ลำลูกกา / รังสิต / คลองหลวง / ลาดหลุมแก้ว
echo ==============================================
cd /d "%~dp0"

echo.
echo [1/3] ติดตั้ง / อัพเดท Playwright...
call npm install playwright --save-dev
call npx playwright install chromium

echo.
echo [2/3] รัน scraper...
node scripts/scrape-market.js

echo.
echo [3/3] เสร็จแล้ว — เช็คผลใน Supabase table: market_listings
echo  หรือดูใน Dashboard (ถ้ามี Market Intel tab)
echo ==============================================
pause
