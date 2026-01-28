import { supabase } from '../config/supabase';
import { DeletedPolicy } from '../types';
import { activityLogService } from './activityLogService';

export const deletedPolicyService = {
  // Get all deleted policies (optionally filtered by userId)
  getDeletedPolicies: async (userId?: string): Promise<DeletedPolicy[]> => {
    try {
      let query = supabase
        .from('deleted_policies')
        .select('*')
        .order('deleted_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Convert snake_case to camelCase
      const deletedPolicies: DeletedPolicy[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        policyholderName: row.policyholder_name,
        contactNo: row.contact_no,
        emailId: row.email_id,
        address: row.address,
        policyNumber: row.policy_number,
        insuranceCompany: row.insurance_company,
        policyType: row.policy_type,
        premiumAmount: row.premium_amount,
        coverageAmount: row.coverage_amount,
        policyStartDate: row.policy_start_date ? new Date(row.policy_start_date) : undefined,
        policyEndDate: row.policy_end_date ? new Date(row.policy_end_date) : undefined,
        premiumDueDate: row.premium_due_date ? new Date(row.premium_due_date) : undefined,
        status: row.status,
        paymentFrequency: row.payment_frequency,
        nomineeName: row.nominee_name,
        nomineeRelationship: row.nominee_relationship,
        notes: row.notes,
        documents: row.documents || [],
        deletedAt: new Date(row.deleted_at),
        deletedBy: row.deleted_by,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

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
      // Insert back into policies table
      const { error: insertError } = await supabase
        .from('policies')
        .insert([{
          user_id: deletedPolicy.userId,
          policyholder_name: deletedPolicy.policyholderName,
          contact_no: deletedPolicy.contactNo,
          email_id: deletedPolicy.emailId,
          address: deletedPolicy.address,
          policy_number: deletedPolicy.policyNumber,
          insurance_company: deletedPolicy.insuranceCompany,
          policy_type: deletedPolicy.policyType,
          premium_amount: deletedPolicy.premiumAmount,
          coverage_amount: deletedPolicy.coverageAmount,
          policy_start_date: deletedPolicy.policyStartDate,
          policy_end_date: deletedPolicy.policyEndDate,
          premium_due_date: deletedPolicy.premiumDueDate,
          status: deletedPolicy.status,
          payment_frequency: deletedPolicy.paymentFrequency,
          nominee_name: deletedPolicy.nomineeName,
          nominee_relationship: deletedPolicy.nomineeRelationship,
          notes: deletedPolicy.notes,
          documents: deletedPolicy.documents,
        }]);

      if (insertError) {
        console.error('Supabase error restoring policy:', insertError);
        throw insertError;
      }

      // Remove from deleted_policies table
      const { error: deleteError } = await supabase
        .from('deleted_policies')
        .delete()
        .eq('id', deletedPolicy.id);

      if (deleteError) {
        console.error('Supabase error removing from deleted:', deleteError);
        throw deleteError;
      }

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
      const { error } = await supabase
        .from('deleted_policies')
        .delete()
        .eq('id', deletedPolicyId);

      if (error) {
        console.error('Supabase error permanently deleting:', error);
        throw error;
      }

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
      const { data, error } = await supabase
        .from('deleted_policies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.user_id,
        policyholderName: data.policyholder_name,
        contactNo: data.contact_no,
        emailId: data.email_id,
        address: data.address,
        policyNumber: data.policy_number,
        insuranceCompany: data.insurance_company,
        policyType: data.policy_type,
        premiumAmount: data.premium_amount,
        coverageAmount: data.coverage_amount,
        policyStartDate: data.policy_start_date ? new Date(data.policy_start_date) : undefined,
        policyEndDate: data.policy_end_date ? new Date(data.policy_end_date) : undefined,
        premiumDueDate: data.premium_due_date ? new Date(data.premium_due_date) : undefined,
        status: data.status,
        paymentFrequency: data.payment_frequency,
        nomineeName: data.nominee_name,
        nomineeRelationship: data.nominee_relationship,
        notes: data.notes,
        documents: data.documents || [],
        deletedAt: new Date(data.deleted_at),
        deletedBy: data.deleted_by,
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting deleted policy by ID:', error);
      throw new Error('Failed to fetch deleted policy');
    }
  },
};
