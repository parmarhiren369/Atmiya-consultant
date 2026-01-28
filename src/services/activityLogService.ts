import { supabase } from '../config/supabase';

export interface ActivityLog {
  id: string;
  userId?: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PERMANENT_DELETE' | 'MARK_LAPSED' | 'REACTIVATE' | 'EXPORT' | 'IMPORT' | 'VIEW';
  policyId?: string;
  policyNumber?: string;
  policyholderName?: string;
  description: string;
  performedBy?: string;
  performedByName?: string;
  createdAt: Date;
  metadata?: Record<string, unknown>;
}

export const activityLogService = {
  // Create a new activity log
  createActivityLog: async (
    action: ActivityLog['action'],
    policyId?: string,
    policyholderName?: string,
    description?: string,
    userId?: string,
    userDisplayName?: string,
    oldData?: Record<string, unknown>,
    newData?: Record<string, unknown>
  ): Promise<string> => {
    try {
      const metadata: Record<string, unknown> = {};
      if (oldData) metadata.oldData = oldData;
      if (newData) metadata.newData = newData;

      const { data, error } = await supabase
        .from('activity_logs')
        .insert([{
          user_id: userId,
          action,
          policy_id: policyId,
          policyholder_name: policyholderName,
          description: description || `${action} action performed`,
          performed_by: userId,
          performed_by_name: userDisplayName,
          metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
        }])
        .select()
        .single();

      if (error) {
        console.error('Supabase error creating activity log:', error);
        throw error;
      }

      return data.id;
    } catch (error) {
      console.error('Error creating activity log:', error);
      // Don't throw - activity logs are not critical
      return '';
    }
  },

  // Get activity logs (optionally limited and filtered by userId)
  getActivityLogs: async (limit?: number, userId?: string): Promise<ActivityLog[]> => {
    try {
      let query = supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false });

      if (userId) {
        query = query.eq('user_id', userId);
      }

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      // Convert snake_case to camelCase
      const activityLogs: ActivityLog[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        policyId: row.policy_id,
        policyNumber: row.policy_number,
        policyholderName: row.policyholder_name,
        description: row.description,
        performedBy: row.performed_by,
        performedByName: row.performed_by_name,
        createdAt: new Date(row.created_at),
        metadata: row.metadata,
      }));

      return activityLogs;
    } catch (error) {
      console.error('Error getting activity logs:', error);
      throw new Error('Failed to fetch activity logs');
    }
  },

  // Get activity logs for a specific policy
  getPolicyActivityLogs: async (policyId: string): Promise<ActivityLog[]> => {
    try {
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .eq('policy_id', policyId)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      const activityLogs: ActivityLog[] = (data || []).map(row => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        policyId: row.policy_id,
        policyNumber: row.policy_number,
        policyholderName: row.policyholder_name,
        description: row.description,
        performedBy: row.performed_by,
        performedByName: row.performed_by_name,
        createdAt: new Date(row.created_at),
        metadata: row.metadata,
      }));

      return activityLogs;
    } catch (error) {
      console.error('Error getting policy activity logs:', error);
      throw new Error('Failed to fetch policy activity logs');
    }
  },
};
