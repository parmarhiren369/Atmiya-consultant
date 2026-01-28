import { policyService } from '../services/policyService';
import { deletedPolicyService } from '../services/deletedPolicyService';
import { activityLogService } from '../services/activityLogService';

export const generateInitialActivityLogs = async () => {
  try {
    console.log('Starting to generate initial activity logs...');
    
    // Get all active policies
    const activePolicies = await policyService.getPolicies();
    console.log(`Found ${activePolicies.length} active policies`);
    
    // Get all deleted policies
    const deletedPolicies = await deletedPolicyService.getDeletedPolicies();
    console.log(`Found ${deletedPolicies.length} deleted policies`);
    
    // Create activity logs for active policies
    for (const policy of activePolicies) {
      await activityLogService.createActivityLog(
        'CREATE',
        policy.id,
        policy.policyholderName,
        `Policy created for ${policy.policyholderName} (Historical data)`,
        undefined,
        undefined,
        undefined,
        policy as unknown as Record<string, unknown>
      );
      console.log(`Created activity log for policy: ${policy.policyholderName}`);
    }
    
    // Create activity logs for deleted policies
    for (const deletedPolicy of deletedPolicies) {
      // Create initial CREATE log
      await activityLogService.createActivityLog(
        'CREATE',
        deletedPolicy.id,
        deletedPolicy.policyholderName,
        `Policy created for ${deletedPolicy.policyholderName} (Historical data)`,
        undefined,
        undefined,
        undefined,
        deletedPolicy as unknown as Record<string, unknown>
      );
      
      // Create DELETE log
      await activityLogService.createActivityLog(
        'DELETE',
        deletedPolicy.id,
        deletedPolicy.policyholderName,
        `Policy deleted for ${deletedPolicy.policyholderName} (Historical data)`,
        undefined,
        undefined,
        deletedPolicy as unknown as Record<string, unknown>,
        undefined
      );
      console.log(`Created activity logs for deleted policy: ${deletedPolicy.policyholderName}`);
    }
    
    console.log('✅ Successfully generated initial activity logs!');
    return {
      activePolicies: activePolicies.length,
      deletedPolicies: deletedPolicies.length,
      totalLogs: activePolicies.length + (deletedPolicies.length * 2)
    };
    
  } catch (error) {
    console.error('❌ Error generating initial activity logs:', error);
    throw error;
  }
};
