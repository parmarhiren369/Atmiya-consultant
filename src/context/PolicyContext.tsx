import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Policy, DeletedPolicy, ActivityLog } from '../types';
import { policyService } from '../services/policyService';
import { activityLogService } from '../services/activityLogService';
import { deletedPolicyService } from '../services/deletedPolicyService';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

interface PolicyContextType {
  policies: Policy[];
  activityLogs: ActivityLog[];
  deletedPolicies: DeletedPolicy[];
  loading: boolean;
  error: string | null;
  addPolicy: (policy: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deletePolicy: (id: string) => Promise<void>;
  updatePolicy: (id: string, policy: Partial<Policy>) => Promise<void>;
  restorePolicy: (deletedPolicy: DeletedPolicy) => Promise<void>;
  permanentlyDeletePolicy: (deletedPolicyId: string, policyholderName: string) => Promise<void>;
  refreshPolicies: () => Promise<void>;
  refreshActivityLogs: () => Promise<void>;
  refreshDeletedPolicies: () => Promise<void>;
  validateUserPassword: (password: string) => Promise<boolean>;
}

const PolicyContext = createContext<PolicyContextType | undefined>(undefined);

export function PolicyProvider({ children }: { children: ReactNode }) {
  const { user, effectiveUserId } = useAuth();
  const [policies, setPolicies] = useState<Policy[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [deletedPolicies, setDeletedPolicies] = useState<DeletedPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch policies from database on component mount
  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Don't fetch if no effective user ID
      if (!effectiveUserId) {
        console.log('No effectiveUserId, skipping policy fetch');
        setPolicies([]);
        setLoading(false);
        return;
      }
      
      console.log('Fetching policies for effectiveUserId:', effectiveUserId);
      // Fetch policies for the effective user (admin's ID for team members, own ID for regular users)
      const data = await policyService.getPolicies(effectiveUserId);
      
      setPolicies(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch policies';
      setError(errorMessage);
      console.error('Error fetching policies:', err);
      // Don't show toast here, just log
    } finally {
      setLoading(false);
    }
  };

  // Fetch activity logs
  const fetchActivityLogs = async () => {
    try {
      const data = await activityLogService.getActivityLogs(100);
      // Map service ActivityLog to types ActivityLog
      const mappedLogs: ActivityLog[] = data.map(log => ({
        id: log.id,
        action: log.action as ActivityLog['action'],
        entityType: 'POLICY',
        entityId: log.policyId || '',
        entityName: log.policyholderName || '',
        description: log.description,
        timestamp: log.createdAt,
        userId: log.userId,
        userDisplayName: log.performedByName,
      }));
      setActivityLogs(mappedLogs);
    } catch (err) {
      console.error('Error fetching activity logs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch activity logs';
      toast.error(errorMessage);
    }
  };

  // Fetch deleted policies
  const fetchDeletedPolicies = async () => {
    try {
      // If admin, get all policies. Otherwise, use effective user ID
      const userId = user && user.role !== 'admin' ? effectiveUserId : undefined;
      const data = await deletedPolicyService.getDeletedPolicies(userId || undefined);
      setDeletedPolicies(data);
    } catch (err) {
      console.error('Error fetching deleted policies:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch deleted policies';
      toast.error(errorMessage);
    }
  };

  // Load policies when component mounts or when effectiveUserId changes
  useEffect(() => {
    const loadInitialData = async () => {
      await Promise.all([
        fetchPolicies(),
        fetchActivityLogs(),
        fetchDeletedPolicies()
      ]);
    };
    
    if (effectiveUserId) {
      loadInitialData();
    }
  }, [effectiveUserId]);

  const addPolicy = async (policyData: Omit<Policy, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      setLoading(true);
      
      // Add policy to database with user information
      await policyService.addPolicy(policyData, user?.id, user?.displayName);
      
      // Refresh policies and activity logs
      await Promise.all([
        fetchPolicies(),
        fetchActivityLogs()
      ]);
      
      toast.success('Policy added successfully!');
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to add policy';
      toast.error(errorMessage);
      console.error('Error adding policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const deletePolicy = async (id: string) => {
    try {
      setLoading(true);
      
      // Delete from Firebase with user information
      await policyService.deletePolicy(id, user?.id, user?.displayName);
      
      // Refresh all data
      await Promise.all([
        fetchPolicies(),
        fetchDeletedPolicies(),
        fetchActivityLogs()
      ]);
      
      toast.success('Policy deleted successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete policy';
      toast.error(errorMessage);
      console.error('Error deleting policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const updatePolicy = async (id: string, updates: Partial<Policy>) => {
    try {
      setLoading(true);
      
      // Get the old policy data
      const oldPolicy = policies.find(p => p.id === id);
      
      await policyService.updatePolicy(id, updates, oldPolicy, user?.id, user?.displayName);
      
      // Update local state
      setPolicies(prev => 
        prev.map(policy => 
          policy.id === id ? { ...policy, ...updates, updatedAt: new Date() } : policy
        )
      );
      
      // Refresh activity logs to show the update
      await fetchActivityLogs();
      
      toast.success('Policy updated successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to update policy';
      toast.error(errorMessage);
      console.error('Error updating policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const refreshPolicies = async () => {
    await fetchPolicies();
  };

  const refreshActivityLogs = async () => {
    await fetchActivityLogs();
  };

  const refreshDeletedPolicies = async () => {
    await fetchDeletedPolicies();
  };

  const restorePolicy = async (deletedPolicy: DeletedPolicy) => {
    try {
      setLoading(true);
      
      await deletedPolicyService.restorePolicy(deletedPolicy, user?.id, user?.displayName);
      
      // Refresh all data
      await Promise.all([
        fetchPolicies(),
        fetchDeletedPolicies(),
        fetchActivityLogs()
      ]);
      
      toast.success('Policy restored successfully!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to restore policy';
      toast.error(errorMessage);
      console.error('Error restoring policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const permanentlyDeletePolicy = async (deletedPolicyId: string, policyholderName: string) => {
    try {
      setLoading(true);
      
      await deletedPolicyService.permanentlyDeletePolicy(deletedPolicyId, policyholderName, user?.id, user?.displayName);
      
      // Refresh deleted policies and activity logs
      await Promise.all([
        fetchDeletedPolicies(),
        fetchActivityLogs()
      ]);
      
      toast.success('Policy permanently deleted!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to permanently delete policy';
      toast.error(errorMessage);
      console.error('Error permanently deleting policy:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  // Validate user password using Firebase Auth
  const validateUserPassword = async (password: string): Promise<boolean> => {
    try {
      if (!user?.email) {
        toast.error('User email not found');
        return false;
      }

      // Use Firebase Auth to verify password by re-authenticating
      await signInWithEmailAndPassword(auth, user.email, password);
      return true;
    } catch (error) {
      console.error('Password validation error:', error);
      return false;
    }
  };

  return (
    <PolicyContext.Provider value={{ 
      policies,
      activityLogs,
      deletedPolicies,
      loading, 
      error, 
      addPolicy, 
      deletePolicy, 
      updatePolicy,
      restorePolicy,
      permanentlyDeletePolicy,
      refreshPolicies,
      refreshActivityLogs,
      refreshDeletedPolicies,
      validateUserPassword
    }}>
      {children}
    </PolicyContext.Provider>
  );
}

export function usePolicies() {
  const context = useContext(PolicyContext);
  if (context === undefined) {
    throw new Error('usePolicies must be used within a PolicyProvider');
  }
  return context;
}
