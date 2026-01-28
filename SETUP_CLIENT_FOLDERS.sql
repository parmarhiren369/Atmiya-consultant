-- SQL Setup for Client Folders and Policies RLS Fix
-- Run this in your Supabase SQL Editor

-- ============================================
-- STEP 1: Ensure RLS is Enabled
-- ============================================

ALTER TABLE policies ENABLE ROW LEVEL SECURITY;

-- ============================================
-- STEP 2: Drop ALL existing policies on policies table
-- ============================================

DROP POLICY IF EXISTS "Users can view their own policies" ON policies;
DROP POLICY IF EXISTS "Users can insert their own policies" ON policies;
DROP POLICY IF EXISTS "Users can update their own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete their own policies" ON policies;
DROP POLICY IF EXISTS "Admins can view all policies" ON policies;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON policies;
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON policies;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON policies;
DROP POLICY IF EXISTS "Enable delete for users based on user_id" ON policies;

-- ============================================
-- STEP 3: Create Proper RLS Policies
-- ============================================

-- SELECT Policy: Users can view their own policies, admins can view all
CREATE POLICY "Users can view their own policies" ON policies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- INSERT Policy: Users can only insert policies with their own user_id
CREATE POLICY "Users can insert their own policies" ON policies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- UPDATE Policy: Users can update their own policies, admins can update all
CREATE POLICY "Users can update their own policies" ON policies
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  )
  WITH CHECK (
    user_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- DELETE Policy: Users can delete their own policies, admins can delete all
CREATE POLICY "Users can delete their own policies" ON policies
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    EXISTS (SELECT 1 FROM users WHERE users.id = auth.uid() AND users.role = 'admin')
  );

-- ============================================
-- STEP 4: Verify Data
-- ============================================

-- Count policies per user
SELECT user_id, COUNT(*) as policy_count
FROM policies
GROUP BY user_id
ORDER BY policy_count DESC;

-- ============================================
-- STEP 5: Check for orphaned policies
-- ============================================

-- Check for policies without user_id
SELECT COUNT(*) as orphaned_policies 
FROM policies 
WHERE user_id IS NULL;

-- If there are orphaned policies, you can delete them (UNCOMMENT if needed):
-- DELETE FROM policies WHERE user_id IS NULL;

SELECT 'RLS Setup Complete! Each user will now see only their own policies.' as status;
