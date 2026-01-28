-- Add all custom fields to lapsed_policies table
-- Ensures lapsed policies retain all data from the original policies

-- Add commission columns
ALTER TABLE lapsed_policies 
ADD COLUMN IF NOT EXISTS commission_percentage TEXT,
ADD COLUMN IF NOT EXISTS commission_amount TEXT;

-- Add vehicle insurance specific fields
ALTER TABLE lapsed_policies
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
ALTER TABLE lapsed_policies
ADD COLUMN IF NOT EXISTS remark TEXT,
ADD COLUMN IF NOT EXISTS product_type TEXT,
ADD COLUMN IF NOT EXISTS reference_from_name TEXT,
ADD COLUMN IF NOT EXISTS is_one_time_policy BOOLEAN DEFAULT FALSE;

-- Add document management fields
ALTER TABLE lapsed_policies
ADD COLUMN IF NOT EXISTS pdf_file_name TEXT,
ADD COLUMN IF NOT EXISTS file_id TEXT,
ADD COLUMN IF NOT EXISTS drive_file_url TEXT,
ADD COLUMN IF NOT EXISTS drive_file_id TEXT,
ADD COLUMN IF NOT EXISTS documents_folder_link TEXT;

-- Add settlement/claim tracking fields
ALTER TABLE lapsed_policies
ADD COLUMN IF NOT EXISTS claim_status TEXT DEFAULT 'none',
ADD COLUMN IF NOT EXISTS has_claim_settled BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS settled_amount TEXT,
ADD COLUMN IF NOT EXISTS settlement_date TEXT,
ADD COLUMN IF NOT EXISTS is_renewed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS last_claim_date TEXT,
ADD COLUMN IF NOT EXISTS last_claim_amount TEXT,
ADD COLUMN IF NOT EXISTS has_claim_last_year BOOLEAN DEFAULT FALSE;

-- Verify all columns were added successfully
SELECT 
    column_name, 
    data_type, 
    is_nullable
FROM information_schema.columns
WHERE table_name = 'lapsed_policies'
AND column_name IN (
    'commission_percentage', 'commission_amount',
    'product_type', 'remark', 'is_one_time_policy'
)
ORDER BY column_name;

-- Display success message
DO $$
BEGIN
    RAISE NOTICE 'All custom fields have been successfully added to the lapsed_policies table!';
END $$;
