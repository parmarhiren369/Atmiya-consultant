-- Create group_heads table to manage customer groups and their family members
-- Each group head represents a primary customer whose family policies are tracked together

CREATE TABLE IF NOT EXISTS group_heads (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    
    -- Group Head Information
    group_head_name TEXT NOT NULL,
    contact_no TEXT,
    email_id TEXT,
    address TEXT,
    
    -- Additional Information
    relationship_type TEXT DEFAULT 'Primary', -- Primary, Family Head, Corporate, etc.
    notes TEXT,
    
    -- Tracking
    total_policies INTEGER DEFAULT 0,
    total_premium_amount NUMERIC DEFAULT 0,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW()),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc', NOW())
);

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_group_heads_user_id ON group_heads(user_id);
CREATE INDEX IF NOT EXISTS idx_group_heads_name ON group_heads(group_head_name);
CREATE INDEX IF NOT EXISTS idx_group_heads_created_at ON group_heads(created_at DESC);

-- Add RLS (Row Level Security) policies
ALTER TABLE group_heads ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only see their own group heads
CREATE POLICY "Users can view their own group heads"
    ON group_heads FOR SELECT
    USING (auth.uid() = user_id);

-- Policy: Users can insert their own group heads
CREATE POLICY "Users can insert their own group heads"
    ON group_heads FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own group heads
CREATE POLICY "Users can update their own group heads"
    ON group_heads FOR UPDATE
    USING (auth.uid() = user_id);

-- Policy: Users can delete their own group heads
CREATE POLICY "Users can delete their own group heads"
    ON group_heads FOR DELETE
    USING (auth.uid() = user_id);

-- Create trigger to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_group_heads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc', NOW());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_group_heads_updated_at
    BEFORE UPDATE ON group_heads
    FOR EACH ROW
    EXECUTE FUNCTION update_group_heads_updated_at();

-- Add comment to table
COMMENT ON TABLE group_heads IS 'Stores group head information for organizing family/corporate policy groups';
COMMENT ON COLUMN group_heads.group_head_name IS 'Name of the primary customer/group head';
COMMENT ON COLUMN group_heads.total_policies IS 'Count of policies under this group head';
COMMENT ON COLUMN group_heads.total_premium_amount IS 'Sum of all premium amounts under this group';

-- Update policies table to add member_of column if not exists
ALTER TABLE policies 
ADD COLUMN IF NOT EXISTS member_of UUID REFERENCES group_heads(id) ON DELETE SET NULL;

-- Create index for member_of column
CREATE INDEX IF NOT EXISTS idx_policies_member_of ON policies(member_of);

-- Add comment
COMMENT ON COLUMN policies.member_of IS 'References group_heads table - indicates which group this policy belongs to';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ Group Heads table created successfully!';
    RAISE NOTICE '✅ Policies.member_of column added!';
    RAISE NOTICE 'You can now manage customer groups and track family policies together.';
END $$;
