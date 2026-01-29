# Start Backend and Frontend Servers for OnClicks Policy Manager
Write-Host "Starting OnClicks Policy Manager..." -ForegroundColor Green

# Start backend server in a new terminal
Write-Host "Starting Razorpay Backend Server..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npx tsx razorpay-webhook-server.ts"

# Wait a moment for backend to start
Start-Sleep -Seconds 5

Write-Host "Starting Frontend Dev Server..." -ForegroundColor Cyan

# Start frontend in current terminal
npm run dev
