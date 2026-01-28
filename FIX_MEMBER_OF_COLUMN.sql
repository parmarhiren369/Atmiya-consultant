-- Fix member_of column to ensure it's properly typed as UUID
-- This resolves the "operator does not exist: uuid = text" error

-- First, check the current type
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'policies' AND column_name = 'member_of';

-- If member_of is TEXT, we need to convert it to UUID
-- Step 1: Drop the existing foreign key constraint if it exists
ALTER TABLE policies 
DROP CONSTRAINT IF EXISTS policies_member_of_fkey;

-- Step 2: Drop the column if it exists and recreate with proper type
ALTER TABLE policies 
DROP COLUMN IF EXISTS member_of;

-- Step 3: Add it back as UUID with proper foreign key
ALTER TABLE policies 
ADD COLUMN member_of UUID REFERENCES group_heads(id) ON DELETE SET NULL;

-- Step 4: Create index for better performance
CREATE INDEX IF NOT EXISTS idx_policies_member_of ON policies(member_of);

-- Step 5: Add comment
COMMENT ON COLUMN policies.member_of IS 'References group_heads.id - indicates which group this policy belongs to';

-- Verify the fix
SELECT column_name, data_type, udt_name
FROM information_schema.columns
WHERE table_name = 'policies' AND column_name = 'member_of';

-- Display success message
DO $$
BEGIN
    RAISE NOTICE '✅ member_of column fixed! Now properly typed as UUID';
    RAISE NOTICE 'Reload schema cache and try adding a policy again.';
END $$;
