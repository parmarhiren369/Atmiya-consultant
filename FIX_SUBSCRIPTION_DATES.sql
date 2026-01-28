-- Fix subscription dates for all users to allow login
-- This will extend the trial/subscription end dates to 30 days from now

-- Update trial end dates for users on trial
UPDATE users
SET trial_end_date = NOW() + INTERVAL '30 days'
WHERE subscription_status = 'trial' OR subscription_status = 'expired';

-- Update subscription end dates for users with active subscriptions
UPDATE users
SET subscription_end_date = NOW() + INTERVAL '30 days'
WHERE subscription_status = 'active' AND subscription_end_date IS NOT NULL;

-- Reset any expired subscriptions back to trial or active
UPDATE users
SET subscription_status = CASE
  WHEN trial_end_date IS NOT NULL AND subscription_end_date IS NULL THEN 'trial'
  WHEN subscription_end_date IS NOT NULL THEN 'active'
  ELSE subscription_status
END
WHERE subscription_status = 'expired';

-- Verify the changes
SELECT 
  id,
  email,
  display_name,
  subscription_status,
  trial_end_date,
  subscription_end_date,
  CASE
    WHEN subscription_status = 'trial' AND trial_end_date IS NOT NULL 
      THEN EXTRACT(DAY FROM (trial_end_date - NOW()))
    WHEN subscription_status = 'active' AND subscription_end_date IS NOT NULL 
      THEN EXTRACT(DAY FROM (subscription_end_date - NOW()))
    ELSE NULL
  END as days_remaining
FROM users
WHERE role != 'admin';
