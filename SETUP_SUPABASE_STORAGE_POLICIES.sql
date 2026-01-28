-- =====================================================
-- Supabase Storage Policy Setup
-- =====================================================
-- This script sets up storage policies for document uploads
-- Run this in your Supabase SQL Editor
-- =====================================================

-- Drop existing policies if they exist (for clean setup)
DROP POLICY IF EXISTS "Allow authenticated users to upload policy files" ON storage.objects;
DROP POLICY IF EXISTS "Allow public policy file access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own policy files" ON storage.objects;
DROP POLICY IF EXISTS "Allow authenticated users to upload client documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public client documents access" ON storage.objects;
DROP POLICY IF EXISTS "Allow users to delete their own client documents" ON storage.objects;

-- =====================================================
-- POLICY DOCUMENTS BUCKET POLICIES
-- =====================================================

-- Allow authenticated users to upload policy files
CREATE POLICY "Allow authenticated users to upload policy files"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'policy-documents');

-- Allow public file access (read)
CREATE POLICY "Allow public policy file access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'policy-documents');

-- Allow users to delete their own policy files
CREATE POLICY "Allow users to delete their own policy files"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'policy-documents');

-- Allow users to update their own policy files (for renaming, etc.)
CREATE POLICY "Allow users to update their own policy files"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'policy-documents')
WITH CHECK (bucket_id = 'policy-documents');

-- =====================================================
-- CLIENT DOCUMENTS BUCKET POLICIES
-- =====================================================

-- Allow authenticated users to upload client documents
CREATE POLICY "Allow authenticated users to upload client documents"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'client-documents');

-- Allow public file access (read)
CREATE POLICY "Allow public client documents access"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'client-documents');

-- Allow users to delete their own client documents
CREATE POLICY "Allow users to delete their own client documents"
ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'client-documents');

-- Allow users to update their own client documents
CREATE POLICY "Allow users to update their own client documents"
ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'client-documents')
WITH CHECK (bucket_id = 'client-documents');

-- =====================================================
-- VERIFY POLICIES
-- =====================================================

-- Check all storage policies
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'objects'
  AND schemaname = 'storage'
ORDER BY policyname;

-- =====================================================
-- ALTERNATIVE: DISABLE RLS FOR TESTING (NOT RECOMMENDED FOR PRODUCTION)
-- =====================================================
-- If policies already exist and you're getting errors, just disable RLS:
-- This will allow all operations without policy restrictions

ALTER TABLE storage.objects DISABLE ROW LEVEL SECURITY;

-- To re-enable RLS later:
-- ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- NOTES
-- =====================================================
-- 1. Make sure buckets exist before running this script
-- 2. Buckets are created automatically by the app, or you can create manually:
--    - Go to Supabase Dashboard > Storage
--    - Create 'policy-documents' bucket (public, 10MB limit, PDF only)
--    - Create 'client-documents' bucket (public, 10MB limit, multiple file types)
-- 3. These policies allow authenticated users to upload/delete their own files
-- 4. All files are publicly readable (suitable for document sharing)
-- 5. If you need user-specific file access, modify the policies to include:
--    USING (bucket_id = 'bucket-name' AND (storage.foldername(name))[1] = auth.uid()::text)
