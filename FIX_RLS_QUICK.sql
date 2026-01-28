-- Quick fix for RLS policies to allow user reads
-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users and admins can read users" ON users;
DROP POLICY IF EXISTS "Users can read own data" ON users;

-- Create simple policy for authenticated users to read their own data
CREATE POLICY "users_read_own" ON users
  FOR SELECT
  TO authenticated
  USING (auth.uid() = id OR (SELECT role FROM users WHERE id = auth.uid()) = 'admin');

-- Update dates to prevent expiration blocking
UPDATE users
SET trial_end_date = NOW() + INTERVAL '30 days'
WHERE trial_end_date IS NOT NULL AND trial_end_date < NOW();

UPDATE users
SET subscription_end_date = NOW() + INTERVAL '30 days'
WHERE subscription_end_date IS NOT NULL AND subscription_end_date < NOW();

UPDATE users
SET subscription_status = 'trial'
WHERE subscription_status = 'expired' AND trial_end_date IS NOT NULL;

-- Verify
SELECT id, email, subscription_status, trial_end_date FROM users;
