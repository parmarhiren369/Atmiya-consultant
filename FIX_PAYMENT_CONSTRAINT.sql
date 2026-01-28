-- Fix payment_history constraint to allow new plan names
-- Run this in Supabase SQL Editor

-- Drop the old constraint
ALTER TABLE payment_history 
DROP CONSTRAINT IF EXISTS valid_subscription_plan;

-- Add new constraint with correct plan names
ALTER TABLE payment_history 
ADD CONSTRAINT valid_subscription_plan 
CHECK (subscription_plan IN ('basic', 'standard', 'premium', 'enterprise'));

-- Verify the constraint
SELECT conname, pg_get_constraintdef(oid) 
FROM pg_constraint 
WHERE conrelid = 'payment_history'::regclass 
AND conname = 'valid_subscription_plan';
