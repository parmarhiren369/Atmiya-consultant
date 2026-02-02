import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { localBackupService } from './localBackupService';
import { Policy } from '../types';

export interface GroupHead {
  id: string;
  userId: string;
  groupHeadName: string;
  contactNo?: string;
  emailId?: string;
  address?: string;
  relationshipType?: string;
  notes?: string;
  totalPolicies?: number;
  totalPremiumAmount?: number;
  createdAt: Date;
  updatedAt: Date;
}

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date => {
  if (!timestamp) return new Date();
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to GroupHead type
const mapDocToGroupHead = (id: string, data: Record<string, unknown>): GroupHead => ({
  id,
  userId: data.userId as string,
  groupHeadName: data.groupHeadName as string,
  contactNo: data.contactNo as string,
  emailId: data.emailId as string,
  address: data.address as string,
  relationshipType: data.relationshipType as string,
  notes: data.notes as string,
  totalPolicies: (data.totalPolicies as number) || 0,
  totalPremiumAmount: parseFloat(String(data.totalPremiumAmount || 0)),
  createdAt: toDate(data.createdAt as Timestamp | string),
  updatedAt: toDate(data.updatedAt as Timestamp | string),
});

export const groupHeadService = {
  // Get all group heads for a user - with fallback to local backup
  getGroupHeads: async (userId: string): Promise<GroupHead[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.GROUP_HEADS),
        where('userId', '==', userId),
        orderBy('groupHeadName', 'asc')
      );
      const querySnapshot = await getDocs(q);

      const groupHeads = querySnapshot.docs.map(docSnap => 
        mapDocToGroupHead(docSnap.id, docSnap.data())
      );

      // Sync to local backup
      if (groupHeads.length > 0) {
        localBackupService.syncAll('groupHeads', groupHeads).catch(() => {});
      }

      return groupHeads;
    } catch (error) {
      console.error('Error getting group heads from Firebase:', error);
      
      // Fallback to local backup
      const localData = await localBackupService.getAll<GroupHead>('groupHeads', userId);
      if (localData && localData.length > 0) {
        console.log(`📥 Loaded ${localData.length} group heads from local backup`);
        return localData.map(g => ({
          ...g,
          createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
          updatedAt: g.updatedAt ? new Date(g.updatedAt) : new Date(),
        }));
      }
      
      throw new Error('Failed to fetch group heads from both Firebase and local backup');
    }
  },

  // Get a single group head by ID
  getGroupHeadById: async (id: string): Promise<GroupHead | null> => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.GROUP_HEADS, id));

      if (!docSnap.exists()) return null;

      return mapDocToGroupHead(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error getting group head:', error);
      throw error;
    }
  },

  // Add a new group head - saves to local backup FIRST
  addGroupHead: async (groupHeadData: Omit<GroupHead, 'id' | 'createdAt' | 'updatedAt' | 'totalPolicies' | 'totalPremiumAmount'>): Promise<string> => {
    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dbData = {
      userId: groupHeadData.userId,
      groupHeadName: groupHeadData.groupHeadName,
      contactNo: groupHeadData.contactNo || null,
      emailId: groupHeadData.emailId || null,
      address: groupHeadData.address || null,
      relationshipType: groupHeadData.relationshipType || 'Primary',
      notes: groupHeadData.notes || null,
      totalPolicies: 0,
      totalPremiumAmount: 0,
      createdAt: now,
      updatedAt: now,
    };

    // Local backup FIRST
    const localBackupPromise = localBackupService.backup('groupHeads', {
      action: 'CREATE',
      data: { id: tempId, ...dbData, _tempId: true },
      userId: groupHeadData.userId,
      userName: undefined,
      timestamp: now,
    });

    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.GROUP_HEADS), dbData);

      // Update local backup with real Firebase ID
      await localBackupService.backup('groupHeads', {
        action: 'UPDATE',
        data: { id: docRef.id, ...dbData, _tempId: tempId },
        userId: groupHeadData.userId,
        userName: undefined,
        timestamp: now,
      });

      return docRef.id;
    } catch (firebaseError) {
      await localBackupPromise;
      console.error('Firebase save failed, group head saved to local backup with temp ID:', tempId);
      throw new Error('Failed to add group head to Firebase (saved locally)');
    }
  },

  // Update a group head - saves to local backup FIRST
  updateGroupHead: async (id: string, updates: Partial<GroupHead>): Promise<void> => {
    const now = new Date().toISOString();
    const updateData: { [key: string]: string | number | boolean | undefined | null | FieldValue } = {
      updatedAt: now,
    };
    
    if (updates.groupHeadName !== undefined) updateData.groupHeadName = updates.groupHeadName;
    if (updates.contactNo !== undefined) updateData.contactNo = updates.contactNo;
    if (updates.emailId !== undefined) updateData.emailId = updates.emailId;
    if (updates.address !== undefined) updateData.address = updates.address;
    if (updates.relationshipType !== undefined) updateData.relationshipType = updates.relationshipType;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    // Local backup FIRST
    const localBackupPromise = localBackupService.backup('groupHeads', {
      action: 'UPDATE',
      data: { id, ...updateData },
      userId: undefined,
      userName: undefined,
      timestamp: now,
    });

    try {
      await updateDoc(doc(db, COLLECTIONS.GROUP_HEADS, id), updateData);
      await localBackupPromise;
    } catch (firebaseError) {
      await localBackupPromise;
      console.error('Firebase update failed, group head update saved to local backup');
      throw new Error('Failed to update group head in Firebase (saved locally)');
    }
  },

  // Delete a group head - saves to local backup FIRST
  deleteGroupHead: async (id: string): Promise<void> => {
    const now = new Date().toISOString();
    
    // Local backup FIRST
    const localBackupPromise = localBackupService.backup('groupHeads', {
      action: 'DELETE',
      data: { id, deletedAt: now },
      userId: undefined,
      userName: undefined,
      timestamp: now,
    });

    try {
      await deleteDoc(doc(db, COLLECTIONS.GROUP_HEADS, id));
      await localBackupPromise;
    } catch (firebaseError) {
      await localBackupPromise;
      console.error('Firebase delete failed, group head deletion saved to local backup');
      throw new Error('Failed to delete group head from Firebase (saved locally)');
    }
  },

  // Get policies for a specific group head
  getGroupHeadPolicies: async (groupHeadId: string): Promise<Policy[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.POLICIES),
        where('memberOf', '==', groupHeadId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      })) as Policy[];
    } catch (error) {
      console.error('Error getting group head policies:', error);
      throw error;
    }
  },

  // Update group head statistics (total policies and premium amount)
  updateGroupHeadStats: async (groupHeadId: string): Promise<void> => {
    try {
      // Get all policies for this group head
      const q = query(
        collection(db, COLLECTIONS.POLICIES),
        where('memberOf', '==', groupHeadId)
      );
      const querySnapshot = await getDocs(q);

      const policies = querySnapshot.docs.map(docSnap => docSnap.data());
      const totalPolicies = policies.length;
      const totalPremiumAmount = policies.reduce((sum, policy) => {
        const amount = parseFloat(String(policy.totalPremium || policy.netPremium || policy.premiumAmount || 0));
        return sum + amount;
      }, 0);

      // Update the group head
      await updateDoc(doc(db, COLLECTIONS.GROUP_HEADS, groupHeadId), {
        totalPolicies,
        totalPremiumAmount,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating group head stats:', error);
      throw error;
    }
  },
};
