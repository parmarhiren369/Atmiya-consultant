import { supabase } from '../config/supabase';
import toast from 'react-hot-toast';

const CLIENT_DOCS_BUCKET = 'client-documents'; // Single bucket for all documents (policy PDFs and client docs)

/**
 * Storage Service for handling PDF uploads to Supabase
 */
export const storageService = {
  /**
   * Initialize the storage bucket (create if doesn't exist)
   * Single bucket for all documents (policy PDFs and client documents)
   */
  async initializeBucket() {
    try {
      // Check if bucket exists
      const { data: buckets, error: listError } = await supabase.storage.listBuckets();
      
      if (listError) {
        console.error('Error listing buckets:', listError);
        return false;
      }

      // Initialize client documents bucket (used for all documents)
      const bucketExists = buckets?.some(bucket => bucket.name === CLIENT_DOCS_BUCKET);
      if (!bucketExists) {
        const { error: createError } = await supabase.storage.createBucket(CLIENT_DOCS_BUCKET, {
          public: true,
          fileSizeLimit: 10485760, // 10MB limit
          allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
        });

        if (createError) {
          console.error('Error creating client documents bucket:', createError);
        } else {
          console.log(`✅ Bucket '${CLIENT_DOCS_BUCKET}' created successfully`);
        }
      }

      return true;
    } catch (error) {
      console.error('Error initializing bucket:', error);
      return false;
    }
  },

  /**
   * Upload a PDF file to Supabase storage (now uses client-documents bucket)
   * @param file The PDF file to upload
   * @param userId User ID for organizing files
   * @param clientName Optional client name for folder organization
   * @param clientId Optional unique identifier
   * @returns The public URL of the uploaded file or null if failed
   */
  async uploadPDF(file: File, userId: string, clientName?: string, clientId?: string): Promise<{ url: string; path: string } | null> {
    try {
      // Validate file type
      if (file.type !== 'application/pdf') {
        toast.error('Only PDF files are allowed');
        return null;
      }

      // Validate file size (10MB limit)
      if (file.size > 10485760) {
        toast.error('File size must be less than 10MB');
        return null;
      }

      // Generate unique filename with optional client folder
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      
      let filePath: string;
      if (clientName && clientId) {
        const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
        const folderName = `${clientId}_${sanitizedClientName}`;
        filePath = `${userId}/${folderName}/${timestamp}_${sanitizedFileName}`;
      } else {
        filePath = `${userId}/${timestamp}_${sanitizedFileName}`;
      }

      // Upload file to client-documents bucket
      const { error } = await supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading file:', error);
        toast.error(`Upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error in uploadPDF:', error);
      toast.error('Failed to upload file');
      return null;
    }
  },

  /**
   * Upload multiple PDF files
   * @param files Array of PDF files to upload
   * @param userId User ID for organizing files
   * @returns Array of upload results
   */
  async uploadMultiplePDFs(files: File[], userId: string): Promise<Array<{ url: string; path: string; fileName: string } | null>> {
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadPDF(file, userId);
      if (result) {
        return { ...result, fileName: file.name };
      }
      return null;
    });

    return Promise.all(uploadPromises);
  },

  /**
   * Delete a file from Supabase storage
   * @param filePath The path of the file to delete
   * @returns True if successful, false otherwise
   */
  async deleteFile(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting file:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteFile:', error);
      return false;
    }
  },

  /**
   * Get a signed URL for a private file (valid for 1 hour)
   * @param filePath The path of the file
   * @returns The signed URL or null if failed
   */
  async getSignedUrl(filePath: string): Promise<string | null> {
    try {
      const { data, error } = await supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .createSignedUrl(filePath, 3600); // 1 hour

      if (error) {
        console.error('Error creating signed URL:', error);
        return null;
      }

      return data.signedUrl;
    } catch (error) {
      console.error('Error in getSignedUrl:', error);
      return null;
    }
  },

  /**
   * Get public URL for a file
   * @param filePath The path of the file
   * @returns The public URL
   */
  getPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(CLIENT_DOCS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * Upload a client document to Supabase storage
   * @param file The file to upload (PDF, images, Word docs)
   * @param userId User ID for organizing files
   * @param clientName Client/Policyholder name for organizing files
   * @param clientId Unique client identifier (policy ID) to prevent duplicate name conflicts
   * @returns The public URL of the uploaded file or null if failed
   */
  async uploadClientDocument(file: File, userId: string, clientName?: string, clientId?: string): Promise<{ url: string; path: string } | null> {
    try {
      // Validate file type
      const allowedTypes = [
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/jpg',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        toast.error('File type not supported. Allowed: PDF, JPG, PNG, DOC, DOCX');
        return null;
      }

      // Validate file size (10MB limit)
      if (file.size > 10485760) {
        toast.error('File size must be less than 10MB');
        return null;
      }

      // Generate unique filename with client folder structure
      // Use clientId_clientName format to ensure uniqueness even with duplicate names
      const timestamp = Date.now();
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const sanitizedClientName = clientName 
        ? clientName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : 'general';
      const folderName = clientId 
        ? `${clientId}_${sanitizedClientName}`
        : sanitizedClientName;
      const filePath = `${userId}/${folderName}/${timestamp}_${sanitizedFileName}`;

      // Upload file to client documents bucket
      const { error } = await supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Error uploading client document:', error);
        toast.error(`Upload failed: ${error.message}`);
        return null;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .getPublicUrl(filePath);

      return {
        url: urlData.publicUrl,
        path: filePath
      };
    } catch (error) {
      console.error('Error in uploadClientDocument:', error);
      toast.error('Failed to upload file');
      return null;
    }
  },

  /**
   * Upload multiple client documents
   * @param files Array of files to upload
   * @param userId User ID for organizing files
   * @param clientName Client/Policyholder name for organizing files
   * @param clientId Unique client identifier (policy ID)
   * @returns Array of upload results
   */
  async uploadMultipleClientDocuments(files: File[], userId: string, clientName?: string, clientId?: string): Promise<Array<{ url: string; path: string; fileName: string } | null>> {
    const uploadPromises = files.map(async (file) => {
      const result = await this.uploadClientDocument(file, userId, clientName, clientId);
      if (result) {
        return { ...result, fileName: file.name };
      }
      return null;
    });

    return Promise.all(uploadPromises);
  },

  /**
   * Delete a client document from Supabase storage
   * @param filePath The path of the file to delete
   * @returns True if successful, false otherwise
   */
  async deleteClientDocument(filePath: string): Promise<boolean> {
    try {
      const { error } = await supabase.storage
        .from(CLIENT_DOCS_BUCKET)
        .remove([filePath]);

      if (error) {
        console.error('Error deleting client document:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteClientDocument:', error);
      return false;
    }
  },

  /**
   * Get public URL for a client document
   * @param filePath The path of the file
   * @returns The public URL
   */
  getClientDocumentPublicUrl(filePath: string): string {
    const { data } = supabase.storage
      .from(CLIENT_DOCS_BUCKET)
      .getPublicUrl(filePath);

    return data.publicUrl;
  },

  /**
   * List all files in a user's folder
   * @param userId User ID
   * @param bucketName Bucket name (client-documents or policy-documents)
   * @param clientName Optional client name to filter files by specific customer
   * @param clientId Optional client ID to ensure uniqueness
   * @returns Array of files with metadata
   */
  async listUserFiles(userId: string, bucketName: string = CLIENT_DOCS_BUCKET, clientName?: string, clientId?: string): Promise<Array<{
    name: string;
    path: string;
    url: string;
    size: number;
    created_at: string;
  }>> {
    try {
      const sanitizedClientName = clientName 
        ? clientName.replace(/[^a-zA-Z0-9]/g, '_').toLowerCase()
        : null;
      
      const folderName = clientId && sanitizedClientName
        ? `${clientId}_${sanitizedClientName}`
        : sanitizedClientName;

      const folderPath = folderName 
        ? `${userId}/${folderName}`
        : userId;

      const { data, error } = await supabase.storage
        .from(bucketName)
        .list(folderPath, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (error) {
        console.error('Error listing files:', error);
        return [];
      }

      if (!data || data.length === 0) {
        return [];
      }

      // Get public URLs for all files
      return data
        .filter(file => file.name !== '.emptyFolderPlaceholder') // Filter out placeholder files
        .map(file => {
          const filePath = folderName 
            ? `${userId}/${folderName}/${file.name}`
            : `${userId}/${file.name}`;
          const { data: urlData } = supabase.storage
            .from(bucketName)
            .getPublicUrl(filePath);

          return {
            name: file.name,
            path: filePath,
            url: urlData.publicUrl,
            size: file.metadata?.size || 0,
            created_at: file.created_at || new Date().toISOString()
          };
        });
    } catch (error) {
      console.error('Error in listUserFiles:', error);
      return [];
    }
  }
};

export default storageService;
