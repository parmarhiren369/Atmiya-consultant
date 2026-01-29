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
    echo   FIREBASE_PROJECT_ID=your_firebase_project_id
    echo   FIREBASE_CLIENT_EMAIL=your_service_account_email
    echo   FIREBASE_PRIVATE_KEY=your_private_key
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
echo - Firebase Project: %FIREBASE_PROJECT_ID%
echo.

if "%FIREBASE_PROJECT_ID%"=="" (
    echo ERROR: Firebase Project ID not configured!
    echo.
    echo Please edit .env.backend and add your Firebase credentials
    echo.
    pause
    exit /b 1
)

echo Starting backend server...
echo.
npx tsx razorpay-webhook-server.ts
