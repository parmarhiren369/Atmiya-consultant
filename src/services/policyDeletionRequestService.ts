import { supabase } from '../config/supabase';
import { PolicyDeletionRequest } from '../types';

export const policyDeletionRequestService = {
  // Create a new deletion request
  createDeletionRequest: async (requestData: Omit<PolicyDeletionRequest, 'id' | 'requestDate'>): Promise<string> => {
    try {
      const requestWithTimestamp = {
        policy_id: requestData.policyId,
        policy_number: requestData.policyNumber,
        policyholder_name: requestData.policyholderName,
        requested_by: requestData.requestedBy,
        requested_by_name: requestData.requestedByName,
        request_reason: requestData.requestReason,
        status: requestData.status || 'pending',
        request_date: new Date().toISOString(),
        review_date: requestData.reviewDate ? new Date(requestData.reviewDate).toISOString() : null,
        reviewed_by: requestData.reviewedBy || null,
        reviewed_by_name: requestData.reviewedByName || null,
        review_comments: requestData.reviewComments || null,
      };

      const { data, error } = await supabase
        .from('policy_deletion_requests')
        .insert([requestWithTimestamp])
        .select()
        .single();

      if (error) throw error;
      
      console.log('Deletion request created with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating deletion request:', error);
      throw error;
    }
  },

  // Get all deletion requests (for admin)
  getAllDeletionRequests: async (): Promise<PolicyDeletionRequest[]> => {
    try {
      const { data, error } = await supabase
        .from('policy_deletion_requests')
        .select('*')
        .order('request_date', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        policyId: item.policy_id,
        policyNumber: item.policy_number,
        policyholderName: item.policyholder_name,
        requestedBy: item.requested_by,
        requestedByName: item.requested_by_name,
        reason: item.reason,
        status: item.status,
        requestDate: new Date(item.request_date),
        reviewDate: item.review_date ? new Date(item.review_date) : undefined,
        reviewedBy: item.reviewed_by,
        reviewedByName: item.reviewed_by_name,
        reviewComments: item.review_comments,
      }));
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      throw error;
    }
  },

  // Get pending deletion requests (for admin)
  getPendingDeletionRequests: async (): Promise<PolicyDeletionRequest[]> => {
    try {
      const { data, error } = await supabase
        .from('policy_deletion_requests')
        .select('*')
        .eq('status', 'pending')
        .order('request_date', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        policyId: item.policy_id,
        policyNumber: item.policy_number,
        policyholderName: item.policyholder_name,
        requestedBy: item.requested_by,
        requestedByName: item.requested_by_name,
        reason: item.reason,
        status: item.status,
        requestDate: new Date(item.request_date),
        reviewDate: item.review_date ? new Date(item.review_date) : undefined,
        reviewedBy: item.reviewed_by,
        reviewedByName: item.reviewed_by_name,
        reviewComments: item.review_comments,
      }));
    } catch (error) {
      console.error('Error fetching pending deletion requests:', error);
      throw error;
    }
  },

  // Get deletion requests by user
  getDeletionRequestsByUser: async (userId: string): Promise<PolicyDeletionRequest[]> => {
    try {
      const { data, error } = await supabase
        .from('policy_deletion_requests')
        .select('*')
        .eq('requested_by', userId)
        .order('request_date', { ascending: false });

      if (error) throw error;

      return data.map(item => ({
        id: item.id,
        policyId: item.policy_id,
        policyNumber: item.policy_number,
        policyholderName: item.policyholder_name,
        requestedBy: item.requested_by,
        requestedByName: item.requested_by_name,
        reason: item.reason,
        status: item.status,
        requestDate: new Date(item.request_date),
        reviewDate: item.review_date ? new Date(item.review_date) : undefined,
        reviewedBy: item.reviewed_by,
        reviewedByName: item.reviewed_by_name,
        reviewComments: item.review_comments,
      }));
    } catch (error) {
      console.error('Error fetching user deletion requests:', error);
      throw error;
    }
  },

  // Update deletion request status (approve/reject)
  updateDeletionRequestStatus: async (
    requestId: string, 
    status: 'approved' | 'rejected',
    reviewedBy: string,
    reviewedByName: string,
    reviewComments?: string
  ): Promise<void> => {
    try {
      const updateData = {
        status,
        reviewed_by: reviewedBy,
        reviewed_by_name: reviewedByName,
        review_date: new Date().toISOString(),
        review_comments: reviewComments || ''
      };

      const { error } = await supabase
        .from('policy_deletion_requests')
        .update(updateData)
        .eq('id', requestId);

      if (error) throw error;

      console.log('Deletion request status updated successfully');
    } catch (error) {
      console.error('Error updating deletion request status:', error);
      throw error;
    }
  },

  // Check if a policy has pending deletion request
  checkPendingDeletionRequest: async (policyId: string): Promise<PolicyDeletionRequest | null> => {
    try {
      const { data, error } = await supabase
        .from('policy_deletion_requests')
        .select('*')
        .eq('policy_id', policyId)
        .eq('status', 'pending')
        .maybeSingle();

      if (error) throw error;
      
      if (!data) return null;

      return {
        id: data.id,
        policyId: data.policy_id,
        policyNumber: data.policy_number,
        policyholderName: data.policyholder_name,
        requestedBy: data.requested_by,
        requestedByName: data.requested_by_name,
        requestReason: data.request_reason,
        status: data.status,
        requestDate: new Date(data.request_date),
        reviewDate: data.review_date ? new Date(data.review_date) : undefined,
        reviewedBy: data.reviewed_by,
        reviewedByName: data.reviewed_by_name,
        reviewComments: data.review_comments,
      };
    } catch (error) {
      console.error('Error checking pending deletion request:', error);
      throw error;
    }
  }
};
