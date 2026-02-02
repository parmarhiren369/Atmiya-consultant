@echo off
echo ========================================
echo Starting On Clicks Application Servers
echo ========================================
echo.
echo Starting Local Backup Server (Port 3099)...
start "Local Backup Server" cmd /k "cd /d %~dp0\local-backup && npm start"
timeout /t 2 /nobreak >nul
echo.
echo Starting Backend Server (Port 3000)...
start "Razorpay Backend" cmd /k "cd /d %~dp0 && npx tsx razorpay-webhook-server.ts"
timeout /t 3 /nobreak >nul
echo.
echo Starting Frontend Server (Port 5173)...
start "Frontend Dev Server" cmd /k "cd /d %~dp0 && npm run dev"
echo.
echo ========================================
echo All servers are starting!
echo ========================================
echo.
echo Frontend:     http://localhost:5173
echo Backend:      http://localhost:3000
echo Local Backup: http://localhost:3099
echo.
echo Local backup data saved to: local-backup\data\
echo.
echo KEEP ALL WINDOWS OPEN!
echo.
pause
