import { supabase } from '../config/supabase';

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

export const groupHeadService = {
  // Get all group heads for a user
  getGroupHeads: async (userId: string): Promise<GroupHead[]> => {
    try {
      const { data, error } = await supabase
        .from('group_heads')
        .select('*')
        .eq('user_id', userId)
        .order('group_head_name', { ascending: true });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        groupHeadName: row.group_head_name,
        contactNo: row.contact_no,
        emailId: row.email_id,
        address: row.address,
        relationshipType: row.relationship_type,
        notes: row.notes,
        totalPolicies: row.total_policies || 0,
        totalPremiumAmount: parseFloat(row.total_premium_amount || '0'),
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));
    } catch (error) {
      console.error('Error getting group heads:', error);
      throw error;
    }
  },

  // Get a single group head by ID
  getGroupHeadById: async (id: string): Promise<GroupHead | null> => {
    try {
      const { data, error } = await supabase
        .from('group_heads')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') return null;
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        groupHeadName: data.group_head_name,
        contactNo: data.contact_no,
        emailId: data.email_id,
        address: data.address,
        relationshipType: data.relationship_type,
        notes: data.notes,
        totalPolicies: data.total_policies || 0,
        totalPremiumAmount: parseFloat(data.total_premium_amount || '0'),
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting group head:', error);
      throw error;
    }
  },

  // Add a new group head
  addGroupHead: async (groupHeadData: Omit<GroupHead, 'id' | 'createdAt' | 'updatedAt' | 'totalPolicies' | 'totalPremiumAmount'>): Promise<string> => {
    try {
      const { data, error } = await supabase
        .from('group_heads')
        .insert([{
          user_id: groupHeadData.userId,
          group_head_name: groupHeadData.groupHeadName,
          contact_no: groupHeadData.contactNo,
          email_id: groupHeadData.emailId,
          address: groupHeadData.address,
          relationship_type: groupHeadData.relationshipType || 'Primary',
          notes: groupHeadData.notes,
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error adding group head:', error);
      throw error;
    }
  },

  // Update a group head
  updateGroupHead: async (id: string, updates: Partial<GroupHead>): Promise<void> => {
    try {
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.groupHeadName !== undefined) dbUpdates.group_head_name = updates.groupHeadName;
      if (updates.contactNo !== undefined) dbUpdates.contact_no = updates.contactNo;
      if (updates.emailId !== undefined) dbUpdates.email_id = updates.emailId;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.relationshipType !== undefined) dbUpdates.relationship_type = updates.relationshipType;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;

      const { error } = await supabase
        .from('group_heads')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating group head:', error);
      throw error;
    }
  },

  // Delete a group head
  deleteGroupHead: async (id: string): Promise<void> => {
    try {
      const { error } = await supabase
        .from('group_heads')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error deleting group head:', error);
      throw error;
    }
  },

  // Get policies for a specific group head
  getGroupHeadPolicies: async (groupHeadId: string) => {
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('member_of', groupHeadId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return data || [];
    } catch (error) {
      console.error('Error getting group head policies:', error);
      throw error;
    }
  },

  // Update group head statistics (total policies and premium amount)
  updateGroupHeadStats: async (groupHeadId: string): Promise<void> => {
    try {
      // Get all policies for this group head
      const { data: policies, error: policiesError } = await supabase
        .from('policies')
        .select('premium_amount, net_premium, total_premium')
        .eq('member_of', groupHeadId);

      if (policiesError) throw policiesError;

      const totalPolicies = policies?.length || 0;
      const totalPremiumAmount = policies?.reduce((sum, policy) => {
        const amount = parseFloat(policy.total_premium || policy.net_premium || policy.premium_amount || '0');
        return sum + amount;
      }, 0) || 0;

      // Update the group head
      const { error: updateError } = await supabase
        .from('group_heads')
        .update({
          total_policies: totalPolicies,
          total_premium_amount: totalPremiumAmount,
        })
        .eq('id', groupHeadId);

      if (updateError) throw updateError;
    } catch (error) {
      console.error('Error updating group head stats:', error);
      throw error;
    }
  },
};
