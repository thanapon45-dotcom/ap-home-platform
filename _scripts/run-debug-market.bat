@echo off
echo ==============================================
echo  Debug Market Scraper
echo  ดู HTML structure ของแต่ละเว็บก่อนเขียน scraper
echo ==============================================
cd /d "%~dp0"
node scripts/debug-market.js
echo.
echo ไฟล์ผลลัพธ์อยู่ที่ scripts\debug-output.txt
echo และ screenshot: scripts\debug-DDproperty.png, debug-Baania.png ฯลฯ
echo ==============================================
pause
