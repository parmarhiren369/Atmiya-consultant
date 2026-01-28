-- ============================================
-- FIX USER-SPECIFIC POLICIES
-- ============================================
-- This script adds user_id to policies table and sets up RLS
-- so each user only sees their own policies

-- Step 1: Add user_id column to policies table if it doesn't exist
ALTER TABLE policies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 2: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);

-- Step 3: Update existing policies to assign to current admin user
-- REPLACE 'fe856cb5-1f45-42cd-8c75-1c6592365820' with your actual admin user ID
UPDATE policies 
SET user_id = 'fe856cb5-1f45-42cd-8c75-1c6592365820'
WHERE user_id IS NULL;

-- Step 4: Make user_id NOT NULL after assigning existing data
ALTER TABLE policies ALTER COLUMN user_id SET NOT NULL;

-- Step 5: Enable Row Level Security on policies table
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- Step 6: Drop any existing policies
DROP POLICY IF EXISTS "Users can view own policies" ON policies;
DROP POLICY IF EXISTS "Users can insert own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;
DROP POLICY IF EXISTS "Admins can view all policies" ON policies;

-- Step 7: Create RLS Policies
-- Users can only see their own policies
CREATE POLICY "Users can view own policies"
ON policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- Users can only insert their own policies
CREATE POLICY "Users can insert own policies"
ON policies FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

-- Users can only update their own policies
CREATE POLICY "Users can update own policies"
ON policies FOR UPDATE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- Users can only delete their own policies
CREATE POLICY "Users can delete own policies"
ON policies FOR DELETE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- Step 8: Do the same for other related tables

-- Activity Logs
ALTER TABLE activity_logs ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);

-- Update existing activity_logs
UPDATE activity_logs 
SET user_id = 'fe856cb5-1f45-42cd-8c75-1c6592365820'
WHERE user_id IS NULL;

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own activity logs" ON activity_logs;
CREATE POLICY "Users can view own activity logs"
ON activity_logs FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can insert own activity logs" ON activity_logs;
CREATE POLICY "Users can insert own activity logs"
ON activity_logs FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

-- Deleted Policies
ALTER TABLE deleted_policies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_deleted_policies_user_id ON deleted_policies(user_id);

UPDATE deleted_policies 
SET user_id = 'fe856cb5-1f45-42cd-8c75-1c6592365820'
WHERE user_id IS NULL;

ALTER TABLE deleted_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own deleted policies" ON deleted_policies;
CREATE POLICY "Users can view own deleted policies"
ON deleted_policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can insert own deleted policies" ON deleted_policies;
CREATE POLICY "Users can insert own deleted policies"
ON deleted_policies FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

DROP POLICY IF EXISTS "Users can delete own deleted policies" ON deleted_policies;
CREATE POLICY "Users can delete own deleted policies"
ON deleted_policies FOR DELETE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- Lapsed Policies
ALTER TABLE lapsed_policies ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_lapsed_policies_user_id ON lapsed_policies(user_id);

UPDATE lapsed_policies 
SET user_id = 'fe856cb5-1f45-42cd-8c75-1c6592365820'
WHERE user_id IS NULL;

ALTER TABLE lapsed_policies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own lapsed policies" ON lapsed_policies;
CREATE POLICY "Users can view own lapsed policies"
ON lapsed_policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- Tasks
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;
CREATE INDEX IF NOT EXISTS idx_tasks_user_id ON tasks(user_id);

UPDATE tasks 
SET user_id = 'fe856cb5-1f45-42cd-8c75-1c6592365820'
WHERE user_id IS NULL;

ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view own tasks" ON tasks;
CREATE POLICY "Users can view own tasks"
ON tasks FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

DROP POLICY IF EXISTS "Users can manage own tasks" ON tasks;
CREATE POLICY "Users can manage own tasks"
ON tasks FOR ALL
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
)
WITH CHECK (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users 
    WHERE users.id::TEXT = auth.uid()::TEXT 
    AND users.role = 'admin'
  )
);

-- ============================================
-- VERIFICATION
-- ============================================

-- Check if user_id column exists in all tables
SELECT 
  'policies' as table_name,
  COUNT(*) as total_policies,
  COUNT(DISTINCT user_id) as unique_users
FROM policies
UNION ALL
SELECT 
  'activity_logs',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM activity_logs
UNION ALL
SELECT 
  'deleted_policies',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM deleted_policies;

-- ============================================
-- DONE!
-- ============================================
-- Now each user will only see their own data
-- Admin can see all data
