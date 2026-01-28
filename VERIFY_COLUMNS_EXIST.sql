-- Verify if all custom columns exist in the policies table

SELECT 
    column_name,
    data_type,
    is_nullable,
    CASE 
        WHEN column_name IN ('commission_percentage', 'commission_amount', 'business_type', 
                              'registration_no', 'product_type') THEN '✓ REQUIRED'
        ELSE ''
    END as importance
FROM information_schema.columns
WHERE table_name = 'policies'
AND table_schema = 'public'
ORDER BY 
    CASE 
        WHEN column_name IN ('commission_percentage', 'commission_amount') THEN 1
        WHEN column_name LIKE '%premium%' THEN 2
        ELSE 3
    END,
    column_name;

-- Check if specific required columns exist
DO $$
DECLARE
    missing_columns TEXT[] := ARRAY[]::TEXT[];
    required_cols TEXT[] := ARRAY[
        'commission_percentage', 'commission_amount', 'business_type', 
        'registration_no', 'product_type', 'od_premium', 'net_premium'
    ];
    col TEXT;
    col_exists BOOLEAN;
BEGIN
    FOREACH col IN ARRAY required_cols
    LOOP
        SELECT EXISTS (
            SELECT 1 
            FROM information_schema.columns 
            WHERE table_name = 'policies' 
            AND table_schema = 'public'
            AND column_name = col
        ) INTO col_exists;
        
        IF NOT col_exists THEN
            missing_columns := array_append(missing_columns, col);
        END IF;
    END LOOP;
    
    IF array_length(missing_columns, 1) > 0 THEN
        RAISE NOTICE '❌ MISSING COLUMNS: %', array_to_string(missing_columns, ', ');
        RAISE NOTICE 'Run ADD_ALL_CUSTOM_POLICY_FIELDS.sql to add these columns';
    ELSE
        RAISE NOTICE '✅ All required columns exist!';
        RAISE NOTICE 'If you still get errors, refresh Supabase schema cache:';
        RAISE NOTICE '1. Go to Supabase Dashboard > Settings > API';
        RAISE NOTICE '2. Click "Reload schema cache" button';
    END IF;
END $$;
