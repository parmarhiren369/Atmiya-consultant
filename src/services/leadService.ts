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
import { Lead, LeadFormData, FollowUpHistory } from '../types';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

export const leadService = {
  // Get all leads (optionally filtered by userId)
  getLeads: async (userId?: string): Promise<Lead[]> => {
    try {
      console.log('Fetching leads for userId:', userId);
      
      let q;
      if (userId) {
        q = query(
          collection(db, COLLECTIONS.LEADS),
          where('userId', '==', userId),
          orderBy('createdAt', 'desc')
        );
      } else {
        q = query(
          collection(db, COLLECTIONS.LEADS),
          orderBy('createdAt', 'desc')
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

      return leads;
    } catch (error) {
      console.error('Error in getLeads:', error);
      throw error;
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
  createLead: async (leadData: LeadFormData, userId: string, userDisplayName: string): Promise<Lead> => {
    try {
      const now = new Date().toISOString();
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

      const docRef = await addDoc(collection(db, COLLECTIONS.LEADS), dbLead);

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
    } catch (error) {
      console.error('Error in createLead:', error);
      throw error;
    }
  },

  // Update a lead
  updateLead: async (id: string, updates: Partial<LeadFormData>): Promise<void> => {
    try {
      const dbUpdates: Record<string, unknown> = {
        updatedAt: new Date().toISOString()
      };

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

      await updateDoc(doc(db, COLLECTIONS.LEADS, id), dbUpdates);
    } catch (error) {
      console.error('Error in updateLead:', error);
      throw error;
    }
  },

  // Delete a lead
  deleteLead: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.LEADS, id));
    } catch (error) {
      console.error('Error in deleteLead:', error);
      throw error;
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
      await updateDoc(doc(db, COLLECTIONS.LEADS, leadId), {
        isConverted: true,
        convertedToPolicyId: policyId,
        status: 'won',
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error in markAsConverted:', error);
      throw error;
    }
  },
};
