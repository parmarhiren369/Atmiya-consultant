import { 
  collection, 
  getDocs, 
  query, 
  where
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { storageService } from './storageService';

interface ClientFolder {
  id: string;
  policyNumber: string;
  policyholderName: string;
  policyType: string;
  insuranceCompany: string;
  documentCount: number;
  driveFileUrl?: string;
  documentsFolderLink?: string;
}

/**
 * Get all client folders with their document counts
 * Groups policies by policyholder name and aggregates document information
 */
export async function getClientFolders(userId: string): Promise<ClientFolder[]> {
  try {
    // Use simple query without orderBy to avoid composite indexes
    const q = query(
      collection(db, COLLECTIONS.POLICIES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) {
      return [];
    }

    // Group policies by policyholder name
    // Each unique policyholder name becomes a client folder
    const clientMap = new Map<string, ClientFolder>();

    querySnapshot.docs.forEach((docSnap) => {
      const policy = docSnap.data();
      const key = (policy.policyholderName || '').toLowerCase();
      
      if (!clientMap.has(key)) {
        // Create a new client folder entry
        clientMap.set(key, {
          id: docSnap.id,
          policyholderName: policy.policyholderName,
          policyNumber: policy.policyNumber,
          policyType: policy.policyType || 'General',
          insuranceCompany: policy.insuranceCompany,
          documentCount: 0,
          driveFileUrl: policy.driveFileUrl,
          documentsFolderLink: policy.documentsFolderLink,
        });
      }
    });

    // Get actual document counts from Firebase Storage for each client
    const clientFolders = Array.from(clientMap.values());
    
    // Fetch document counts in parallel
    const documentCountPromises = clientFolders.map(async (folder) => {
      try {
        const files = await storageService.listUserFiles(
          userId,
          'client-documents',
          folder.policyholderName,
          folder.policyNumber
        );
        folder.documentCount = files.length;
      } catch (error) {
        console.error(`Error counting documents for ${folder.policyholderName}:`, error);
        folder.documentCount = 0;
      }
      return folder;
    });

    await Promise.all(documentCountPromises);

    // Sort by policyholderName ascending in memory
    clientFolders.sort((a, b) => (a.policyholderName || '').localeCompare(b.policyholderName || ''));

    return clientFolders;
  } catch (error) {
    console.error('Error in getClientFolders:', error);
    throw error;
  }
}

/**
 * Get all documents for a specific client
 */
export async function getClientDocuments(userId: string, policyholderName: string) {
  try {
    // Use simple query without orderBy to avoid composite indexes
    const q = query(
      collection(db, COLLECTIONS.POLICIES),
      where('userId', '==', userId)
    );
    const querySnapshot = await getDocs(q);

    const policies = querySnapshot.docs
      .map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data()
      }))
      .filter(policy => 
        (policy as Record<string, unknown>).policyholderName?.toString().toLowerCase() === policyholderName.toLowerCase()
      );

    // Sort by createdAt descending in memory
    policies.sort((a, b) => {
      const dateA = (a as Record<string, unknown>).createdAt ? new Date((a as Record<string, unknown>).createdAt as string).getTime() : 0;
      const dateB = (b as Record<string, unknown>).createdAt ? new Date((b as Record<string, unknown>).createdAt as string).getTime() : 0;
      return dateB - dateA;
    });

    return policies;
  } catch (error) {
    console.error('Error in getClientDocuments:', error);
    throw error;
  }
}
