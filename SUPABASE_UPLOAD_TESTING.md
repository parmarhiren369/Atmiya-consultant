# Supabase Document Upload - Testing Guide

## Overview
This guide helps you test the newly implemented Supabase document upload functionality for:
1. **Client Folders** - Upload customer documents (PDF, JPG, PNG, DOC, DOCX)
2. **Add Policy** - Upload policy PDFs and client documents

---

## Prerequisites

### 1. Run Storage Policy Setup
First, set up the storage policies in Supabase:

```bash
# Open Supabase SQL Editor and run:
SETUP_SUPABASE_STORAGE_POLICIES.sql
```

This will:
- Create policies for `policy-documents` bucket
- Create policies for `client-documents` bucket
- Allow authenticated users to upload/delete files
- Allow public read access to uploaded files

### 2. Verify Buckets Exist
The app will auto-create buckets on first load, but you can verify:

1. Go to **Supabase Dashboard** → **Storage**
2. Check for these buckets:
   - `policy-documents` (for policy PDFs)
   - `client-documents` (for customer documents)

If they don't exist, they'll be created automatically when you visit the Add Policy page.

---

## Test 1: Upload Documents in Client Folders

### Steps:
1. **Navigate to Client Folders**
   - Click "Client Folders" in the sidebar
   - You should see all client folders (each representing a policy)

2. **Select a Client**
   - Each client card now has an **"Upload Documents"** button at the top
   - Click this button on any client

3. **Upload Files**
   - A modal will open: "Upload Documents"
   - Click the upload area or drag files
   - Select multiple files (PDF, JPG, PNG, DOC, DOCX)
   - Maximum 10MB per file

4. **Review Selected Files**
   - Files appear in a list with name and size
   - Click the X button to remove any file
   - Click **"Upload X file(s)"** button

5. **Verify Upload**
   - You should see "Successfully uploaded X file(s)" toast
   - Modal closes automatically
   - Document count updates on the client card

### Expected File Structure in Supabase:
```
client-documents/
  └── {userId}/
      └── {timestamp}_{sanitized_filename}.pdf
      └── {timestamp}_{sanitized_filename}.jpg
      └── {timestamp}_{sanitized_filename}.docx
```

---

## Test 2: Upload Policy PDFs in Add Policy

### Steps:
1. **Navigate to Add Policy**
   - Click "Add Policy" in the sidebar
   - The page initializes Supabase buckets automatically

2. **Fill Policy Form**
   - Enter policy details (name, number, company, etc.)

3. **Upload Policy PDF**
   - Scroll to "Policy Document" section
   - Click upload area or drag PDF files
   - Select one or more policy PDFs
   - Files appear in the list

4. **Upload Client Documents (Optional)**
   - Scroll to "Client Documents" section
   - Click upload area or drag documents
   - Select any supported file types (PDF, JPG, PNG, DOC, DOCX)
   - Files appear in the list

5. **Save Policy**
   - Click "Save Policy" button
   - Files upload to Supabase automatically
   - Policy saves with file URLs

### Expected File Structure in Supabase:
```
policy-documents/
  └── {userId}/
      └── {timestamp}_policy_document.pdf

client-documents/
  └── {userId}/
      └── {timestamp}_aadhar_card.jpg
      └── {timestamp}_license.pdf
```

---

## Test 3: Verify Uploaded Files in Supabase

### View Files in Dashboard:
1. Go to **Supabase Dashboard** → **Storage**
2. Click on **policy-documents** bucket
3. Navigate to your user folder: `{userId}/`
4. See all uploaded policy PDFs

5. Click on **client-documents** bucket
6. Navigate to your user folder: `{userId}/`
7. See all uploaded client documents

### Get Public URLs:
- Each file has a public URL
- Format: `https://your-project.supabase.co/storage/v1/object/public/bucket-name/userId/filename`
- These URLs are stored in the database with the policy

---

## Test 4: Delete Files

### In Add Policy:
1. Open Add Policy page
2. Upload some files
3. Before saving, click the trash icon on any uploaded file
4. File should be removed from the list
5. After saving the policy, files can be deleted from the policy list

### Expected Behavior:
- Files are deleted from Supabase storage
- Database records are updated to remove file references

---

## Troubleshooting

### Issue: "Upload failed: Permission denied"
**Solution:** Run the storage policy setup SQL script
```sql
-- In Supabase SQL Editor
SETUP_SUPABASE_STORAGE_POLICIES.sql
```

### Issue: Bucket doesn't exist
**Solution:** 
1. Visit Add Policy page (buckets auto-create)
2. Or manually create in Supabase Dashboard:
   - Storage → New Bucket
   - Name: `policy-documents` or `client-documents`
   - Public: Yes
   - File size limit: 10MB

### Issue: "File size must be less than 10MB"
**Solution:** 
- Compress files or split into smaller files
- Or increase bucket size limit in Supabase Dashboard

### Issue: "File type not supported"
**Solution:** Check allowed file types:
- **Policy PDFs:** Only PDF files
- **Client Documents:** PDF, JPG, PNG, DOC, DOCX

---

## File Type Support

### Client Documents (client-documents bucket):
- ✅ PDF (application/pdf)
- ✅ JPEG (image/jpeg)
- ✅ PNG (image/png)
- ✅ JPG (image/jpg)
- ✅ Word 97-2003 (application/msword)
- ✅ Word 2007+ (application/vnd.openxmlformats-officedocument.wordprocessingml.document)

### Policy PDFs (policy-documents bucket):
- ✅ PDF only (application/pdf)

---

## Security Notes

### Current Setup:
- ✅ Authenticated users can upload files
- ✅ All files are publicly readable (good for sharing)
- ✅ Users can delete their own files
- ✅ Files are organized by userId in folders

### For Enhanced Security (Optional):
If you want user-specific file access only, modify the policies:

```sql
-- Restrict read access to file owner only
CREATE POLICY "Users can only read their own files"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'client-documents' 
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Success Criteria

### ✅ Client Folders Upload:
- Upload button appears on each client card
- Modal opens with file selector
- Multiple files can be selected
- Files upload successfully
- Success toast appears
- Document count updates

### ✅ Add Policy Upload:
- Policy PDF section accepts PDFs
- Client documents section accepts multiple file types
- Files appear in the list
- Files can be removed before saving
- Policy saves with file URLs
- Files are accessible via public URLs

### ✅ Supabase Storage:
- Buckets exist and are public
- Storage policies allow uploads
- Files are organized by userId
- Public URLs are accessible
- File size limits are enforced

---

## Next Steps

After successful testing:
1. ✅ Document upload works in Client Folders
2. ✅ Document upload works in Add Policy
3. ✅ Files are stored in Supabase Storage
4. ✅ Public URLs are generated and accessible

You can now:
- Upload policy PDFs when creating policies
- Upload customer documents for each client
- Access files via public URLs
- Share document links with clients
- Manage files in Supabase Dashboard

---

## Questions?

If you encounter any issues:
1. Check Supabase Storage policies are set up
2. Verify buckets exist
3. Check console for error messages
4. Ensure files are under 10MB
5. Verify file types are supported
