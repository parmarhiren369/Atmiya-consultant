/**
 * Local Backup Service
 * 
 * This service handles local backup of all data entries and assets.
 * It communicates with the local backup server running on port 3099.
 * 
 * Features:
 * - WRITE: Saves all data locally (independent of Firebase)
 * - READ: Can retrieve data from local backup (fallback when Firebase fails)
 * 
 * Data is stored in:
 * - local-backup/data/master/     - Complete current state of all data
 * - local-backup/data/monthly/    - Monthly log files with entries organized by date
 * - local-backup/data/assets/     - Uploaded files (PDFs, images, etc.) organized by month
 */

const LOCAL_BACKUP_URL = 'http://localhost:3099';

interface BackupPayload {
  action: 'CREATE' | 'UPDATE' | 'DELETE';
  data: Record<string, unknown>;
  userId?: string;
  userName?: string;
  timestamp: string;
}

interface BackupStats {
  master: Record<string, number>;
  monthly: string[];
  assets: {
    totalFiles: number;
    byMonth: Record<string, number>;
  };
}

interface QueryOptions {
  filters?: Record<string, unknown>;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export const localBackupService = {
  // ==================== WRITE OPERATIONS ====================

  /**
   * Backup a single data record (CREATE, UPDATE, DELETE)
   * This is called BEFORE or IN PARALLEL with Firebase operations
   * Returns true if backup succeeded, false otherwise
   */
  async backup(collection: string, payload: BackupPayload): Promise<boolean> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (response.ok) {
        console.log(`✅ Local backup: ${collection} - ${payload.action}`);
        return true;
      } else {
        console.warn(`⚠️ Local backup returned error for ${collection}`);
        return false;
      }
    } catch (error) {
      // Don't throw - local backup failure shouldn't break the main app
      console.warn('⚠️ Local backup failed (server may not be running):', error);
      return false;
    }
  },

  /**
   * Sync all records for a collection (full data sync)
   */
  async syncAll(collection: string, data: unknown[]): Promise<boolean> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/sync/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data }),
      });
      
      if (response.ok) {
        console.log(`✅ Full sync: ${collection} (${data.length} records)`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Local sync failed:', error);
      return false;
    }
  },

  // ==================== READ OPERATIONS ====================

  /**
   * Get all records from local backup
   * Used as fallback when Firebase is unavailable
   */
  async getAll<T>(collection: string, userId?: string): Promise<T[] | null> {
    try {
      let url = `${LOCAL_BACKUP_URL}/backup/read/${collection}`;
      if (userId) {
        url += `?userId=${encodeURIComponent(userId)}`;
      }
      
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Read from local backup: ${collection} (${data.length} records)`);
        return data as T[];
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Local backup read failed:', error);
      return null;
    }
  },

  /**
   * Get single record by ID from local backup
   */
  async getById<T>(collection: string, id: string): Promise<T | null> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/read/${collection}/${id}`);
      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Read from local backup: ${collection}/${id}`);
        return data as T;
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Local backup read failed:', error);
      return null;
    }
  },

  /**
   * Query records with filters and sorting
   */
  async query<T>(collection: string, options: QueryOptions): Promise<T[] | null> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/query/${collection}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log(`📥 Query from local backup: ${collection} (${data.length} results)`);
        return data as T[];
      }
      return null;
    } catch (error) {
      console.warn('⚠️ Local backup query failed:', error);
      return null;
    }
  },

  // ==================== FILE OPERATIONS ====================

  /**
   * Backup a single file (PDF, image, document, etc.)
   */
  async backupFile(collection: string, recordId: string, file: File): Promise<boolean> {
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/asset/${collection}/${recordId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        console.log(`✅ Asset backup: ${file.name}`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Asset backup failed:', error);
      return false;
    }
  },

  /**
   * Backup multiple files at once
   */
  async backupFiles(collection: string, recordId: string, files: File[]): Promise<boolean> {
    try {
      const formData = new FormData();
      files.forEach(file => formData.append('files', file));
      
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/assets/${collection}/${recordId}`, {
        method: 'POST',
        body: formData,
      });
      
      if (response.ok) {
        console.log(`✅ Assets backup: ${files.length} files`);
        return true;
      }
      return false;
    } catch (error) {
      console.warn('⚠️ Assets backup failed:', error);
      return false;
    }
  },

  /**
   * Backup file from URL (for files already uploaded to Firebase Storage)
   * Downloads the file and re-uploads to local backup
   */
  async backupFileFromUrl(collection: string, recordId: string, url: string, filename: string): Promise<boolean> {
    try {
      // Fetch the file from URL
      const response = await fetch(url);
      if (!response.ok) {
        console.warn('⚠️ Could not fetch file from URL for backup');
        return false;
      }
      
      const blob = await response.blob();
      const file = new File([blob], filename, { type: blob.type });
      
      return await this.backupFile(collection, recordId, file);
    } catch (error) {
      console.warn('⚠️ File URL backup failed:', error);
      return false;
    }
  },

  // ==================== UTILITY OPERATIONS ====================

  /**
   * Check if backup server is running
   */
  async isServerRunning(): Promise<boolean> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  },

  /**
   * Get backup statistics
   */
  async getStats(): Promise<BackupStats | null> {
    try {
      const response = await fetch(`${LOCAL_BACKUP_URL}/backup/stats`);
      if (response.ok) {
        return await response.json();
      }
      return null;
    } catch {
      return null;
    }
  },

  /**
   * Helper to create backup payload
   */
  createPayload(
    action: 'CREATE' | 'UPDATE' | 'DELETE',
    data: Record<string, unknown>,
    userId?: string,
    userName?: string
  ): BackupPayload {
    return {
      action,
      data,
      userId,
      userName,
      timestamp: new Date().toISOString(),
    };
  },
};

export default localBackupService;
