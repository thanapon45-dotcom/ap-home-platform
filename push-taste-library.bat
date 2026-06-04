@echo off
echo ========================================
echo  Push: Taste Library + Emotional Tones
echo ========================================
cd /d D:\ARCHI\01_PROJECTS\CORE\ap-home-platform
git add components/AIContent.tsx
git commit -m "feat: Taste Library — star content as few-shot reference + emotional tones"
git push
echo.
echo Done! Check Vercel for deployment status.
pause
