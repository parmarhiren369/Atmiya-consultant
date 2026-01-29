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
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';

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
  // Get all group heads for a user
  getGroupHeads: async (userId: string): Promise<GroupHead[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.GROUP_HEADS),
        where('userId', '==', userId),
        orderBy('groupHeadName', 'asc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToGroupHead(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error getting group heads:', error);
      throw error;
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

  // Add a new group head
  addGroupHead: async (groupHeadData: Omit<GroupHead, 'id' | 'createdAt' | 'updatedAt' | 'totalPolicies' | 'totalPremiumAmount'>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      const docRef = await addDoc(collection(db, COLLECTIONS.GROUP_HEADS), {
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
      });

      return docRef.id;
    } catch (error) {
      console.error('Error adding group head:', error);
      throw error;
    }
  },

  // Update a group head
  updateGroupHead: async (id: string, updates: Partial<GroupHead>): Promise<void> => {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date().toISOString(),
      };
      
      if (updates.groupHeadName !== undefined) updateData.groupHeadName = updates.groupHeadName;
      if (updates.contactNo !== undefined) updateData.contactNo = updates.contactNo;
      if (updates.emailId !== undefined) updateData.emailId = updates.emailId;
      if (updates.address !== undefined) updateData.address = updates.address;
      if (updates.relationshipType !== undefined) updateData.relationshipType = updates.relationshipType;
      if (updates.notes !== undefined) updateData.notes = updates.notes;

      await updateDoc(doc(db, COLLECTIONS.GROUP_HEADS, id), updateData);
    } catch (error) {
      console.error('Error updating group head:', error);
      throw error;
    }
  },

  // Delete a group head
  deleteGroupHead: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.GROUP_HEADS, id));
    } catch (error) {
      console.error('Error deleting group head:', error);
      throw error;
    }
  },

  // Get policies for a specific group head
  getGroupHeadPolicies: async (groupHeadId: string) => {
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
      }));
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
