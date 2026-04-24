$ROOT = "C:\PROJECTS\CORE\ap-home-platform"

Write-Host "Starting Finnhouses Platform..." -ForegroundColor Cyan

# Backend Hub
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\services\backend-hub'; node server.cjs" -WindowStyle Normal

# FB Backend
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$ROOT\services\fb-backend'; node server.js" -WindowStyle Normal

# n8n
Start-Process powershell -ArgumentList "-NoExit", "-Command", "n8n start" -WindowStyle Normal

# Next.js (main window)
Write-Host "Backend Hub, FB Backend and n8n started in separate windows." -ForegroundColor Green
Write-Host "Starting Next.js..." -ForegroundColor Yellow
cd $ROOT
npm run dev
