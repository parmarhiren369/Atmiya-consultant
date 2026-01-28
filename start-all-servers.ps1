# Start Both Frontend and Backend Servers

Write-Host "🚀 Starting Razorpay Payment Integration Servers..." -ForegroundColor Green
Write-Host ""

# Start Backend Server
Write-Host "📦 Starting Backend Server (Port 3000)..." -ForegroundColor Yellow
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npx tsx razorpay-webhook-server.ts" -WindowStyle Normal

# Wait a moment for backend to start
Start-Sleep -Seconds 3

# Start Frontend Server
Write-Host "🎨 Starting Frontend Server (Port 5173)..." -ForegroundColor Yellow  
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PSScriptRoot'; npm run dev" -WindowStyle Normal

Write-Host ""
Write-Host "✅ Both servers are starting in separate windows!" -ForegroundColor Green
Write-Host ""
Write-Host "📊 Server URLs:" -ForegroundColor Cyan
Write-Host "   Frontend: http://localhost:5173/pricing" -ForegroundColor White
Write-Host "   Backend:  http://localhost:3000/api/health" -ForegroundColor White
Write-Host ""
Write-Host "⚠️  IMPORTANT: Keep both PowerShell windows open!" -ForegroundColor Red
Write-Host ""
Write-Host "🧪 To test payment:" -ForegroundColor Cyan
Write-Host "   1. Go to http://localhost:5173/pricing" -ForegroundColor White
Write-Host "   2. Click 'Subscribe Now'" -ForegroundColor White
Write-Host "   3. Use test card: 4111 1111 1111 1111" -ForegroundColor White
Write-Host ""
Write-Host "Press any key to exit this window (servers will keep running)..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
