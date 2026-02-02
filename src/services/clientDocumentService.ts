import { 
  collection, 
  addDoc, 
  getDocs, 
  deleteDoc,
  doc,
  query, 
  where
} from 'firebase/firestore';
import { db } from '../config/firebase';

// Store document metadata in Firestore to avoid CORS issues with Storage listAll
interface ClientDocument {
  id: string;
  userId: string;
  clientName: string;
  policyNumber: string;
  fileName: string;
  fileUrl: string;
  filePath: string;
  fileSize: number;
  fileType: string;
  uploadedAt: string;
}

const CLIENT_DOCUMENTS_COLLECTION = 'clientDocuments';

export const clientDocumentService = {
  /**
   * Add a document record to Firestore
   */
  addDocument: async (
    userId: string,
    clientName: string,
    policyNumber: string,
    fileName: string,
    fileUrl: string,
    filePath: string,
    fileSize: number,
    fileType: string
  ): Promise<string> => {
    try {
      const docRef = await addDoc(collection(db, CLIENT_DOCUMENTS_COLLECTION), {
        userId,
        clientName: clientName.toLowerCase(),
        clientNameDisplay: clientName,
        policyNumber,
        fileName,
        fileUrl,
        filePath,
        fileSize,
        fileType,
        uploadedAt: new Date().toISOString(),
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding document record:', error);
      throw error;
    }
  },

  /**
   * Get all documents for a specific client
   */
  getClientDocuments: async (
    userId: string,
    clientName: string,
    policyNumber: string
  ): Promise<ClientDocument[]> => {
    try {
      const q = query(
        collection(db, CLIENT_DOCUMENTS_COLLECTION),
        where('userId', '==', userId),
        where('clientName', '==', clientName.toLowerCase()),
        where('policyNumber', '==', policyNumber)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ClientDocument[];
    } catch (error) {
      console.error('Error getting client documents:', error);
      return [];
    }
  },

  /**
   * Get document count for a client folder
   */
  getDocumentCount: async (
    userId: string,
    clientName: string,
    policyNumber: string
  ): Promise<number> => {
    try {
      const docs = await clientDocumentService.getClientDocuments(userId, clientName, policyNumber);
      return docs.length;
    } catch (error) {
      console.error('Error getting document count:', error);
      return 0;
    }
  },

  /**
   * Delete a document record from Firestore
   */
  deleteDocument: async (documentId: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, CLIENT_DOCUMENTS_COLLECTION, documentId));
    } catch (error) {
      console.error('Error deleting document record:', error);
      throw error;
    }
  },

  /**
   * Delete document by file path
   */
  deleteDocumentByPath: async (userId: string, filePath: string): Promise<void> => {
    try {
      const q = query(
        collection(db, CLIENT_DOCUMENTS_COLLECTION),
        where('userId', '==', userId),
        where('filePath', '==', filePath)
      );
      
      const snapshot = await getDocs(q);
      const deletePromises = snapshot.docs.map(docSnap => 
        deleteDoc(doc(db, CLIENT_DOCUMENTS_COLLECTION, docSnap.id))
      );
      
      await Promise.all(deletePromises);
    } catch (error) {
      console.error('Error deleting document by path:', error);
      throw error;
    }
  },

  /**
   * Get all documents for a user
   */
  getAllUserDocuments: async (userId: string): Promise<ClientDocument[]> => {
    try {
      const q = query(
        collection(db, CLIENT_DOCUMENTS_COLLECTION),
        where('userId', '==', userId)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(docSnap => ({
        id: docSnap.id,
        ...docSnap.data(),
      })) as ClientDocument[];
    } catch (error) {
      console.error('Error getting all user documents:', error);
      return [];
    }
  },
};
