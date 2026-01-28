-- Add commission columns to policies table
-- This allows tracking commission percentage and amount for each policy

ALTER TABLE policies 
ADD COLUMN IF NOT EXISTS commission_percentage TEXT,
ADD COLUMN IF NOT EXISTS commission_amount TEXT;

-- Add comment to document the columns
COMMENT ON COLUMN policies.commission_percentage IS 'Commission percentage for the policy (stored as text for flexibility)';
COMMENT ON COLUMN policies.commission_amount IS 'Calculated commission amount for the policy (stored as text for flexibility)';

-- Verify the columns were added
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'policies'
AND column_name IN ('commission_percentage', 'commission_amount');
