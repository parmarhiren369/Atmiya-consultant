import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { PolicyDeletionRequest } from '../types';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to PolicyDeletionRequest type
const mapDocToRequest = (id: string, data: Record<string, unknown>): PolicyDeletionRequest => ({
  id,
  policyId: data.policyId as string,
  policyNumber: data.policyNumber as string,
  policyholderName: data.policyholderName as string,
  requestedBy: data.requestedBy as string,
  requestedByName: data.requestedByName as string,
  requestReason: (data.requestReason as string) || (data.reason as string),
  status: data.status as 'pending' | 'approved' | 'rejected',
  requestDate: toDate(data.requestDate as Timestamp | string) || new Date(),
  reviewDate: toDate(data.reviewDate as Timestamp | string),
  reviewedBy: data.reviewedBy as string,
  reviewedByName: data.reviewedByName as string,
  reviewComments: data.reviewComments as string,
});

export const policyDeletionRequestService = {
  // Create a new deletion request
  createDeletionRequest: async (requestData: Omit<PolicyDeletionRequest, 'id' | 'requestDate'>): Promise<string> => {
    try {
      const now = new Date().toISOString();
      const requestWithTimestamp = {
        policyId: requestData.policyId,
        policyNumber: requestData.policyNumber,
        policyholderName: requestData.policyholderName,
        requestedBy: requestData.requestedBy,
        requestedByName: requestData.requestedByName,
        requestReason: requestData.requestReason,
        status: requestData.status || 'pending',
        requestDate: now,
        reviewDate: requestData.reviewDate ? new Date(requestData.reviewDate as Date).toISOString() : null,
        reviewedBy: requestData.reviewedBy || null,
        reviewedByName: requestData.reviewedByName || null,
        reviewComments: requestData.reviewComments || null,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.POLICY_DELETION_REQUESTS), requestWithTimestamp);
      console.log('Deletion request created with ID:', docRef.id);
      return docRef.id;
    } catch (error) {
      console.error('Error creating deletion request:', error);
      throw error;
    }
  },

  // Get all deletion requests (for admin)
  getAllDeletionRequests: async (): Promise<PolicyDeletionRequest[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.POLICY_DELETION_REQUESTS),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToRequest(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      throw error;
    }
  },

  // Get pending deletion requests (for admin)
  getPendingDeletionRequests: async (): Promise<PolicyDeletionRequest[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.POLICY_DELETION_REQUESTS),
        where('status', '==', 'pending'),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToRequest(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error fetching pending deletion requests:', error);
      throw error;
    }
  },

  // Get deletion requests by user
  getDeletionRequestsByUser: async (userId: string): Promise<PolicyDeletionRequest[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.POLICY_DELETION_REQUESTS),
        where('requestedBy', '==', userId),
        orderBy('requestDate', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToRequest(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error fetching user deletion requests:', error);
      throw error;
    }
  },

  // Update deletion request status (approve/reject)
  updateDeletionRequestStatus: async (
    requestId: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewedByName: string,
    reviewComments?: string
  ): Promise<void> => {
    try {
      const updateData = {
        status,
        reviewedBy,
        reviewedByName,
        reviewDate: new Date().toISOString(),
        reviewComments: reviewComments || ''
      };

      await updateDoc(doc(db, COLLECTIONS.POLICY_DELETION_REQUESTS, requestId), updateData);
      console.log('Deletion request status updated successfully');
    } catch (error) {
      console.error('Error updating deletion request status:', error);
      throw error;
    }
  },

  // Check if a policy has pending deletion request
  checkPendingDeletionRequest: async (policyId: string): Promise<PolicyDeletionRequest | null> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.POLICY_DELETION_REQUESTS),
        where('policyId', '==', policyId),
        where('status', '==', 'pending')
      );
      const querySnapshot = await getDocs(q);
      
      if (querySnapshot.empty) return null;

      const docSnap = querySnapshot.docs[0];
      return mapDocToRequest(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error checking pending deletion request:', error);
      throw error;
    }
  }
};
