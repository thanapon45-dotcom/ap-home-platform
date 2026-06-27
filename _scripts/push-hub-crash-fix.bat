@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"

echo === Pushing commit 26babef ===
echo  - Fix: restore truncated server.cjs
echo  - Railway was crash-looping (SyntaxError: Unexpected end of input)
echo  - append-line-image + land-lead routes were cut off in prev commit
echo.
git push origin main

echo.
echo === Push done! Railway auto-deploy ~1-2 min ===
echo.
echo ============================================================
echo หลัง Railway restart แล้ว — ทำ test 4 ภาพ:
echo.
echo 1. Dashboard > ทรัพย์รอ Review
echo    - อัพโหลด COVER + 3 gallery ครบ
echo    - ตรวจว่า badge เป็น #ID เขียวทุก slot
echo    - กด Approve
echo.
echo 2. ดู debug bar ใต้ "ดูบนเว็บ":
echo    WP saved: thumb=#XXX gallery=[YYY,ZZZ,WWW]
echo    ถ้า thumb=#XXX gallery=[3 IDs] = ถูกต้อง → เว็บจะแสดง 4 ภาพ
echo.
echo 3. เปิด finnhouses.com/properties/[slug] ตรวจ layout 4 ภาพ
echo ============================================================
echo.
pause
