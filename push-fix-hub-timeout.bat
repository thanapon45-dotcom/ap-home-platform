@echo off
echo ============================================
echo  PUSH — Fix Hub Timeout + Gitignore Cache
echo ============================================
cd /d "%~dp0"

echo.
echo [1/4] Remove .cache from git tracking...
git rm -r --cached .cache/ 2>nul
if %errorlevel% neq 0 (
  echo      .cache/ not tracked — skipping
)

echo.
echo [2/4] Staging all changes...
git add -A

echo.
echo [3/4] Committing...
git commit -m "fix: handle Hub timeout gracefully + add .cache/ to gitignore"

echo.
echo [4/4] Pushing to GitHub...
git push

echo.
echo ============================================
echo  Done! Vercel will auto-deploy in ~1 min
echo ============================================
pause
