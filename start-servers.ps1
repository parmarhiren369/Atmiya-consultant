# ============================================
# OnClicks Policy Manager - Server Startup Script
# ============================================
# Before running, create a .env.backend file with your credentials:
#   RAZORPAY_KEY_ID=your_razorpay_key_id
#   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
#   SUPABASE_URL=your_supabase_url
#   SUPABASE_SERVICE_KEY=your_supabase_service_key
# ============================================

Write-Host "Starting Razorpay Backend Server..." -ForegroundColor Green
Write-Host "Make sure you have configured .env.backend file with your credentials!" -ForegroundColor Yellow

# Start backend server in a new terminal (uses .env.backend file)
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd '$PWD'; npm install --prefix . -f express @supabase/supabase-js razorpay dotenv @types/express tsx; npx tsx razorpay-webhook-server.ts"

# Wait a moment for backend to start
Start-Sleep -Seconds 5

Write-Host "Starting Frontend Dev Server..." -ForegroundColor Cyan

# Start frontend in current terminal
npm run dev
