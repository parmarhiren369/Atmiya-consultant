@echo off
echo ==========================================
echo   STARTING RAZORPAY BACKEND SERVER
echo ==========================================
echo.

REM Check if .env.backend exists
if not exist .env.backend (
    echo ERROR: .env.backend file not found!
    echo.
    echo Please create .env.backend file with the following variables:
    echo.
    echo   PORT=3000
    echo   RAZORPAY_KEY_ID=your_razorpay_key_id
    echo   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
    echo   RAZORPAY_WEBHOOK_SECRET=your_webhook_secret
    echo   SUPABASE_URL=https://your-project.supabase.co
    echo   SUPABASE_SERVICE_KEY=your_service_key
    echo.
    echo See env.backend.example for reference.
    echo.
    pause
    exit /b 1
)

echo Loading environment variables...
for /f "tokens=1,* delims==" %%a in (.env.backend) do (
    set "%%a=%%b"
)

echo.
echo Configuration:
echo - Port: %PORT%
echo - Razorpay Key: %RAZORPAY_KEY_ID%
echo - Supabase URL: %SUPABASE_URL%
echo.

if "%SUPABASE_SERVICE_KEY%"=="" (
    echo ERROR: Supabase Service Key not configured!
    echo.
    echo Please edit .env.backend and add your Supabase Service Key
    echo.
    pause
    exit /b 1
)

echo Starting backend server...
echo.
npx tsx razorpay-webhook-server.ts
