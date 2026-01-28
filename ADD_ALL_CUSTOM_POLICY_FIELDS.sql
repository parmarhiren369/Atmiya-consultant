-- Comprehensive migration to add all missing custom fields to policies table
-- This ensures all fields used by the application are available in the database

-- Add commission columns (main requirement)
ALTER TABLE policies 
ADD COLUMN IF NOT EXISTS commission_percentage TEXT,
ADD COLUMN IF NOT EXISTS commission_amount TEXT;

-- Add vehicle insurance specific fields
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS business_type TEXT,
ADD COLUMN IF NOT EXISTS member_of TEXT,
ADD COLUMN IF NOT EXISTS registration_no TEXT,
ADD COLUMN IF NOT EXISTS engine_no TEXT,
ADD COLUMN IF NOT EXISTS chasis_no TEXT,
ADD COLUMN IF NOT EXISTS hp TEXT,
ADD COLUMN IF NOT EXISTS risk_location_address TEXT,
ADD COLUMN IF NOT EXISTS idv TEXT,
ADD COLUMN IF NOT EXISTS net_premium TEXT,
ADD COLUMN IF NOT EXISTS od_premium TEXT,
ADD COLUMN IF NOT EXISTS third_party_premium TEXT,
ADD COLUMN IF NOT EXISTS gst TEXT,
ADD COLUMN IF NOT EXISTS total_premium TEXT,
ADD COLUMN IF NOT EXISTS ncb_percentage TEXT;

-- Add general policy fields
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS remark TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS reference_from_name TEXT,
ADD COLUMN IF NOT EXISTS is_one_time_policy BOOLEAN DEFAULT FALSE;

-- Add document management fields
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_file_url TEXT,
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS documents_folder_link TEXT;

-- Add settlement/claim tracking fields
ALTER TABLE policies
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS has_claim_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settled_amount TEXT,
ADD COLUMN IF NOT EXISTS settlement_date TEXT,
ADD COLUMN IF NOT EXISTS is_renewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_claim_date TEXT,
ADD COLUMN IF NOT EXISTS last_claim_amount TEXT,
ADD COLUMN IF NOT EXISTS has_claim_last_year BOOLEAN DEFAULT FALSE;

-- Add comments to document important columns
COMMENT ON COLUMN policies.commission_percentage IS 'Commission percentage earned on this policy';
COMMENT ON COLUMN policies.commission_amount IS 'Calculated commission amount in rupees';
COMMENT ON COLUMN policies.od_premium IS 'Own Damage premium for vehicle insurance';
COMMENT ON COLUMN policies.third_party_premium IS 'Third Party premium for vehicle insurance';
COMMENT ON COLUMN policies.net_premium IS 'Net premium amount before taxes';
COMMENT ON COLUMN policies.total_premium IS 'Total premium including all charges';
COMMENT ON COLUMN policies.product_type IS 'Specific product type (e.g., Private Car, Two Wheeler, Health, etc.)';
COMMENT ON COLUMN policies.is_one_time_policy IS 'Indicates if this is a one-time policy that should not show renewal reminders';
COMMENT ON COLUMN policies.claim_status IS 'Current claim status: none, in-progress, or settled';

-- Create indexes for frequently queried columns
CREATE INDEX IF NOT EXISTS idx_policies_commission_amount ON policies(commission_amount) WHERE commission_amount IS NOT NULL AND commission_amount != '';
CREATE INDEX IF NOT EXISTS idx_policies_product_type ON policies(product_type);
CREATE INDEX IF NOT EXISTS idx_policies_claim_status ON policies(claim_status);
CREATE INDEX IF NOT EXISTS idx_policies_is_one_time_policy ON policies(is_one_time_policy);

-- Verify all columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'policies'
AND column_name IN (
    'commission_percentage', 'commission_amount',
    'business_type', 'member_of', 'registration_no', 'engine_no', 'chasis_no',
    'hp', 'risk_location_address', 'idv', 'net_premium', 'od_premium',
    'third_party_premium', 'gst', 'total_premium', 'ncb_percentage',
    'remark', 'product_type', 'reference_from_name', 'is_one_time_policy',
    'pdf_file_name', 'file_id', 'drive_file_url', 'drive_file_id', 'documents_folder_link',
    'claim_status', 'has_claim_settled', 'settled_amount', 'settlement_date',
    'is_renewed', 'last_claim_date', 'last_claim_amount', 'has_claim_last_year'
)
ORDER BY column_name;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'All custom fields have been successfully added to the policies table!';
    RAISE NOTICE 'You can now store commission data and other policy details.';
END $$;
