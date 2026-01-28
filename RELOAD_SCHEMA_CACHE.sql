-- Force reload Supabase schema cache
-- Run this after adding new columns to refresh the API layer

NOTIFY pgrst, 'reload schema';

-- Alternative method: Update the schema version
SELECT pg_notify('pgrst', 'reload schema');

-- Verify the notification was sent
SELECT 'Schema cache reload signal sent!' as status;
