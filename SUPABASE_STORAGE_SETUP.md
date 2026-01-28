# Supabase Storage Setup Instructions

## Overview
The application now uses Supabase Storage for direct file uploads instead of Google Drive links. This document explains the storage bucket setup.

## Storage Buckets

The application uses two separate storage buckets:

1. **policy-documents**: For policy PDF files
2. **client-documents**: For client-related documents (PDFs, images, Word docs)

## Automatic Bucket Creation
The storage service will automatically create both buckets when the AddPolicy page loads. However, you may need to configure permissions in Supabase.

## Manual Setup (If Needed)

### 1. Access Supabase Dashboard
- Go to your Supabase project dashboard
- Navigate to Storage section

### 2. Verify Bucket Creation
Check if both buckets exist:

#### Policy Documents Bucket
- Name: `policy-documents`
- Public: Yes
- File size limit: 10MB
- Allowed MIME types: `application/pdf`

#### Client Documents Bucket
- Name: `client-documents`
- Public: Yes
- File size limit: 10MB
- Allowed MIME types: 
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/jpg`
  - `application/msword`
  - `application/vnd.openxmlformats-officedocument.wordprocessingml.document`

### 3. Configure Storage Policies (Important!)

Add the following RLS policies for both buckets:

#### Policy Documents Bucket Policies

```sql
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
```

#### Client Documents Bucket Policies

```sql
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
```

### Alternative: Disable RLS for Testing
If you want to quickly test without setting up policies:
1. Go to Storage > Configuration
2. Find both `policy-documents` and `client-documents` buckets
3. Disable RLS (Row Level Security) temporarily for each
   
**Note:** Only do this for testing. Always enable RLS in production.

## Features Implemented

### 1. Policy Documents Upload
- **Drag and drop** PDF files for policy documents
- **Multiple files supported** (up to 10 files, 10MB each)
- **Visual feedback** during drag operation
- **File management** - view and remove uploaded files
- **AI extraction** works with uploaded PDFs

### 2. Client Documents Upload
- **Drag and drop** various document types (PDF, JPG, PNG, DOC, DOCX)
- **Multiple files supported** (up to 10 files, 10MB each)
- **Separate storage** from policy documents
- **User-specific folders** - each user has their own folder
- **File management** - view and remove uploaded documents

### 3. Browse and Select
- Traditional file picker as alternative to drag-and-drop
- Multiple file selection supported for both buckets

### 4. Storage Structure

#### Policy Documents Structure
Files are organized by user ID:
```
policy-documents/
├── user_id_1/
│   ├── timestamp_policy1.pdf
│   └── timestamp_policy2.pdf
├── user_id_2/
│   └── timestamp_policy1.pdf
```

#### Client Documents Structure
Files are organized by user ID:
```
client-documents/
├── user_id_1/
│   ├── timestamp_invoice.pdf
│   ├── timestamp_photo.jpg
│   └── timestamp_agreement.docx
├── user_id_2/
│   ├── timestamp_document.pdf
│   └── timestamp_image.png
```

Each user's documents are completely isolated in their own folder.

## Database Integration

The policy documents are stored with the following fields in the database:
- `pdfFileName`: Name of the uploaded file
- `driveFileUrl`: Public URL from Supabase Storage (replaces Google Drive URL)
- `fileId`: Storage path for the file (replaces Google Drive file ID)

These fields maintain backward compatibility with existing code.

## Testing the Feature

1. **Upload a PDF:**
   - Go to Add Policy page
   - Drag a PDF or click Browse Files
   - Verify file appears in the uploaded list

2. **View the uploaded file:**
   - Click the "View" link next to uploaded file
   - PDF should open in a new tab

3. **Remove a file:**
   - Click the X button next to an uploaded file
   - File should be removed from Supabase Storage

4. **Submit the form:**
   - Fill required fields (Policyholder Name, Product Type)
   - Submit the form
   - Verify policy is saved with PDF URL

## Troubleshooting

### "Failed to upload file" Error
- Check Supabase Storage policies are set correctly
- Verify the bucket exists and is public
- Check file size is under 10MB
- Ensure file is a PDF

### "Permission denied" Error
- Enable storage policies as described above
- Or temporarily disable RLS for testing

### Files not appearing after upload
- Check browser console for errors
- Verify Supabase credentials in .env file
- Check network tab for failed requests

## Migration from Google Drive

If you have existing policies with Google Drive links, they will continue to work. The new drag-and-drop feature coexists with the optional Google Drive folder link field.

To migrate:
1. Re-upload PDFs using the new drag-and-drop feature
2. The old `pdfLink` field has been removed, but `driveFileUrl` now stores Supabase URLs

## Security Considerations

1. **File Validation:**
   - Only PDF files are accepted
   - Maximum file size: 10MB
   - File type validation on both client and server

2. **Access Control:**
   - Files organized by user ID
   - Public read access (configurable)
   - Only authenticated users can upload

3. **URL Security:**
   - Public URLs are generated for easy access
   - Consider using signed URLs for sensitive documents (feature available in storageService)

## API Reference

The storage service provides the following methods:

### Policy Documents Methods

```typescript
// Initialize storage buckets
await storageService.initializeBucket();

// Upload single policy PDF
const result = await storageService.uploadPDF(file, userId);
// Returns: { url: string, path: string } | null

// Upload multiple policy PDFs
const results = await storageService.uploadMultiplePDFs(files, userId);
// Returns: Array<{ url: string, path: string, fileName: string } | null>

// Delete policy file
const success = await storageService.deleteFile(filePath);
// Returns: boolean

// Get signed URL (private files)
const url = await storageService.getSignedUrl(filePath);
// Returns: string | null

// Get public URL for policy document
const url = storageService.getPublicUrl(filePath);
// Returns: string
```

### Client Documents Methods

```typescript
// Upload single client document
const result = await storageService.uploadClientDocument(file, userId);
// Returns: { url: string, path: string } | null
// Accepts: PDF, JPG, PNG, DOC, DOCX

// Upload multiple client documents
const results = await storageService.uploadMultipleClientDocuments(files, userId);
// Returns: Array<{ url: string, path: string, fileName: string } | null>

// Delete client document
const success = await storageService.deleteClientDocument(filePath);
// Returns: boolean

// Get public URL for client document
const url = storageService.getClientDocumentPublicUrl(filePath);
// Returns: string
```

## Next Steps

1. Set up Supabase Storage policies
2. Test file upload functionality
3. Consider implementing file versioning
4. Add file preview capability
5. Implement batch delete for cleanup
