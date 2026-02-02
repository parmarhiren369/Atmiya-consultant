import { 
  collection, 
  getDocs, 
  addDoc, 
  query, 
  where, 
  orderBy,
  limit as firestoreLimit,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';

export interface ActivityLog {
  id: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PERMANENT_DELETE' | 'MARK_LAPSED' | 'REACTIVATE' | 'EXPORT' | 'IMPORT' | 'VIEW';
  policyId?: string;
  policyNumber?: string;
  policyholderName?: string;
  description: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

export const activityLogService = {
  // Create a new activity log
  createActivityLog: async (
    action: ActivityLog['action'],
    policyId?: string,
    policyholderName?: string,
    description?: string,
    userId?: string,
    userDisplayName?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<string> => {
    try {
      const metadata: Record<string, unknown> = {};
      if (oldData) metadata.oldData = oldData;
      if (newData) metadata.newData = newData;

      const logData = {
        userId: userId || null,
        action,
        policyId: policyId || null,
        policyholderName: policyholderName || null,
        description: description || `${action} action performed`,
        performedBy: userId || null,
        performedByName: userDisplayName || null,
        metadata: Object.keys(metadata).length > 0 ? metadata : null,
        createdAt: new Date().toISOString(),
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.ACTIVITY_LOGS), logData);
      return docRef.id;
    } catch (error) {
      console.error('Error creating activity log:', error);
      // Don't throw - activity logs are not critical
      return '';
    }
  },

  // Get activity logs (optionally limited and filtered by userId)
  getActivityLogs: async (limit?: number, userId?: string): Promise<ActivityLog[]> => {
    try {
      let q;
      
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.ACTIVITY_LOGS),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc'),
          ...(limit ? [firestoreLimit(limit)] : [])
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.ACTIVITY_LOGS),
          orderBy('createdAt', 'desc'),
          ...(limit ? [firestoreLimit(limit)] : [])
        );
      }

      const querySnapshot = await getDocs(q);

      const activityLogs: ActivityLog[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          action: data.action,
          policyId: data.policyId,
          policyNumber: data.policyNumber,
          policyholderName: data.policyholderName,
          description: data.description,
          performedBy: data.performedBy,
          performedByName: data.performedByName,
          createdAt: toDate(data.createdAt),
          metadata: data.metadata,
        };
      });

      return activityLogs;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw new Error('Failed to fetch activity logs');
    }
  },

  // Get activity logs for a specific policy
  getPolicyActivityLogs: async (policyId: string): Promise<ActivityLog[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.ACTIVITY_LOGS),
        where('policyId', '==', policyId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      const activityLogs: ActivityLog[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          action: data.action,
          policyId: data.policyId,
          policyNumber: data.policyNumber,
          policyholderName: data.policyholderName,
          description: data.description,
          performedBy: data.performedBy,
          performedByName: data.performedByName,
          createdAt: toDate(data.createdAt),
          metadata: data.metadata,
        };
      });

      return activityLogs;
    } catch (error) {
      console.error('Error getting policy activity logs:', error);
      throw new Error('Failed to fetch policy activity logs');
    }
  },
};
