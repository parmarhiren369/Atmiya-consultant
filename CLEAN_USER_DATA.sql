-- Clean up orphaned policies and ensure proper data isolation
-- Run this in Supabase SQL Editor

-- 1. Check for policies without user_id
SELECT COUNT(*) as orphaned_policies FROM policies WHERE user_id IS NULL OR user_id = '';

-- 2. Delete orphaned policies (policies without a valid user_id)
DELETE FROM policies WHERE user_id IS NULL OR user_id = '';

-- 3. Check for deleted_policies without user_id
SELECT COUNT(*) as orphaned_deleted FROM deleted_policies WHERE user_id IS NULL OR user_id = '';

-- 4. Delete orphaned deleted_policies
DELETE FROM deleted_policies WHERE user_id IS NULL OR user_id = '';

-- 5. Check for activity_logs without user_id
SELECT COUNT(*) as orphaned_logs FROM activity_logs WHERE user_id IS NULL OR user_id = '';

-- 6. Delete orphaned activity logs
DELETE FROM activity_logs WHERE user_id IS NULL OR user_id = '';

-- 7. Ensure RLS is enabled on all tables
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- 8. Drop existing policies if they conflict
DROP POLICY IF EXISTS "Users can view their own policies" ON policies;
DROP POLICY IF EXISTS "Admins can view all policies" ON policies;
DROP POLICY IF EXISTS "Users can insert their own policies" ON policies;
DROP POLICY IF EXISTS "Users can update their own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete their own policies" ON policies;

-- 9. Create RLS policies for policies table
CREATE POLICY "Users can view their own policies" ON policies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert their own policies" ON policies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own policies" ON policies
  FOR UPDATE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can delete their own policies" ON policies
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 10. Create similar policies for deleted_policies
DROP POLICY IF EXISTS "Users can view their own deleted policies" ON deleted_policies;
DROP POLICY IF EXISTS "Users can insert deleted policies" ON deleted_policies;
DROP POLICY IF EXISTS "Users can delete their deleted policies" ON deleted_policies;

CREATE POLICY "Users can view their own deleted policies" ON deleted_policies
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert deleted policies" ON deleted_policies
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their deleted policies" ON deleted_policies
  FOR DELETE
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

-- 11. Create policies for activity_logs
DROP POLICY IF EXISTS "Users can view activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;

CREATE POLICY "Users can view activity logs" ON activity_logs
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert activity logs" ON activity_logs
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 12. Create policies for payment_history
DROP POLICY IF EXISTS "Users can view their payment history" ON payment_history;
DROP POLICY IF EXISTS "Users can insert payment records" ON payment_history;

CREATE POLICY "Users can view their payment history" ON payment_history
  FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid() 
    OR 
    (SELECT role FROM users WHERE id = auth.uid()) = 'admin'
  );

CREATE POLICY "Users can insert payment records" ON payment_history
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- 13. Verify all data is now properly associated with users
SELECT 
  'policies' as table_name,
  COUNT(*) as total_count,
  COUNT(DISTINCT user_id) as unique_users
FROM policies
UNION ALL
SELECT 
  'deleted_policies',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM deleted_policies
UNION ALL
SELECT 
  'activity_logs',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM activity_logs
UNION ALL
SELECT 
  'payment_history',
  COUNT(*),
  COUNT(DISTINCT user_id)
FROM payment_history;

-- 14. Show sample data per user (excluding admin)
SELECT 
  u.email,
  u.display_name,
  u.role,
  COUNT(DISTINCT p.id) as policy_count,
  COUNT(DISTINCT dp.id) as deleted_policy_count,
  COUNT(DISTINCT al.id) as activity_log_count
FROM users u
LEFT JOIN policies p ON p.user_id = u.id
LEFT JOIN deleted_policies dp ON dp.user_id = u.id
LEFT JOIN activity_logs al ON al.user_id = u.id
WHERE u.role != 'admin'
GROUP BY u.id, u.email, u.display_name, u.role
ORDER BY u.email;
