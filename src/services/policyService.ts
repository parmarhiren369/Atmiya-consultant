import { supabase } from '../config/supabase';
import { Policy } from '../types';
import { activityLogService } from './activityLogService';

export const policyService = {
  // Get all active policies (optionally filtered by userId)
  getPolicies: async (userId?: string): Promise<Policy[]> => {
    try {
      console.log('Fetching policies for userId:', userId);
      
      let query = supabase
        .from('policies')
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
      const policies: Policy[] = (data || []).map(row => ({
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
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
        // Additional custom fields from database
        businessType: row.business_type,
        memberOf: row.member_of,
        registrationNo: row.registration_no,
        engineNo: row.engine_no,
        chasisNo: row.chasis_no,
        hp: row.hp,
        riskLocationAddress: row.risk_location_address,
        idv: row.idv,
        netPremium: row.net_premium,
        odPremium: row.od_premium,
        thirdPartyPremium: row.third_party_premium,
        gst: row.gst,
        totalPremium: row.total_premium,
        commissionPercentage: row.commission_percentage,
        commissionAmount: row.commission_amount,
        remark: row.remark,
        productType: row.product_type,
        referenceFromName: row.reference_from_name,
        isOneTimePolicy: row.is_one_time_policy,
        ncbPercentage: row.ncb_percentage,
        pdfFileName: row.pdf_file_name,
        fileId: row.file_id,
        driveFileUrl: row.drive_file_url,
        documentsFolderLink: row.documents_folder_link,
      }));

      console.log(`Found ${policies.length} active policies`);
      return policies;
    } catch (error) {
      console.error('Error getting policies:', error);
      throw new Error('Failed to fetch policies from database');
    }
  },

  // Add a new policy
  addPolicy: async (
    policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>,
    userId?: string,
    userDisplayName?: string
  ): Promise<string> => {
    try {
      // Validate userId is provided
      if (!userId) {
        throw new Error('User ID is required to add a policy');
      }

      // Convert camelCase to snake_case for Supabase
      const dbPolicy = {
        user_id: userId,
        policyholder_name: policyData.policyholderName,
        contact_no: policyData.contactNo,
        email_id: policyData.emailId,
        address: policyData.address,
        policy_number: policyData.policyNumber,
        insurance_company: policyData.insuranceCompany,
        policy_type: policyData.policyType,
        premium_amount: policyData.premiumAmount,
        coverage_amount: policyData.coverageAmount,
        policy_start_date: policyData.policyStartDate,
        policy_end_date: policyData.policyEndDate,
        premium_due_date: policyData.premiumDueDate,
        status: policyData.status || 'active',
        payment_frequency: policyData.paymentFrequency,
        nominee_name: policyData.nomineeName,
        nominee_relationship: policyData.nomineeRelationship,
        notes: policyData.notes,
        documents: policyData.documents || [],
        // Additional custom fields
        business_type: policyData.businessType,
        member_of: policyData.memberOf || null,
        registration_no: policyData.registrationNo,
        engine_no: policyData.engineNo,
        chasis_no: policyData.chasisNo,
        hp: policyData.hp,
        risk_location_address: policyData.riskLocationAddress,
        idv: policyData.idv,
        net_premium: policyData.netPremium,
        od_premium: policyData.odPremium,
        third_party_premium: policyData.thirdPartyPremium,
        gst: policyData.gst,
        total_premium: policyData.totalPremium,
        commission_percentage: policyData.commissionPercentage,
        commission_amount: policyData.commissionAmount,
        remark: policyData.remark,
        product_type: policyData.productType,
        reference_from_name: policyData.referenceFromName,
        is_one_time_policy: policyData.isOneTimePolicy,
        ncb_percentage: policyData.ncbPercentage,
        pdf_file_name: policyData.pdfFileName,
        file_id: policyData.fileId,
        drive_file_url: policyData.driveFileUrl,
        documents_folder_link: policyData.documentsFolderLink,
      };

      const { data, error } = await supabase
        .from('policies')
        .insert([dbPolicy])
        .select()
        .single();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log(`Policy created with ID: ${data.id}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'CREATE',
        data.id,
        policyData.policyholderName,
        `New policy created for ${policyData.policyholderName}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );

      return data.id;
    } catch (error) {
      console.error('Error adding policy:', error);
      throw new Error('Failed to add policy to database');
    }
  },

  // Update an existing policy
  updatePolicy: async (
    id: string,
    updates: Partial<Policy>,
    oldPolicy?: Policy,
    userId?: string,
    userDisplayName?: string
  ): Promise<void> => {
    try {
      // Convert camelCase to snake_case for Supabase
      const dbUpdates: Record<string, unknown> = {};
      
      if (updates.policyholderName !== undefined) dbUpdates.policyholder_name = updates.policyholderName;
      if (updates.contactNo !== undefined) dbUpdates.contact_no = updates.contactNo;
      if (updates.emailId !== undefined) dbUpdates.email_id = updates.emailId;
      if (updates.address !== undefined) dbUpdates.address = updates.address;
      if (updates.policyNumber !== undefined) dbUpdates.policy_number = updates.policyNumber;
      if (updates.insuranceCompany !== undefined) dbUpdates.insurance_company = updates.insuranceCompany;
      if (updates.policyType !== undefined) dbUpdates.policy_type = updates.policyType;
      if (updates.premiumAmount !== undefined) dbUpdates.premium_amount = updates.premiumAmount;
      if (updates.coverageAmount !== undefined) dbUpdates.coverage_amount = updates.coverageAmount;
      if (updates.policyStartDate !== undefined) dbUpdates.policy_start_date = updates.policyStartDate;
      if (updates.policyEndDate !== undefined) dbUpdates.policy_end_date = updates.policyEndDate;
      if (updates.premiumDueDate !== undefined) dbUpdates.premium_due_date = updates.premiumDueDate;
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.paymentFrequency !== undefined) dbUpdates.payment_frequency = updates.paymentFrequency;
      if (updates.nomineeName !== undefined) dbUpdates.nominee_name = updates.nomineeName;
      if (updates.nomineeRelationship !== undefined) dbUpdates.nominee_relationship = updates.nomineeRelationship;
      if (updates.notes !== undefined) dbUpdates.notes = updates.notes;
      if (updates.documents !== undefined) dbUpdates.documents = updates.documents;

      const { error } = await supabase
        .from('policies')
        .update(dbUpdates)
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

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
    } catch (error) {
      console.error('Error updating policy:', error);
      throw new Error('Failed to update policy in database');
    }
  },

  // Soft delete a policy (move to deleted collection)
  deletePolicy: async (id: string, userId?: string, userDisplayName?: string): Promise<void> => {
    try {
      // First, get the policy data
      const { data: policyData, error: fetchError } = await supabase
        .from('policies')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError || !policyData) {
        throw new Error('Policy not found');
      }

      // Insert into deleted_policies table
      const { error: insertError } = await supabase
        .from('deleted_policies')
        .insert([{
          original_policy_id: id,
          user_id: policyData.user_id,
          policyholder_name: policyData.policyholder_name,
          contact_no: policyData.contact_no,
          email_id: policyData.email_id,
          address: policyData.address,
          policy_number: policyData.policy_number,
          insurance_company: policyData.insurance_company,
          policy_type: policyData.policy_type,
          premium_amount: policyData.premium_amount,
          coverage_amount: policyData.coverage_amount,
          policy_start_date: policyData.policy_start_date,
          policy_end_date: policyData.policy_end_date,
          premium_due_date: policyData.premium_due_date,
          status: policyData.status,
          payment_frequency: policyData.payment_frequency,
          nominee_name: policyData.nominee_name,
          nominee_relationship: policyData.nominee_relationship,
          notes: policyData.notes,
          documents: policyData.documents,
          deleted_by: userId,
          created_at: policyData.created_at,
          updated_at: policyData.updated_at,
        }]);

      if (insertError) {
        console.error('Supabase error inserting deleted policy:', insertError);
        throw insertError;
      }

      // Delete from policies table
      const { error: deleteError } = await supabase
        .from('policies')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Supabase error deleting policy:', deleteError);
        throw deleteError;
      }

      console.log(`Policy soft deleted with ID: ${id}`);

      // Create activity log
      await activityLogService.createActivityLog(
        'DELETE',
        id,
        policyData.policyholder_name,
        `Policy deleted for ${policyData.policyholder_name}${userDisplayName ? ` by ${userDisplayName}` : ''}`,
        userId,
        userDisplayName
      );
    } catch (error) {
      console.error('Error deleting policy:', error);
      throw new Error('Failed to delete policy from database');
    }
  },

  // Get single policy by ID
  getPolicyById: async (id: string): Promise<Policy | null> => {
    try {
      const { data, error } = await supabase
        .from('policies')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) return null;

      // Convert snake_case to camelCase
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
        createdAt: new Date(data.created_at),
        updatedAt: new Date(data.updated_at),
      };
    } catch (error) {
      console.error('Error getting policy by ID:', error);
      throw new Error('Failed to fetch policy');
    }
  },
};
