@echo off
echo ========================================
echo Starting Razorpay Payment Servers
echo ========================================
echo.
echo Starting Backend Server (Port 3000)...
start "Razorpay Backend" cmd /k "cd /d %~dp0 && npx tsx razorpay-webhook-server.ts"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend Server (Port 5173)...
start "Frontend Dev Server" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo ========================================
echo Both servers are starting!
echo ========================================
echo.
echo Frontend: http://localhost:5173/pricing
echo Backend:  http://localhost:3000
echo.
echo KEEP BOTH WINDOWS OPEN!
echo.
pause
