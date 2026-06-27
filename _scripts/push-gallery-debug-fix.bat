@echo off
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform

echo === Removing git locks ===
if exist ".git\index.lock" del /f ".git\index.lock"
if exist ".git\HEAD.lock" del /f ".git\HEAD.lock"

echo === Pushing commit 0a6a563 ===
echo  - Hub: belt-and-suspenders featured_media via WP REST API (POST /wp/v2/property/{id})
echo  - Hub: logs sent_featured_media + sent_gallery_ids + WP debug response
echo  - Dashboard: shows WP confirmation after publish (thumb ID + gallery IDs saved)
echo.
git push origin main

echo.
echo === Push done! Vercel + Railway auto-deploy ~1-2 min ===
echo.
echo ============================================================
echo หลัง deploy เสร็จ — ต้องทำ:
echo.
echo 1. อัพโหลด functions.php ขึ้น cPanel
echo    Local:  D:\ARCHI\01_PROJECTS\CORE\threme web\finnhouses-theme\finnhouses-theme\functions.php
echo    Server: public_html/wp-content/themes/finnhouses-theme/functions.php
echo    (เพิ่ม debug fields ใน REST response — thumbnail_id + gallery_saved)
echo.
echo 2. ใน Dashboard > ทรัพย์รอ Review:
echo    - Upload รูป 4 รูปใหม่ทั้งหมดใน record ที่ pending
echo    - ตรวจว่า badge เป็น #ID เขียวทุก slot
echo    - Approve
echo.
echo 3. หลัง Approve — จะเห็น debug bar ใต้ "ดูบนเว็บ":
echo    WP saved: thumb=#XXX gallery=[YYY,ZZZ,WWW]
echo    ถ้า thumb=#0 หรือ gallery=[] = ยังมีปัญหา
echo    ถ้า thumb=#XXX gallery=[3 IDs] = ควรแสดง 4 รูปบนเว็บ
echo.
echo 4. ลบ WP post #715 ออก (ตอนนี้ยังเป็น 3 รูปอยู่)
echo    https://finnhouses.com/wp-admin/post.php?post=715^&action=edit
echo ============================================================
echo.
pause
