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
import { Lead, LeadFormData, FollowUpHistory } from '../types';
import { localBackupService } from './localBackupService';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

export const leadService = {
  // Get all leads (optionally filtered by userId)
  // With fallback to local backup if Firebase fails
  getLeads: async (userId?: string): Promise<Lead[]> => {
    try {
      console.log('Fetching leads for userId:', userId);
      
      // Use simple query without orderBy to avoid requiring composite indexes
      let q;
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.LEADS),
          where('userId', '==', userId)
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.LEADS)
        );
      }

      const querySnapshot = await getDocs(q);

      const leads: Lead[] = querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          customerEmail: data.customerEmail,
          productType: data.productType,
          followUpDate: toDate(data.followUpDate) || new Date(),
          status: data.status,
          leadSource: data.leadSource,
          remark: data.remark,
          nextFollowUpDate: toDate(data.nextFollowUpDate),
          createdAt: toDate(data.createdAt) || new Date(),
          updatedAt: toDate(data.updatedAt) || new Date(),
          assignedTo: data.assignedTo,
          assignedToName: data.assignedToName,
          assigned_to_team_member_id: data.assignedToTeamMemberId,
          priority: data.priority,
          estimatedValue: data.estimatedValue,
          convertedToPolicyId: data.convertedToPolicyId,
          isConverted: data.isConverted,
        };
      });

      // Sort by createdAt descending (newest first) in memory
      leads.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const dateB = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return dateB - dateA;
      });

      // Sync to local backup for future fallback
      if (leads.length > 0) {
        localBackupService.syncAll('leads', leads).catch(() => {});
      }

      return leads;
    } catch (error) {
      console.error('Error in getLeads from Firebase:', error);
      
      // Fallback to local backup
      console.log('Attempting to fetch leads from local backup...');
      const localLeads = await localBackupService.getAll<Lead>('leads', userId);
      
      if (localLeads && localLeads.length > 0) {
        console.log(`📥 Loaded ${localLeads.length} leads from local backup`);
        return localLeads.map(l => ({
          ...l,
          followUpDate: l.followUpDate ? new Date(l.followUpDate) : new Date(),
          nextFollowUpDate: l.nextFollowUpDate ? new Date(l.nextFollowUpDate) : undefined,
          createdAt: l.createdAt ? new Date(l.createdAt) : new Date(),
          updatedAt: l.updatedAt ? new Date(l.updatedAt) : new Date(),
        }));
      }
      
      throw new Error('Failed to fetch leads from both Firebase and local backup');
    }
  },

  // Get a single lead by ID
  getLeadById: async (id: string): Promise<Lead | null> => {
    try {
      const leadDoc = await getDoc(doc(db, COLLECTIONS.LEADS, id));

      if (!leadDoc.exists()) return null;

      const data = leadDoc.data();
      return {
        id: leadDoc.id,
        userId: data.userId,
        customerName: data.customerName,
        customerMobile: data.customerMobile,
        customerEmail: data.customerEmail,
        productType: data.productType,
        followUpDate: toDate(data.followUpDate) || new Date(),
        status: data.status,
        leadSource: data.leadSource,
        remark: data.remark,
        nextFollowUpDate: toDate(data.nextFollowUpDate),
        createdAt: toDate(data.createdAt) || new Date(),
        updatedAt: toDate(data.updatedAt) || new Date(),
        assignedTo: data.assignedTo,
        assignedToName: data.assignedToName,
        priority: data.priority,
        estimatedValue: data.estimatedValue,
        convertedToPolicyId: data.convertedToPolicyId,
        isConverted: data.isConverted,
      };
    } catch (error) {
      console.error('Error in getLeadById:', error);
      throw error;
    }
  },

  // Create a new lead
  // Saves to local backup FIRST (in parallel), then to Firebase
  createLead: async (leadData: LeadFormData, userId: string, userDisplayName: string): Promise<Lead> => {
    const now = new Date().toISOString();
    const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const dbLead = {
      userId: userId,
      customerName: leadData.customerName,
      customerMobile: leadData.customerMobile,
      customerEmail: leadData.customerEmail,
      productType: leadData.productType,
      followUpDate: leadData.followUpDate,
      status: leadData.status,
      leadSource: leadData.leadSource,
      remark: leadData.remark || null,
      nextFollowUpDate: leadData.nextFollowUpDate || null,
      priority: leadData.priority || 'medium',
      estimatedValue: leadData.estimatedValue || null,
      isConverted: false,
      createdAt: now,
      updatedAt: now,
      createdBy: userId,
      createdByName: userDisplayName,
    };

    // Start local backup immediately (with temp ID) - don't wait for it
    const localBackupPromise = localBackupService.backup('leads', {
      action: 'CREATE',
      data: { id: tempId, ...dbLead, _tempId: true },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    try {
      const docRef = await addDoc(collection(db, COLLECTIONS.LEADS), dbLead);

      // Update local backup with real Firebase ID
      await localBackupService.backup('leads', {
        action: 'UPDATE',
        data: { id: docRef.id, ...dbLead, _tempId: tempId },
        userId: userId,
        userName: userDisplayName,
        timestamp: now,
      });

      return {
        id: docRef.id,
        userId: userId,
        customerName: leadData.customerName,
        customerMobile: leadData.customerMobile,
        customerEmail: leadData.customerEmail,
        productType: leadData.productType,
        followUpDate: new Date(leadData.followUpDate),
        status: leadData.status,
        leadSource: leadData.leadSource,
        remark: leadData.remark,
        nextFollowUpDate: leadData.nextFollowUpDate ? new Date(leadData.nextFollowUpDate) : undefined,
        priority: leadData.priority,
        estimatedValue: leadData.estimatedValue,
        isConverted: false,
        createdAt: new Date(now),
        updatedAt: new Date(now),
      };
    } catch (firebaseError) {
      // Firebase failed - make sure local backup completed
      await localBackupPromise;
      console.error('Firebase save failed, lead saved to local backup with temp ID:', tempId);
      throw new Error('Failed to create lead in Firebase (saved locally)');
    }
  },

  // Update a lead
  // Saves to local backup FIRST, then to Firebase
  updateLead: async (id: string, updates: Partial<LeadFormData>, userId?: string, userDisplayName?: string): Promise<void> => {
    const now = new Date().toISOString();
    const dbUpdates: { [key: string]: string | number | boolean | undefined | null | FieldValue } = {
      updatedAt: now
    };
    
    // Store userId and userDisplayName for backup (unused in current implementation but available for future use)
    console.log(`Lead ${id} updated by ${userDisplayName || userId || 'unknown'}`);

    if (updates.customerName !== undefined) dbUpdates.customerName = updates.customerName;
    if (updates.customerMobile !== undefined) dbUpdates.customerMobile = updates.customerMobile;
    if (updates.customerEmail !== undefined) dbUpdates.customerEmail = updates.customerEmail;
    if (updates.productType !== undefined) dbUpdates.productType = updates.productType;
    if (updates.followUpDate !== undefined) dbUpdates.followUpDate = updates.followUpDate;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.leadSource !== undefined) dbUpdates.leadSource = updates.leadSource;
    if (updates.remark !== undefined) dbUpdates.remark = updates.remark;
    if (updates.nextFollowUpDate !== undefined) dbUpdates.nextFollowUpDate = updates.nextFollowUpDate;
    if (updates.priority !== undefined) dbUpdates.priority = updates.priority;
    if (updates.estimatedValue !== undefined) dbUpdates.estimatedValue = updates.estimatedValue;

    // Local backup FIRST
    const localBackupPromise = localBackupService.backup('leads', {
      action: 'UPDATE',
      data: { id, ...dbUpdates },
      userId: undefined,
      userName: undefined,
      timestamp: now,
    });

    try {
      await updateDoc(doc(db, COLLECTIONS.LEADS, id), dbUpdates);
      await localBackupPromise;
    } catch (firebaseError) {
      await localBackupPromise;
      console.error('Firebase update failed, lead update saved to local backup');
      throw new Error('Failed to update lead in Firebase (saved locally)');
    }
  },

  // Delete a lead
  // Saves to local backup FIRST, then deletes from Firebase
  deleteLead: async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
    const now = new Date().toISOString();
    console.log(`Lead ${id} deleted by ${userDisplayName || userId || 'unknown'}`);
    
    // Local backup FIRST
    const localBackupPromise = localBackupService.backup('leads', {
      action: 'DELETE',
      data: { id, deletedAt: now },
      userId: userId,
      userName: userDisplayName,
      timestamp: now,
    });

    try {
      await deleteDoc(doc(db, COLLECTIONS.LEADS, id));
      await localBackupPromise;
    } catch (firebaseError) {
      await localBackupPromise;
      console.error('Firebase delete failed, lead deletion saved to local backup');
      throw new Error('Failed to delete lead from Firebase (saved locally)');
    }
  },

  // Get leads for follow-up today
  getFollowUpLeads: async (userId?: string): Promise<Lead[]> => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);

      let q;
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.LEADS),
          where('userId', '==', userId),
          where('nextFollowUpDate', '>=', today.toISOString()),
          where('nextFollowUpDate', '<', tomorrow.toISOString())
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.LEADS),
          where('nextFollowUpDate', '>=', today.toISOString()),
          where('nextFollowUpDate', '<', tomorrow.toISOString())
        );
      }

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          customerName: data.customerName,
          customerMobile: data.customerMobile,
          customerEmail: data.customerEmail,
          productType: data.productType,
          followUpDate: toDate(data.followUpDate) || new Date(),
          status: data.status,
          leadSource: data.leadSource,
          remark: data.remark,
          nextFollowUpDate: toDate(data.nextFollowUpDate),
          createdAt: toDate(data.createdAt) || new Date(),
          updatedAt: toDate(data.updatedAt) || new Date(),
          priority: data.priority,
          estimatedValue: data.estimatedValue,
        };
      });
    } catch (error) {
      console.error('Error in getFollowUpLeads:', error);
      throw error;
    }
  },

  // Add follow-up history
  addFollowUpHistory: async (
    leadId: string, 
    historyData: Omit<FollowUpHistory, 'id' | 'createdAt'>
  ): Promise<FollowUpHistory> => {
    try {
      const now = new Date().toISOString();
      const dbHistory = {
        leadId,
        followUpDate: historyData.followUpDate,
        actualFollowUpDate: historyData.actualFollowUpDate,
        status: historyData.status,
        notes: historyData.notes,
        nextFollowUpDate: historyData.nextFollowUpDate || null,
        createdBy: historyData.createdBy,
        createdByName: historyData.createdByName,
        createdAt: now,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.FOLLOW_UP_HISTORY), dbHistory);

      // Local backup
      await localBackupService.backup('followUpHistory', {
        action: 'CREATE',
        data: { id: docRef.id, ...dbHistory },
        userId: historyData.createdBy,
        userName: historyData.createdByName,
        timestamp: now,
      });

      return {
        id: docRef.id,
        leadId,
        followUpDate: new Date(historyData.followUpDate as string),
        actualFollowUpDate: new Date(historyData.actualFollowUpDate as string),
        status: historyData.status,
        notes: historyData.notes,
        nextFollowUpDate: historyData.nextFollowUpDate ? new Date(historyData.nextFollowUpDate as string) : undefined,
        createdBy: historyData.createdBy,
        createdByName: historyData.createdByName,
        createdAt: new Date(now),
      };
    } catch (error) {
      console.error('Error in addFollowUpHistory:', error);
      throw error;
    }
  },

  // Get follow-up history for a lead
  getFollowUpHistory: async (leadId: string): Promise<FollowUpHistory[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.FOLLOW_UP_HISTORY),
        where('leadId', '==', leadId),
        orderBy('createdAt', 'desc')
      );

      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          leadId: data.leadId,
          followUpDate: toDate(data.followUpDate) || new Date(),
          actualFollowUpDate: toDate(data.actualFollowUpDate) || new Date(),
          status: data.status,
          notes: data.notes,
          nextFollowUpDate: toDate(data.nextFollowUpDate),
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: toDate(data.createdAt) || new Date(),
        };
      });
    } catch (error) {
      console.error('Error in getFollowUpHistory:', error);
      throw error;
    }
  },

  // Mark lead as converted
  markAsConverted: async (leadId: string, policyId: string): Promise<void> => {
    try {
      const updateData = {
        isConverted: true,
        convertedToPolicyId: policyId,
        status: 'won',
        updatedAt: new Date().toISOString(),
      };
      
      await updateDoc(doc(db, COLLECTIONS.LEADS, leadId), updateData);

      // Local backup
      await localBackupService.backup('leads', {
        action: 'UPDATE',
        data: { id: leadId, ...updateData },
        userId: undefined,
        userName: undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in markAsConverted:', error);
      throw error;
    }
  },

  // Get lead statistics
  getLeadStatistics: async (userId?: string): Promise<{
    total: number;
    new: number;
    followUp: number;
    won: number;
    lost: number;
    conversionRate: number;
  }> => {
    try {
      const leads = await leadService.getLeads(userId);
      const total = leads.length;
      const won = leads.filter(l => l.status === 'won').length;
      const conversionRate = total > 0 ? Math.round((won / total) * 100) : 0;
      
      return {
        total,
        new: leads.filter(l => l.status === 'new').length,
        followUp: leads.filter(l => l.status === 'follow_up').length,
        won,
        lost: leads.filter(l => l.status === 'lost').length,
        conversionRate,
      };
    } catch (error) {
      console.error('Error getting lead statistics:', error);
      return { total: 0, new: 0, followUp: 0, won: 0, lost: 0, conversionRate: 0 };
    }
  },

  // Get upcoming follow-ups
  getUpcomingFollowUps: async (userId?: string, days: number = 7): Promise<Lead[]> => {
    try {
      const leads = await leadService.getLeads(userId);
      const today = new Date();
      const futureDate = new Date();
      futureDate.setDate(today.getDate() + days);

      return leads.filter(lead => {
        const followUpDate = lead.nextFollowUpDate || lead.followUpDate;
        if (!followUpDate) return false;
        
        const date = new Date(followUpDate);
        return date >= today && date <= futureDate;
      }).sort((a, b) => {
        const dateA = new Date(a.nextFollowUpDate || a.followUpDate);
        const dateB = new Date(b.nextFollowUpDate || b.followUpDate);
        return dateA.getTime() - dateB.getTime();
      });
    } catch (error) {
      console.error('Error getting upcoming follow-ups:', error);
      return [];
    }
  },
};
