import { 
  ref, 
  uploadBytes, 
  getDownloadURL, 
  deleteObject, 
  listAll,
  getMetadata 
} from 'firebase/storage';
import { storage } from '../config/firebase';

interface FileMetadata {
  name: string;
  size: number;
  contentType: string;
  timeCreated: string;
  updated: string;
  fullPath: string;
}

interface UploadedFile {
  name: string;
  url: string;
  path: string;
}

export const storageService = {
  /**
   * Upload a file to Firebase Storage
   * @param file The file to upload
   * @param userId The user's ID
   * @param bucket The storage bucket/folder (e.g., 'policy-documents', 'client-documents')
   * @param subfolder Optional subfolder path
   * @returns The uploaded file info with URL
   */
  uploadFile: async (
    file: File,
    userId: string,
    bucket: string = 'documents',
    subfolder?: string
  ): Promise<UploadedFile> => {
    try {
      // Create a unique filename
      const timestamp = Date.now();
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
      const fileName = `${timestamp}_${sanitizedName}`;
      
      // Build the storage path
      let storagePath = `${userId}/${bucket}`;
      if (subfolder) {
        storagePath += `/${subfolder}`;
      }
      storagePath += `/${fileName}`;

      // Create a reference to the file location
      const fileRef = ref(storage, storagePath);

      // Upload the file
      const snapshot = await uploadBytes(fileRef, file, {
        contentType: file.type,
        customMetadata: {
          originalName: file.name,
          uploadedAt: new Date().toISOString(),
        },
      });

      // Get the download URL
      const downloadURL = await getDownloadURL(snapshot.ref);

      console.log(`File uploaded successfully: ${storagePath}`);

      return {
        name: file.name,
        url: downloadURL,
        path: storagePath,
      };
    } catch (error) {
      console.error('Error uploading file:', error);
      throw new Error('Failed to upload file');
    }
  },

  /**
   * Upload a policy document
   */
  uploadPolicyDocument: async (
    file: File,
    userId: string,
    policyholderName: string,
    policyNumber: string
  ): Promise<UploadedFile> => {
    const sanitizedName = policyholderName.replace(/[^a-zA-Z0-9]/g, '_');
    const subfolder = `${sanitizedName}/${policyNumber}`;
    return storageService.uploadFile(file, userId, 'policy-documents', subfolder);
  },

  /**
   * Get public URL for a file
   */
  getPublicUrl: async (filePath: string): Promise<string> => {
    try {
      const fileRef = ref(storage, filePath);
      return await getDownloadURL(fileRef);
    } catch (error) {
      console.error('Error getting public URL:', error);
      throw new Error('Failed to get file URL');
    }
  },

  /**
   * Delete a file from storage
   */
  deleteFile: async (filePath: string): Promise<void> => {
    try {
      const fileRef = ref(storage, filePath);
      await deleteObject(fileRef);
      console.log(`File deleted successfully: ${filePath}`);
    } catch (error) {
      console.error('Error deleting file:', error);
      throw new Error('Failed to delete file');
    }
  },

  /**
   * Delete multiple files from storage
   */
  deleteFiles: async (filePaths: string[]): Promise<void> => {
    try {
      const deletePromises = filePaths.map(path => {
        const fileRef = ref(storage, path);
        return deleteObject(fileRef).catch(err => {
          console.warn(`Failed to delete file ${path}:`, err);
        });
      });

      await Promise.all(deletePromises);
      console.log(`${filePaths.length} files deleted successfully`);
    } catch (error) {
      console.error('Error deleting files:', error);
      throw new Error('Failed to delete files');
    }
  },

  /**
   * List all files in a folder
   */
  listFiles: async (folderPath: string): Promise<FileMetadata[]> => {
    try {
      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);

      const fileMetadataPromises = result.items.map(async (itemRef) => {
        const metadata = await getMetadata(itemRef);
        return {
          name: metadata.name,
          size: metadata.size,
          contentType: metadata.contentType || 'application/octet-stream',
          timeCreated: metadata.timeCreated,
          updated: metadata.updated,
          fullPath: metadata.fullPath,
        };
      });

      return Promise.all(fileMetadataPromises);
    } catch (error) {
      console.error('Error listing files:', error);
      throw new Error('Failed to list files');
    }
  },

  /**
   * List user's files in a specific bucket
   */
  listUserFiles: async (
    userId: string,
    bucket: string = 'documents',
    policyholderName?: string,
    policyNumber?: string
  ): Promise<{ name: string; url: string; path: string }[]> => {
    try {
      let folderPath = `${userId}/${bucket}`;
      
      if (policyholderName) {
        const sanitizedName = policyholderName.replace(/[^a-zA-Z0-9]/g, '_');
        folderPath += `/${sanitizedName}`;
        
        if (policyNumber) {
          folderPath += `/${policyNumber}`;
        }
      }

      const folderRef = ref(storage, folderPath);
      const result = await listAll(folderRef);

      const filesPromises = result.items.map(async (itemRef) => {
        const url = await getDownloadURL(itemRef);
        const metadata = await getMetadata(itemRef);
        return {
          name: metadata.customMetadata?.originalName || metadata.name,
          url,
          path: metadata.fullPath,
        };
      });

      return Promise.all(filesPromises);
    } catch (error) {
      console.error('Error listing user files:', error);
      // Return empty array instead of throwing - folder might not exist yet
      return [];
    }
  },

  /**
   * Upload client document
   */
  uploadClientDocument: async (
    file: File,
    userId: string,
    clientName: string,
    policyNumber: string
  ): Promise<UploadedFile> => {
    const sanitizedClientName = clientName.replace(/[^a-zA-Z0-9]/g, '_');
    const subfolder = `${sanitizedClientName}/${policyNumber}`;
    return storageService.uploadFile(file, userId, 'client-documents', subfolder);
  },

  /**
   * Get file metadata
   */
  getFileMetadata: async (filePath: string): Promise<FileMetadata | null> => {
    try {
      const fileRef = ref(storage, filePath);
      const metadata = await getMetadata(fileRef);
      
      return {
        name: metadata.name,
        size: metadata.size,
        contentType: metadata.contentType || 'application/octet-stream',
        timeCreated: metadata.timeCreated,
        updated: metadata.updated,
        fullPath: metadata.fullPath,
      };
    } catch (error) {
      console.error('Error getting file metadata:', error);
      return null;
    }
  },
};
