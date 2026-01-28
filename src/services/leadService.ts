import { supabase } from '../config/supabase';
import { Lead, LeadFormData, FollowUpHistory } from '../types';
import { activityLogService } from './activityLogService';

export const leadService = {
  // Get all leads (optionally filtered by userId)
  getLeads: async (userId?: string): Promise<Lead[]> => {
    try {
      console.log('Fetching leads for userId:', userId);
      
      let query = supabase
        .from('leads')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Convert snake_case to camelCase
      const leads: Lead[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerMobile: row.customer_mobile,
        customerEmail: row.customer_email,
        productType: row.product_type,
        followUpDate: row.follow_up_date ? new Date(row.follow_up_date) : new Date(),
        status: row.status,
        leadSource: row.lead_source,
        remark: row.remark,
        nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name,
        priority: row.priority,
        estimatedValue: row.estimated_value,
        convertedToPolicyId: row.converted_to_policy_id,
        isConverted: row.is_converted,
      }));

      return leads;
    } catch (error) {
      console.error('Error in getLeads:', error);
      throw error;
    }
  },

  // Get a single lead by ID
  getLeadById: async (id: string): Promise<Lead | null> => {
    try {
      const { data, error } = await supabase
        .from('leads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        customerName: data.customer_name,
        customerMobile: data.customer_mobile,
        customerEmail: data.customer_email,
        productType: data.product_type,
        followUpDate: data.follow_up_date ? new Date(data.follow_up_date) : new Date(),
        status: data.status,
        leadSource: data.lead_source,
        remark: data.remark,
        nextFollowUpDate: data.next_follow_up_date ? new Date(data.next_follow_up_date) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        assignedTo: data.assigned_to,
        assignedToName: data.assigned_to_name,
        priority: data.priority,
        estimatedValue: data.estimated_value,
        convertedToPolicyId: data.converted_to_policy_id,
        isConverted: data.is_converted,
      };
    } catch (error) {
      console.error('Error in getLeadById:', error);
      throw error;
    }
  },

  // Create a new lead
  createLead: async (leadData: LeadFormData, userId: string, userDisplayName: string): Promise<Lead> => {
    try {
      // Convert to snake_case for database
      const dbData = {
        user_id: userId,
        customer_name: leadData.customerName,
        customer_mobile: leadData.customerMobile,
        customer_email: leadData.customerEmail,
        product_type: leadData.productType,
        follow_up_date: leadData.followUpDate,
        status: leadData.status || 'new',
        lead_source: leadData.leadSource,
        remark: leadData.remark,
        next_follow_up_date: leadData.nextFollowUpDate,
        priority: leadData.priority || 'medium',
        estimated_value: leadData.estimatedValue,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('leads')
        .insert(dbData)
        .select()
        .single();

      if (error) throw error;

      const newLead: Lead = {
        id: data.id,
        userId: data.user_id,
        customerName: data.customer_name,
        customerMobile: data.customer_mobile,
        customerEmail: data.customer_email,
        productType: data.product_type,
        followUpDate: new Date(data.follow_up_date),
        status: data.status,
        leadSource: data.lead_source,
        remark: data.remark,
        nextFollowUpDate: data.next_follow_up_date ? new Date(data.next_follow_up_date) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        priority: data.priority,
        estimatedValue: data.estimated_value,
      };

      // Log the activity
      await activityLogService.createActivityLog(
        'CREATE',
        newLead.id,
        newLead.customerName,
        `Lead created for ${newLead.customerName}`,
        userId,
        userDisplayName,
        undefined,
        newLead as any
      );

      return newLead;
    } catch (error) {
      console.error('Error in createLead:', error);
      throw error;
    }
  },

  // Update a lead
  updateLead: async (id: string, leadData: Partial<LeadFormData>, userId: string, userDisplayName: string): Promise<Lead> => {
    try {
      // Get old data for activity log
      const oldLead = await leadService.getLeadById(id);

      // Convert to snake_case for database
      const dbData: Record<string, any> = {
        updated_at: new Date().toISOString(),
      };

      if (leadData.customerName !== undefined) dbData.customer_name = leadData.customerName;
      if (leadData.customerMobile !== undefined) dbData.customer_mobile = leadData.customerMobile;
      if (leadData.customerEmail !== undefined) dbData.customer_email = leadData.customerEmail;
      if (leadData.productType !== undefined) dbData.product_type = leadData.productType;
      if (leadData.followUpDate !== undefined) dbData.follow_up_date = leadData.followUpDate;
      if (leadData.status !== undefined) dbData.status = leadData.status;
      if (leadData.leadSource !== undefined) dbData.lead_source = leadData.leadSource;
      if (leadData.remark !== undefined) dbData.remark = leadData.remark;
      if (leadData.nextFollowUpDate !== undefined) dbData.next_follow_up_date = leadData.nextFollowUpDate;
      if (leadData.priority !== undefined) dbData.priority = leadData.priority;
      if (leadData.estimatedValue !== undefined) dbData.estimated_value = leadData.estimatedValue;

      const { data, error } = await supabase
        .from('leads')
        .update(dbData)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;

      const updatedLead: Lead = {
        id: data.id,
        userId: data.user_id,
        customerName: data.customer_name,
        customerMobile: data.customer_mobile,
        customerEmail: data.customer_email,
        productType: data.product_type,
        followUpDate: new Date(data.follow_up_date),
        status: data.status,
        leadSource: data.lead_source,
        remark: data.remark,
        nextFollowUpDate: data.next_follow_up_date ? new Date(data.next_follow_up_date) : undefined,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
        priority: data.priority,
        estimatedValue: data.estimated_value,
        convertedToPolicyId: data.converted_to_policy_id,
        isConverted: data.is_converted,
      };

      // Log the activity
      await activityLogService.createActivityLog(
        'UPDATE',
        updatedLead.id,
        updatedLead.customerName,
        `Lead updated for ${updatedLead.customerName}`,
        userId,
        userDisplayName,
        oldLead as any,
        updatedLead as any
      );

      return updatedLead;
    } catch (error) {
      console.error('Error in updateLead:', error);
      throw error;
    }
  },

  // Delete a lead
  deleteLead: async (id: string, userId: string, userDisplayName: string): Promise<void> => {
    try {
      // Get lead data for activity log
      const lead = await leadService.getLeadById(id);

      const { error } = await supabase
        .from('leads')
        .delete()
        .eq('id', id);

      if (error) throw error;

      // Log the activity
      if (lead) {
        await activityLogService.createActivityLog(
          'DELETE',
          id,
          lead.customerName,
          `Lead deleted for ${lead.customerName}`,
          userId,
          userDisplayName,
          lead as any,
          undefined
        );
      }
    } catch (error) {
      console.error('Error in deleteLead:', error);
      throw error;
    }
  },

  // Get leads by status
  getLeadsByStatus: async (status: Lead['status'], userId?: string): Promise<Lead[]> => {
    try {
      let query = supabase
        .from('leads')
        .select('*')
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerMobile: row.customer_mobile,
        customerEmail: row.customer_email,
        productType: row.product_type,
        followUpDate: new Date(row.follow_up_date),
        status: row.status,
        leadSource: row.lead_source,
        remark: row.remark,
        nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name,
        priority: row.priority,
        estimatedValue: row.estimated_value,
        convertedToPolicyId: row.converted_to_policy_id,
        isConverted: row.is_converted,
      }));
    } catch (error) {
      console.error('Error in getLeadsByStatus:', error);
      throw error;
    }
  },

  // Get leads with upcoming follow-ups
  getUpcomingFollowUps: async (userId?: string, days: number = 7): Promise<Lead[]> => {
    try {
      const today = new Date();
      const futureDate = new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

      let query = supabase
        .from('leads')
        .select('*')
        .gte('next_follow_up_date', today.toISOString())
        .lte('next_follow_up_date', futureDate.toISOString())
        .order('next_follow_up_date', { ascending: true });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        customerName: row.customer_name,
        customerMobile: row.customer_mobile,
        customerEmail: row.customer_email,
        productType: row.product_type,
        followUpDate: new Date(row.follow_up_date),
        status: row.status,
        leadSource: row.lead_source,
        remark: row.remark,
        nextFollowUpDate: row.next_follow_up_date ? new Date(row.next_follow_up_date) : undefined,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        assignedTo: row.assigned_to,
        assignedToName: row.assigned_to_name,
        priority: row.priority,
        estimatedValue: row.estimated_value,
        convertedToPolicyId: row.converted_to_policy_id,
        isConverted: row.is_converted,
      }));
    } catch (error) {
      console.error('Error in getUpcomingFollowUps:', error);
      throw error;
    }
  },

  // Convert lead to policy
  convertLeadToPolicy: async (leadId: string, policyId: string, userId: string, userDisplayName: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('leads')
        .update({
          is_converted: true,
          converted_to_policy_id: policyId,
          status: 'won',
          updated_at: new Date().toISOString(),
        })
        .eq('id', leadId);

      if (error) throw error;

      const lead = await leadService.getLeadById(leadId);

      if (lead) {
        await activityLogService.createActivityLog(
          'UPDATE',
          leadId,
          lead.customerName,
          `Lead converted to policy for ${lead.customerName}`,
          userId,
          userDisplayName,
          undefined,
          lead as any
        );
      }
    } catch (error) {
      console.error('Error in convertLeadToPolicy:', error);
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

      const stats = {
        total: leads.length,
        new: leads.filter(l => l.status === 'new').length,
        followUp: leads.filter(l => l.status === 'follow_up').length,
        won: leads.filter(l => l.status === 'won').length,
        lost: leads.filter(l => l.status === 'lost' || l.status === 'canceled').length,
        conversionRate: 0,
      };

      if (stats.total > 0) {
        stats.conversionRate = (stats.won / stats.total) * 100;
      }

      return stats;
    } catch (error) {
      console.error('Error in getLeadStatistics:', error);
      throw error;
    }
  },

  // Add follow-up history
  addFollowUpHistory: async (leadId: string, historyData: Omit<FollowUpHistory, 'id' | 'createdAt'>): Promise<FollowUpHistory> => {
    try {
      const { data, error } = await supabase
        .from('lead_follow_up_history')
        .insert({
          lead_id: leadId,
          follow_up_date: historyData.followUpDate,
          actual_follow_up_date: historyData.actualFollowUpDate,
          status: historyData.status,
          notes: historyData.notes,
          next_follow_up_date: historyData.nextFollowUpDate,
          created_by: historyData.createdBy,
          created_by_name: historyData.createdByName,
        })
        .select()
        .single();

      if (error) throw error;

      return {
        id: data.id,
        leadId: data.lead_id,
        followUpDate: data.follow_up_date,
        actualFollowUpDate: data.actual_follow_up_date,
        status: data.status,
        notes: data.notes,
        nextFollowUpDate: data.next_follow_up_date,
        createdBy: data.created_by,
        createdByName: data.created_by_name,
        createdAt: new Date(data.created_at),
      };
    } catch (error) {
      console.error('Error in addFollowUpHistory:', error);
      throw error;
    }
  },

  // Get follow-up history for a lead
  getFollowUpHistory: async (leadId: string): Promise<FollowUpHistory[]> => {
    try {
      const { data, error } = await supabase
        .from('lead_follow_up_history')
        .select('*')
        .eq('lead_id', leadId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map(row => ({
        id: row.id,
        leadId: row.lead_id,
        followUpDate: row.follow_up_date,
        actualFollowUpDate: row.actual_follow_up_date,
        status: row.status,
        notes: row.notes,
        nextFollowUpDate: row.next_follow_up_date,
        createdBy: row.created_by,
        createdByName: row.created_by_name,
        createdAt: new Date(row.created_at),
      }));
    } catch (error) {
      console.error('Error in getFollowUpHistory:', error);
      throw error;
    }
  },
};
