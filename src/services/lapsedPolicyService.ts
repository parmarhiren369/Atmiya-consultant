import { supabase } from '../config/supabase';
import { LapsedPolicy, Policy } from '../types';

export const markPolicyAsLapsed = async (policy: Policy, reason?: string): Promise<string> => {
  try {
    const { data, error} = await supabase
      .from('lapsed_policies')
      .insert([{
        original_policy_id: policy.id,
        user_id: policy.userId,
        policyholder_name: policy.policyholderName,
        contact_no: policy.contactNo,
        email_id: policy.emailId,
        address: policy.address,
        policy_number: policy.policyNumber,
        insurance_company: policy.insuranceCompany,
        policy_type: policy.policyType,
        premium_amount: policy.premiumAmount,
        coverage_amount: policy.coverageAmount,
        policy_start_date: policy.policyStartDate,
        policy_end_date: policy.policyEndDate,
        premium_due_date: policy.premiumDueDate,
        status: policy.status,
        payment_frequency: policy.paymentFrequency,
        nominee_name: policy.nomineeName,
        nominee_relationship: policy.nomineeRelationship,
        notes: policy.notes,
        documents: policy.documents,
        lapsed_reason: reason || '',
        created_at: policy.createdAt,
        updated_at: policy.updatedAt,
      }])
      .select()
      .single();

    if (error) {
      console.error('Supabase error marking policy as lapsed:', error);
      throw error;
    }

    return data.id;
  } catch (error) {
    console.error('Error marking policy as lapsed:', error);
    throw error;
  }
};

export const getLapsedPolicies = async (userId?: string): Promise<LapsedPolicy[]> => {
  try {
    let query = supabase
      .from('lapsed_policies')
      .select('*')
      .order('lapsed_at', { ascending: false });

    if (userId) {
      query = query.eq('user_id', userId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Supabase error:', error);
      throw error;
    }

    // Convert snake_case to camelCase
    const lapsedPolicies: LapsedPolicy[] = (data || []).map(row => ({
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
      // Legacy field mappings for backward compatibility
      startDate: row.start_date || row.policy_start_date,
      expiryDate: row.expiry_date || row.policy_end_date,
      status: row.status,
      paymentFrequency: row.payment_frequency,
      nomineeName: row.nominee_name,
      nomineeRelationship: row.nominee_relationship,
      notes: row.notes,
      documents: row.documents || [],
      lapsedAt: new Date(row.lapsed_at),
      lapsedReason: row.lapsed_reason,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
    }));

    return lapsedPolicies;
  } catch (error) {
    console.error('Error getting lapsed policies:', error);
    throw error;
  }
};

export const getLapsedPolicyById = async (id: string): Promise<LapsedPolicy | null> => {
  try {
    const { data, error } = await supabase
      .from('lapsed_policies')
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
      // Legacy field mappings for backward compatibility
      startDate: data.start_date || data.policy_start_date,
      expiryDate: data.expiry_date || data.policy_end_date,
      status: data.status,
      paymentFrequency: data.payment_frequency,
      nomineeName: data.nominee_name,
      nomineeRelationship: data.nominee_relationship,
      notes: data.notes,
      documents: data.documents || [],
      lapsedAt: new Date(data.lapsed_at),
      lapsedReason: data.lapsed_reason,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
    };
  } catch (error) {
    console.error('Error getting lapsed policy:', error);
    throw error;
  }
};

export const removeLapsedPolicy = async (id: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('lapsed_policies')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Supabase error removing lapsed policy:', error);
      throw error;
    }
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
