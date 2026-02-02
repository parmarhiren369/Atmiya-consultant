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
  setDoc
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { Policy } from '../types';
import { activityLogService } from './activityLogService';
import { localBackupService } from './localBackupService';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to convert Date to ISO string for Firestore
const toISOString = (date: Date | string | undefined): string | undefined => {
  if (!date) return undefined;
  if (date instanceof Date) return date.toISOString();
  return date;
};

export const policyService = {
  // Get all active policies (optionally filtered by userId)
  // With fallback to local backup if Firebase fails
  getPolicies: async (userId?: string): Promise<Policy[]> => {
    try {
      console.log('Fetching policies for userId:', userId);
      
      let q;
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.POLICIES),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.POLICIES),
          orderBy('createdAt', 'desc')
        );
      }

      const querySnapshot = await getDocs(q);

      const policies: Policy[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          policyholderName: data.policyholderName,
          contactNo: data.contactNo,
          emailId: data.emailId,
          address: data.address,
          policyNumber: data.policyNumber,
          insuranceCompany: data.insuranceCompany,
          policyType: data.policyType,
          premiumAmount: data.premiumAmount,
          coverageAmount: data.coverageAmount,
          policyStartDate: toDate(data.policyStartDate),
          policyEndDate: toDate(data.policyEndDate),
          premiumDueDate: toDate(data.premiumDueDate),
          startDate: data.startDate || data.policyStartDate,
          expiryDate: data.expiryDate || data.policyEndDate,
          status: data.status,
          paymentFrequency: data.paymentFrequency,
          nomineeName: data.nomineeName,
          nomineeRelationship: data.nomineeRelationship,
          notes: data.notes,
          documents: data.documents || [],
          createdAt: toDate(data.createdAt) || new Date(),
          updatedAt: toDate(data.updatedAt) || new Date(),
          businessType: data.businessType,
          memberOf: data.memberOf,
          registrationNo: data.registrationNo,
          engineNo: data.engineNo,
          chasisNo: data.chasisNo,
          hp: data.hp,
          riskLocationAddress: data.riskLocationAddress,
          idv: data.idv,
          netPremium: data.netPremium,
          odPremium: data.odPremium,
          thirdPartyPremium: data.thirdPartyPremium,
          gst: data.gst,
          totalPremium: data.totalPremium,
          commissionPercentage: data.commissionPercentage,
          commissionAmount: data.commissionAmount,
          remark: data.remark,
          productType: data.productType,
          referenceFromName: data.referenceFromName,
          isOneTimePolicy: data.isOneTimePolicy,
          ncbPercentage: data.ncbPercentage,
          pdfFileName: data.pdfFileName,
          fileId: data.fileId,
          driveFileUrl: data.driveFileUrl,
          documentsFolderLink: data.documentsFolderLink,
        };
      });

      console.log(`Found ${policies.length} active policies from Firebase`);
      
      // Sync to local backup for future fallback
      if (policies.length > 0) {
        localBackupService.syncAll('policies', policies).catch(() => {});
      }
      
      return policies;
    } catch (error) {
      console.error('Error getting policies from Firebase:', error);
      
      // Fallback to local backup
      console.log('Attempting to fetch from local backup...');
      const localPolicies = await localBackupService.getAll<Policy>('policies', userId);
      
      if (localPolicies && localPolicies.length > 0) {
        console.log(`📥 Loaded ${localPolicies.length} policies from local backup`);
        // Convert date strings back to Date objects
        return localPolicies.map(p => ({
          ...p,
          policyStartDate: p.policyStartDate ? new Date(p.policyStartDate) : undefined,
          policyEndDate: p.policyEndDate ? new Date(p.policyEndDate) : undefined,
          premiumDueDate: p.premiumDueDate ? new Date(p.premiumDueDate) : undefined,
          createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
          updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
        }));
      }
      
      throw new Error('Failed to fetch policies from both Firebase and local backup');
    }
  },

  // Add a new policy
  // Saves to local backup FIRST (in parallel), then to Firebase
  addPolicy: async (
    policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>,
    userId?: string,
    userDisplayName?: string
  ): Promise<string> => {
    if (!userId) {
      throw new Error('User ID is required to add a policy');
    }

    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dbPolicy = {
      userId: userId,
      policyholderName: policyData.policyholderName,
      contactNo: policyData.contactNo || null,
      emailId: policyData.emailId || null,
      address: policyData.address || null,
      policyNumber: policyData.policyNumber,
      insuranceCompany: policyData.insuranceCompany,
      policyType: policyData.policyType,
      premiumAmount: policyData.premiumAmount || null,
      coverageAmount: policyData.coverageAmount || null,
      policyStartDate: toISOString(policyData.policyStartDate as Date | undefined),
      policyEndDate: toISOString(policyData.policyEndDate as Date | undefined),
      premiumDueDate: toISOString(policyData.premiumDueDate as Date | undefined),
      status: policyData.status || 'active',
      paymentFrequency: policyData.paymentFrequency || null,
      nomineeName: policyData.nomineeName || null,
      nomineeRelationship: policyData.nomineeRelationship || null,
      notes: policyData.notes || null,
      documents: policyData.documents || [],
      createdAt: now,
      updatedAt: now,
      businessType: policyData.businessType || null,
      memberOf: policyData.memberOf || null,
      registrationNo: policyData.registrationNo || null,
      engineNo: policyData.engineNo || null,
      chasisNo: policyData.chasisNo || null,
      hp: policyData.hp || null,
      riskLocationAddress: policyData.riskLocationAddress || null,
      idv: policyData.idv || null,
      netPremium: policyData.netPremium || null,
      odPremium: policyData.odPremium || null,
      thirdPartyPremium: policyData.thirdPartyPremium || null,
      gst: policyData.gst || null,
      totalPremium: policyData.totalPremium || null,
      commissionPercentage: policyData.commissionPercentage || null,
      commissionAmount: policyData.commissionAmount || null,
      remark: policyData.remark || null,
      productType: policyData.productType || null,
      referenceFromName: policyData.referenceFromName || null,
      isOneTimePolicy: policyData.isOneTimePolicy || false,
      ncbPercentage: policyData.ncbPercentage || null,
      pdfFileName: policyData.pdfFileName || null,
      fileId: policyData.fileId || null,
      driveFileUrl: policyData.driveFileUrl || null,
      documentsFolderLink: policyData.documentsFolderLink || null,
    };

    // Start local backup immediately (with temp ID) - don't wait for it
    const localBackupPromise = localBackupService.backup('policies', {
      action: 'CREATE',
      data: { id: tempId, ...dbPolicy, _tempId: true },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    try {
      // Save to Firebase
      const docRef = await addDoc(collection(db, COLLECTIONS.POLICIES), dbPolicy);
      console.log(`Policy created with ID: ${docRef.id}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'CREATE',
        docRef.id,
        policyData.policyholderName,
        `New policy created for ${policyData.policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );

      // Update local backup with real Firebase ID (replace temp entry)
      await localBackupService.backup('policies', {
        action: 'UPDATE',
        data: { id: docRef.id, ...dbPolicy, _tempId: tempId },
        userId: userId,
        userName: userDisplayName,
        timestamp: now,
      });

      return docRef.id;
    } catch (firebaseError) {
      // Firebase failed - make sure local backup completed
      await localBackupPromise;
      console.error('Firebase save failed, data saved to local backup with temp ID:', tempId);
      throw new Error('Failed to add policy to Firebase (saved locally)');
    }
  },

  // Update an existing policy
  // Saves to local backup FIRST, then to Firebase
  updatePolicy: async (
    id: string,
    updates: Partial<Policy>,
    oldPolicy?: Policy,
    userId?: string,
    userDisplayName?: string
  ): Promise<void> => {
    const now = new Date().toISOString();
    const dbUpdates: Record<string, unknown> = {
      updatedAt: now
    };
    
    if (updates.policyholderName !== undefined) dbUpdates.policyholderName = updates.policyholderName;
    if (updates.contactNo !== undefined) dbUpdates.contactNo = updates.contactNo;
    if (updates.emailId !== undefined) dbUpdates.emailId = updates.emailId;
    if (updates.address !== undefined) dbUpdates.address = updates.address;
    if (updates.policyNumber !== undefined) dbUpdates.policyNumber = updates.policyNumber;
    if (updates.insuranceCompany !== undefined) dbUpdates.insuranceCompany = updates.insuranceCompany;
    if (updates.policyType !== undefined) dbUpdates.policyType = updates.policyType;
    if (updates.premiumAmount !== undefined) dbUpdates.premiumAmount = updates.premiumAmount;
    if (updates.coverageAmount !== undefined) dbUpdates.coverageAmount = updates.coverageAmount;
    if (updates.policyStartDate !== undefined) dbUpdates.policyStartDate = toISOString(updates.policyStartDate as Date | undefined);
    if (updates.policyEndDate !== undefined) dbUpdates.policyEndDate = toISOString(updates.policyEndDate as Date | undefined);
    if (updates.premiumDueDate !== undefined) dbUpdates.premiumDueDate = toISOString(updates.premiumDueDate as Date | undefined);
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.paymentFrequency !== undefined) dbUpdates.paymentFrequency = updates.paymentFrequency;
    if (updates.nomineeName !== undefined) dbUpdates.nomineeName = updates.nomineeName;
    if (updates.nomineeRelationship !== undefined) dbUpdates.nomineeRelationship = updates.nomineeRelationship;
    if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
    if (updates.documents !== undefined) dbUpdates.documents = updates.documents;

    // Local backup FIRST - start immediately
    const localBackupPromise = localBackupService.backup('policies', {
      action: 'UPDATE',
      data: { id, ...dbUpdates },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    try {
      // Update Firebase
      await updateDoc(doc(db, COLLECTIONS.POLICIES, id), dbUpdates);
      console.log(`Policy updated with ID: ${id}`);

      // Create activity log
      const policyholderName = updates.policyholderName || oldPolicy?.policyholderName || 'Unknown';
      await activityLogService.createActivityLog(
        'UPDATE',
        id,
        policyholderName,
        `Policy updated for ${policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );

      // Make sure local backup completed
      await localBackupPromise;
    } catch (firebaseError) {
      // Make sure local backup completed even if Firebase failed
      await localBackupPromise;
      console.error('Firebase update failed, data saved to local backup');
      throw new Error('Failed to update policy in Firebase (saved locally)');
    }
  },

  // Soft delete a policy (move to deleted collection)
  // Saves to local backup FIRST, then to Firebase
  deletePolicy: async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
    const now = new Date().toISOString();
    
    // Get policy data first (try Firebase, then local backup)
    let policyData: Record<string, unknown> | null = null;
    
    try {
      const policyDocRef = doc(db, COLLECTIONS.POLICIES, id);
      const policyDoc = await getDoc(policyDocRef);
      if (policyDoc.exists()) {
        policyData = policyDoc.data();
      }
    } catch {
      // Firebase read failed, try local backup
      const localPolicy = await localBackupService.getById('policies', id);
      if (localPolicy) {
        policyData = localPolicy as Record<string, unknown>;
      }
    }

    if (!policyData) {
      throw new Error('Policy not found');
    }

    // Local backup FIRST - record deletion
    const localBackupPromise = localBackupService.backup('policies', {
      action: 'DELETE',
      data: { id, ...policyData, deletedAt: now },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    // Also backup to deleted policies
    const deletedBackupPromise = localBackupService.backup('deletedPolicies', {
      action: 'CREATE',
      data: { id, ...policyData, originalPolicyId: id, deletedBy: userId, deletedAt: now },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    try {
      const policyDocRef = doc(db, COLLECTIONS.POLICIES, id);
      
      // Insert into deleted_policies collection
      await setDoc(doc(db, COLLECTIONS.DELETED_POLICIES, id), {
        ...policyData,
        originalPolicyId: id,
        deletedBy: userId,
        deletedAt: now,
      });

      // Delete from policies collection
      await deleteDoc(policyDocRef);

      console.log(`Policy soft deleted with ID: ${id}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'DELETE',
        id,
        policyData.policyholderName as string,
        `Policy deleted for ${policyData.policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );

      // Make sure local backups completed
      await Promise.all([localBackupPromise, deletedBackupPromise]);
    } catch (firebaseError) {
      // Make sure local backups completed even if Firebase failed
      await Promise.all([localBackupPromise, deletedBackupPromise]);
      console.error('Firebase delete failed, deletion saved to local backup');
      throw new Error('Failed to delete policy from Firebase (saved locally)');
    }
  },

  // Get single policy by ID
  // With fallback to local backup if Firebase fails
  getPolicyById: async (id: string): Promise<Policy | null> => {
    try {
      const policyDoc = await getDoc(doc(db, COLLECTIONS.POLICIES, id));

      if (!policyDoc.exists()) {
        // Try local backup
        const localPolicy = await localBackupService.getById<Policy>('policies', id);
        return localPolicy;
      }

      const data = policyDoc.data();
      return {
        id: policyDoc.id,
        userId: data.userId,
        policyholderName: data.policyholderName,
        contactNo: data.contactNo,
        emailId: data.emailId,
        address: data.address,
        policyNumber: data.policyNumber,
        insuranceCompany: data.insuranceCompany,
        policyType: data.policyType,
        premiumAmount: data.premiumAmount,
        coverageAmount: data.coverageAmount,
        policyStartDate: toDate(data.policyStartDate),
        policyEndDate: toDate(data.policyEndDate),
        premiumDueDate: toDate(data.premiumDueDate),
        status: data.status,
        paymentFrequency: data.paymentFrequency,
        nomineeName: data.nomineeName,
        nomineeRelationship: data.nomineeRelationship,
        notes: data.notes,
        documents: data.documents || [],
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
      };
    } catch (error) {
      console.error('Error getting policy by ID from Firebase:', error);
      
      // Fallback to local backup
      console.log('Attempting to fetch from local backup...');
      const localPolicy = await localBackupService.getById<Policy>('policies', id);
      
      if (localPolicy) {
        console.log(`📥 Loaded policy ${id} from local backup`);
        return {
          ...localPolicy,
          policyStartDate: localPolicy.policyStartDate ? new Date(localPolicy.policyStartDate) : undefined,
          policyEndDate: localPolicy.policyEndDate ? new Date(localPolicy.policyEndDate) : undefined,
          premiumDueDate: localPolicy.premiumDueDate ? new Date(localPolicy.premiumDueDate) : undefined,
          createdAt: localPolicy.createdAt ? new Date(localPolicy.createdAt) : new Date(),
          updatedAt: localPolicy.updatedAt ? new Date(localPolicy.updatedAt) : new Date(),
        };
      }
      
      throw new Error('Failed to fetch policy from both Firebase and local backup');
    }
  },
};
