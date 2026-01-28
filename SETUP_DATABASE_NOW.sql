-- ============================================
-- COMPLETE SUPABASE SETUP - RUN THIS NOW!
-- ============================================

-- 1. Create the users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login TIMESTAMP WITH TIME ZONE,
  
  -- Subscription fields
  subscription_status TEXT DEFAULT 'trial',
  trial_start_date TIMESTAMP WITH TIME ZONE,
  trial_end_date TIMESTAMP WITH TIME ZONE,
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Account locking fields
  is_locked BOOLEAN DEFAULT false,
  locked_reason TEXT,
  locked_by UUID,
  locked_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_role CHECK (role IN ('user', 'admin')),
  CONSTRAINT valid_subscription_status CHECK (subscription_status IN ('trial', 'active', 'expired', 'locked'))
);

-- 2. Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_subscription_status ON users(subscription_status);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);

-- 3. Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 4. Drop existing policies if any
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Users can update own data" ON users;
DROP POLICY IF EXISTS "Users can insert own data during signup" ON users;
DROP POLICY IF EXISTS "Admins can delete users" ON users;
DROP POLICY IF EXISTS "Users can delete own data" ON users;

-- 5. Create RLS Policies (Fixed - no recursion)
-- Allow users to read their own data only (no admin check to avoid recursion)
CREATE POLICY "Users can read own data" 
ON users FOR SELECT 
USING (auth.uid()::TEXT = id::TEXT);

-- Allow users to update their own data
CREATE POLICY "Users can update own data" 
ON users FOR UPDATE 
USING (auth.uid()::TEXT = id::TEXT)
WITH CHECK (auth.uid()::TEXT = id::TEXT);

-- Allow authenticated users to insert their own record during signup
CREATE POLICY "Users can insert own data during signup" 
ON users FOR INSERT 
WITH CHECK (auth.uid()::TEXT = id::TEXT);

-- Only allow users to delete themselves (admins can manage via service role)
CREATE POLICY "Users can delete own data" 
ON users FOR DELETE 
USING (auth.uid()::TEXT = id::TEXT);

-- 6. Insert profile for your admin user
-- Replace 'YOUR_USER_UUID' with your actual user ID from Supabase Authentication > Users
-- Replace 'admin@example.com' with your admin email
-- INSERT INTO users (
--   id, 
--   email, 
--   display_name, 
--   role, 
--   is_active, 
--   subscription_status,
--   is_locked,
--   created_at
-- ) VALUES (
--   'YOUR_USER_UUID',  -- Your UID from Supabase Authentication
--   'admin@example.com',
--   'Admin',
--   'admin',  -- Make this user an admin
--   true,
--   'active',  -- Admins get active status, not trial
--   false,
--   NOW()
-- )
-- ON CONFLICT (id) DO UPDATE SET
--   display_name = EXCLUDED.display_name,
--   role = EXCLUDED.role,
--   subscription_status = EXCLUDED.subscription_status;

-- 7. Verify the setup
SELECT 
  id,
  email,
  display_name,
  role,
  subscription_status,
  created_at
FROM users;
