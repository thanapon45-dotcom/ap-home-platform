@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/Marketing.tsx
git commit -m "feat: add Market Data field (Option B — Real Estate Intelligence)

- marketData state + textarea UI in Control Panel (purple accent)
- handleRun(): pass market_data in payload (only when non-empty)
- n8n will receive market_data field alongside keyword/category
- Placeholder guides user: ราคา/โซน/ค่ารีโนเวทที่รู้จริง
- Clear button + active indicator when data is present"
git push origin main
echo.
echo Done! Vercel will auto-deploy in ~1 min.
echo.
echo NEXT STEP: แก้ n8n article gen node ให้ใช้ market_data
pause
