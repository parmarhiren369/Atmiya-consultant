-- =============================================
-- COMPLETE FRESH SETUP - DELETE OLD DATA FIRST
-- =============================================

-- Step 1: Delete all existing users from the users table
DELETE FROM users;

-- Step 2: Drop and recreate the table with proper structure
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
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

-- Step 3: Create indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_subscription_status ON users(subscription_status);
CREATE INDEX idx_users_role ON users(role);

-- Step 4: Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Step 5: Create simple RLS policies (no recursion)
CREATE POLICY "Users can read own data" 
ON users FOR SELECT 
USING (auth.uid()::TEXT = id::TEXT);

CREATE POLICY "Users can update own data" 
ON users FOR UPDATE 
USING (auth.uid()::TEXT = id::TEXT)
WITH CHECK (auth.uid()::TEXT = id::TEXT);

CREATE POLICY "Users can insert own data during signup" 
ON users FOR INSERT 
WITH CHECK (auth.uid()::TEXT = id::TEXT);

CREATE POLICY "Users can delete own data" 
ON users FOR DELETE 
USING (auth.uid()::TEXT = id::TEXT);

-- Step 6: Verify setup
SELECT 'Database setup complete!' as status;
