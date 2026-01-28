-- =============================================
-- FINAL FIX - RUN THIS COMPLETE SCRIPT
-- =============================================

-- 1. Disable RLS completely for initial setup
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- 2. Delete all data
DELETE FROM users;

-- 3. Verify the table exists
SELECT COUNT(*) FROM users;

-- Success message
SELECT 'Setup complete! RLS disabled. You can now signup and login.' as status;
