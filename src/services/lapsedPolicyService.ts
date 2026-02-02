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
import { LapsedPolicy, Policy } from '../types';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to LapsedPolicy type
const mapDocToLapsedPolicy = (id: string, data: Record<string, unknown>): LapsedPolicy => ({
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
  startDate: data.startDate as string || (data.policyStartDate as string),
  expiryDate: data.expiryDate as string || (data.policyEndDate as string),
  status: data.status as string,
  paymentFrequency: data.paymentFrequency as string,
  nomineeName: data.nomineeName as string,
  nomineeRelationship: data.nomineeRelationship as string,
  notes: data.notes as string,
  documents: (data.documents as string[]) || [],
  lapsedAt: toDate(data.lapsedAt as Timestamp | string) || new Date(),
  lapsedReason: data.lapsedReason as string,
  createdAt: toDate(data.createdAt as Timestamp | string) || new Date(),
  updatedAt: toDate(data.updatedAt as Timestamp | string) || new Date(),
});

export const markPolicyAsLapsed = async (policy: Policy, reason?: string): Promise<string> => {
  try {
    const now = new Date().toISOString();
    const lapsedData = {
      originalPolicyId: policy.id,
      userId: policy.userId,
      policyholderName: policy.policyholderName,
      contactNo: policy.contactNo,
      emailId: policy.emailId,
      address: policy.address,
      policyNumber: policy.policyNumber,
      insuranceCompany: policy.insuranceCompany,
      policyType: policy.policyType,
      premiumAmount: policy.premiumAmount,
      coverageAmount: policy.coverageAmount,
      policyStartDate: policy.policyStartDate instanceof Date ? policy.policyStartDate.toISOString() : policy.policyStartDate,
      policyEndDate: policy.policyEndDate instanceof Date ? policy.policyEndDate.toISOString() : policy.policyEndDate,
      premiumDueDate: policy.premiumDueDate instanceof Date ? policy.premiumDueDate.toISOString() : policy.premiumDueDate,
      status: policy.status,
      paymentFrequency: policy.paymentFrequency,
      nomineeName: policy.nomineeName,
      nomineeRelationship: policy.nomineeRelationship,
      notes: policy.notes,
      documents: policy.documents,
      lapsedReason: reason || '',
      lapsedAt: now,
      createdAt: policy.createdAt instanceof Date ? policy.createdAt.toISOString() : policy.createdAt,
      updatedAt: now,
    };

    const docRef = await addDoc(collection(db, COLLECTIONS.LAPSED_POLICIES), lapsedData);
    return docRef.id;
  } catch (error) {
    console.error('Error marking policy as lapsed:', error);
    throw error;
  }
};

export const getLapsedPolicies = async (userId?: string): Promise<LapsedPolicy[]> => {
  try {
    // Use simple query without orderBy to avoid composite indexes
    let q;
    if (userId) {
      q = query(
        collection(db, COLLECTIONS.LAPSED_POLICIES),
        where('userId', '==', userId)
      );
    } else {
      q = query(
        collection(db, COLLECTIONS.LAPSED_POLICIES)
      );
    }

    const querySnapshot = await getDocs(q);

    const policies = querySnapshot.docs.map(docSnap => 
      mapDocToLapsedPolicy(docSnap.id, docSnap.data())
    );

    // Sort by lapsedAt descending in memory
    policies.sort((a, b) => {
      const dateA = a.lapsedAt ? new Date(a.lapsedAt).getTime() : 0;
      const dateB = b.lapsedAt ? new Date(b.lapsedAt).getTime() : 0;
      return dateB - dateA;
    });

    return policies;
  } catch (error) {
    console.error('Error getting lapsed policies:', error);
    throw error;
  }
};

export const getLapsedPolicyById = async (id: string): Promise<LapsedPolicy | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.LAPSED_POLICIES, id));

    if (!docSnap.exists()) return null;

    return mapDocToLapsedPolicy(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error getting lapsed policy:', error);
    throw error;
  }
};

export const removeLapsedPolicy = async (id: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.LAPSED_POLICIES, id));
  } catch (error) {
    console.error('Error removing lapsed policy:', error);
    throw error;
  }
};

export const lapsedPolicyService = {
  markPolicyAsLapsed,
  getLapsedPolicies,
  getLapsedPolicyById,
  removeLapsedPolicy
};
