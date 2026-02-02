import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  deleteDoc, 
  query, 
  where, 
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { DeletedPolicy } from '../types';
import { activityLogService } from './activityLogService';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to safely convert Date or string to ISO string
const toISOStringSafe = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return date;
};

// Helper to map Firestore data to DeletedPolicy type
const mapDocToDeletedPolicy = (id: string, data: Record<string, unknown>): DeletedPolicy => ({
  id,
  userId: data.userId as string,
  policyholderName: data.policyholderName as string,
  contactNo: data.contactNo as string,
  emailId: data.emailId as string,
  address: data.address as string,
  policyNumber: data.policyNumber as string,
  insuranceCompany: data.insuranceCompany as string,
  policyType: data.policyType as string,
  premiumAmount: data.premiumAmount as number,
  coverageAmount: data.coverageAmount as number,
  policyStartDate: toDate(data.policyStartDate as Timestamp | string),
  policyEndDate: toDate(data.policyEndDate as Timestamp | string),
  premiumDueDate: toDate(data.premiumDueDate as Timestamp | string),
  status: data.status as string,
  paymentFrequency: data.paymentFrequency as string,
  nomineeName: data.nomineeName as string,
  nomineeRelationship: data.nomineeRelationship as string,
  notes: data.notes as string,
  documents: (data.documents as string[]) || [],
  deletedAt: toDate(data.deletedAt as Timestamp | string) || new Date(),
  deletedBy: data.deletedBy as string,
  createdAt: toDate(data.createdAt as Timestamp | string) || new Date(),
  updatedAt: toDate(data.updatedAt as Timestamp | string) || new Date(),
});

export const deletedPolicyService = {
  // Get all deleted policies (optionally filtered by userId)
  getDeletedPolicies: async (userId?: string): Promise<DeletedPolicy[]> => {
    try {
      // Use simple query without orderBy to avoid requiring composite indexes
      // Sorting is done in memory after fetching
      let q;
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.DELETED_POLICIES),
          where('userId', '==', userId)
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.DELETED_POLICIES)
        );
      }

      const querySnapshot = await getDocs(q);

      const deletedPolicies = querySnapshot.docs.map(docSnap => 
        mapDocToDeletedPolicy(docSnap.id, docSnap.data())
      );

      // Sort by deletedAt descending (newest first) in memory
      deletedPolicies.sort((a, b) => {
        const dateA = a.deletedAt ? new Date(a.deletedAt).getTime() : 0;
        const dateB = b.deletedAt ? new Date(b.deletedAt).getTime() : 0;
        return dateB - dateA;
      });

      console.log(`Found ${deletedPolicies.length} deleted policies`);
      return deletedPolicies;
    } catch (error) {
      console.error('Error getting deleted policies:', error);
      throw new Error('Failed to fetch deleted policies from database');
    }
  },

  // Restore a deleted policy back to active policies
  restorePolicy: async (deletedPolicy: DeletedPolicy, userId?: string, userDisplayName?: string): Promise<void> => {
    try {
      const now = new Date().toISOString();
      
      // Insert back into policies collection
      await addDoc(collection(db, COLLECTIONS.POLICIES), {
        userId: deletedPolicy.userId,
        policyholderName: deletedPolicy.policyholderName,
        contactNo: deletedPolicy.contactNo,
        emailId: deletedPolicy.emailId,
        address: deletedPolicy.address,
        policyNumber: deletedPolicy.policyNumber,
        insuranceCompany: deletedPolicy.insuranceCompany,
        policyType: deletedPolicy.policyType,
        premiumAmount: deletedPolicy.premiumAmount,
        coverageAmount: deletedPolicy.coverageAmount,
        policyStartDate: toISOStringSafe(deletedPolicy.policyStartDate),
        policyEndDate: toISOStringSafe(deletedPolicy.policyEndDate),
        premiumDueDate: toISOStringSafe(deletedPolicy.premiumDueDate),
        status: deletedPolicy.status || 'active',
        paymentFrequency: deletedPolicy.paymentFrequency,
        nomineeName: deletedPolicy.nomineeName,
        nomineeRelationship: deletedPolicy.nomineeRelationship,
        notes: deletedPolicy.notes,
        documents: deletedPolicy.documents,
        createdAt: toISOStringSafe(deletedPolicy.createdAt) || now,
        updatedAt: now,
      });

      // Remove from deleted_policies collection
      await deleteDoc(doc(db, COLLECTIONS.DELETED_POLICIES, deletedPolicy.id));

      console.log(`Policy restored with ID: ${deletedPolicy.id}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'RESTORE',
        deletedPolicy.id,
        deletedPolicy.policyholderName,
        `Policy restored for ${deletedPolicy.policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );
    } catch (error) {
      console.error('Error restoring policy:', error);
      throw new Error('Failed to restore policy');
    }
  },

  // Permanently delete a policy from deleted collection
  permanentlyDeletePolicy: async (
    deletedPolicyId: string,
    policyholderName: string,
    userId?: string,
    userDisplayName?: string
  ): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.DELETED_POLICIES, deletedPolicyId));

      console.log(`Policy permanently deleted with ID: ${deletedPolicyId}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'PERMANENT_DELETE',
        deletedPolicyId,
        policyholderName,
        `Policy permanently deleted for ${policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );
    } catch (error) {
      console.error('Error permanently deleting policy:', error);
      throw new Error('Failed to permanently delete policy');
    }
  },

  // Get a single deleted policy by ID
  getDeletedPolicyById: async (id: string): Promise<DeletedPolicy | null> => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.DELETED_POLICIES, id));

      if (!docSnap.exists()) return null;

      return mapDocToDeletedPolicy(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error getting deleted policy by ID:', error);
      throw new Error('Failed to fetch deleted policy');
    }
  },
};
