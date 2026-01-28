import { useState, useEffect, useCallback } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { useAuth } from '../context/AuthContext';
import { DeletedPolicy, PolicyDeletionRequest } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { DeletionRequestsTab } from '../components/DeletionRequestsTab';
import { policyDeletionRequestService } from '../services/policyDeletionRequestService';
import { 
  RotateCcw, 
  Search, 
  Eye, 
  RefreshCw,
  Calendar,
  Building,
  User,
  FileText,
  Trash2,
  AlertTriangle
} from 'lucide-react';
import { format } from 'date-fns';

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | undefined | null, formatString: string, fallback: string = 'N/A'): string => {
  if (!dateValue) return fallback;
  
  try {
    let date: Date;
    
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return format(date, formatString);
  } catch (error) {
    console.warn('Invalid date formatting:', dateValue, error);
    return fallback;
  }
};

export function RestorePage() {
  const { deletedPolicies, refreshDeletedPolicies, restorePolicy, permanentlyDeletePolicy, loading, validateUserPassword } = usePolicies();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'deleted' | 'requests'>('deleted');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<DeletedPolicy | null>(null);
  const [isRestoring, setIsRestoring] = useState<string | null>(null); // Track which policy is being restored
  const [isPermanentlyDeleting, setIsPermanentlyDeleting] = useState<string | null>(null); // Track which policy is being permanently deleted
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [policyToRestore, setPolicyToRestore] = useState<DeletedPolicy | null>(null);
  const [policyToPermanentlyDelete, setPolicyToPermanentlyDelete] = useState<DeletedPolicy | null>(null);
  const [deletionRequests, setDeletionRequests] = useState<PolicyDeletionRequest[]>([]);

  // Deletion requests handlers
  const loadDeletionRequests = useCallback(async () => {
    try {
      if (user?.role === 'admin') {
        const requests = await policyDeletionRequestService.getAllDeletionRequests();
        setDeletionRequests(requests);
      } else {
        const requests = await policyDeletionRequestService.getDeletionRequestsByUser(user?.userId || '');
        setDeletionRequests(requests);
      }
    } catch (error) {
      console.error('Error loading deletion requests:', error);
    }
  }, [user]);

  useEffect(() => {
    refreshDeletedPolicies();
    loadDeletionRequests();
  }, [refreshDeletedPolicies, loadDeletionRequests]);

  // Filter deleted policies
  const filteredPolicies = deletedPolicies.filter(policy => {
    const matchesSearch = 
      policy.policyholderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      policy.insuranceCompany.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesSearch;
  });

  const handleRestore = async (policy: DeletedPolicy) => {
    setPolicyToRestore(policy);
    setShowRestoreModal(true);
  };

  const handleRestoreConfirm = async () => {
    if (!policyToRestore) return;

    // Prevent multiple clicks
    if (isRestoring === policyToRestore.id) {
      return;
    }

    try {
      setIsRestoring(policyToRestore.id);
      await restorePolicy(policyToRestore);
      setSelectedPolicy(null);
      setShowRestoreModal(false);
      setPolicyToRestore(null);
      // No need to explicitly refresh as the context handles it
    } catch (error) {
      console.error('Error restoring policy:', error);
    } finally {
      setIsRestoring(null);
    }
  };

  const handleRestoreCancel = () => {
    setShowRestoreModal(false);
    setPolicyToRestore(null);
  };

  const handlePermanentDelete = async (policy: DeletedPolicy) => {
    setPolicyToPermanentlyDelete(policy);
    setShowPermanentDeleteModal(true);
  };

  const handlePermanentDeleteConfirm = async () => {
    if (!policyToPermanentlyDelete) return;

    // Prevent multiple clicks
    if (isPermanentlyDeleting === policyToPermanentlyDelete.id) {
      return;
    }

    try {
      setIsPermanentlyDeleting(policyToPermanentlyDelete.id);
      await permanentlyDeletePolicy(policyToPermanentlyDelete.id, policyToPermanentlyDelete.policyholderName);
      setSelectedPolicy(null);
      setShowPermanentDeleteModal(false);
      setPolicyToPermanentlyDelete(null);
      // No need to explicitly refresh as the context handles it
    } catch (error) {
      console.error('Error permanently deleting policy:', error);
    } finally {
      setIsPermanentlyDeleting(null);
    }
  };

  const handlePermanentDeleteCancel = () => {
    setShowPermanentDeleteModal(false);
    setPolicyToPermanentlyDelete(null);
  };

  const handleApproveDeletion = async (requestId: string, policyId: string, reviewComments?: string) => {
    if (!user) return;
    
    try {
      // Update the request status to approved
      await policyDeletionRequestService.updateDeletionRequestStatus(
        requestId, 
        'approved', 
        user.userId || user.id, 
        user.displayName, 
        reviewComments
      );
      
      // Permanently delete the policy
      await permanentlyDeletePolicy(policyId, 'Approved permanent deletion');
      
      // Refresh data
      await Promise.all([
        refreshDeletedPolicies(),
        loadDeletionRequests()
      ]);
    } catch (error) {
      console.error('Error approving deletion:', error);
      throw error;
    }
  };

  const handleRejectDeletion = async (requestId: string, reviewComments?: string) => {
    if (!user) return;
    
    try {
      await policyDeletionRequestService.updateDeletionRequestStatus(
        requestId, 
        'rejected', 
        user.userId || user.id, 
        user.displayName, 
        reviewComments
      );
      
      await loadDeletionRequests();
    } catch (error) {
      console.error('Error rejecting deletion:', error);
      throw error;
    }
  };

  const PolicyDetailsModal = ({ policy, onClose }: { policy: DeletedPolicy; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-sharp max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Policy Details</h3>
            <button
              onClick={onClose}
              className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300"
            >
              ✕
            </button>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Holder</label>
                <p className="text-gray-900 dark:text-white">{policy.policyholderName}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Number</label>
                <p className="text-gray-900 dark:text-white">{policy.policyNumber}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Insurance Company</label>
                <p className="text-gray-900 dark:text-white">{policy.insuranceCompany}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Policy Type</label>
                <p className="text-gray-900 dark:text-white">{policy.policyType}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Start Date</label>
                <p className="text-gray-900 dark:text-white">{safeFormatDate(policy.policyStartDate || policy.startDate, 'PPP')}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Expiry Date</label>
                <p className="text-gray-900 dark:text-white">{safeFormatDate(policy.policyEndDate || policy.expiryDate, 'PPP')}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Premium Amount</label>
                <p className="text-gray-900 dark:text-white">₹{(policy.premiumAmount || 0).toLocaleString()}</p>
              </div>
              <div>
                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Deleted Date</label>
                <p className="text-red-600">{format(policy.deletedAt, 'PPp')}</p>
              </div>
            </div>

            {/* Additional fields for vehicle insurance */}
            {policy.policyType === 'Vehicle' && (
              <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
                <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Vehicle Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  {policy.registrationNo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Registration No</label>
                      <p className="text-gray-900 dark:text-white">{policy.registrationNo}</p>
                    </div>
                  )}
                  {policy.engineNo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Engine No</label>
                      <p className="text-gray-900 dark:text-white">{policy.engineNo}</p>
                    </div>
                  )}
                  {policy.chasisNo && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Chassis No</label>
                      <p className="text-gray-900 dark:text-white">{policy.chasisNo}</p>
                    </div>
                  )}
                  {policy.idv && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">IDV</label>
                      <p className="text-gray-900 dark:text-white">₹{policy.idv}</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="flex gap-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              onClick={() => handleRestore(policy)}
              disabled={isRestoring === policy.id || isPermanentlyDeleting === policy.id}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded-sharp hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <RotateCcw className="h-4 w-4" />
              {isRestoring === policy.id ? 'Restoring...' : 'Restore Policy'}
            </button>
            <button
              onClick={() => handlePermanentDelete(policy)}
              disabled={isRestoring === policy.id || isPermanentlyDeleting === policy.id}
              className="flex-1 bg-red-600 text-white px-4 py-2 rounded-sharp hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 flex items-center justify-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              {isPermanentlyDeleting === policy.id ? 'Deleting...' : 'Delete Forever'}
            </button>
            <button
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
              <RotateCcw className="h-8 w-8 text-purple-600" />
              Restore Policies
            </h1>
            <p className="text-gray-600 dark:text-gray-300 mt-2">
              Restore deleted policies back to active status
            </p>
          </div>
          <button
            onClick={refreshDeletedPolicies}
            className="bg-purple-600 text-white px-4 py-2 rounded-sharp hover:bg-purple-700 transition-colors duration-200 flex items-center gap-2 shadow-sm"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm mb-6 transition-colors duration-200">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('deleted')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'deleted'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Deleted Policies
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {deletedPolicies.length}
                </span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors duration-200 ${
                activeTab === 'requests'
                  ? 'border-purple-500 text-purple-600 dark:text-purple-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-4 w-4" />
                Deletion Requests
                <span className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 px-2 py-1 rounded-full text-xs">
                  {deletionRequests.filter(req => req.status === 'pending').length}
                </span>
              </div>
            </button>
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {activeTab === 'deleted' ? (
        <>
          {/* Search */}
          <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-6 mb-6 transition-colors duration-200">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-4 w-4" />
              <input
                type="text"
                placeholder="Search by policy holder, policy number, or insurance company..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-purple-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
              />
            </div>
            <div className="flex items-center justify-between mt-4 text-sm text-gray-600 dark:text-gray-300">
              <span className="flex items-center gap-2">
                <Trash2 className="h-4 w-4" />
                Total deleted policies: {filteredPolicies.length}
              </span>
              {filteredPolicies.length > 0 && (
                <span className="flex items-center gap-2 text-orange-600 dark:text-orange-400">
                  <AlertTriangle className="h-4 w-4" />
                  Review carefully before restoring
                </span>
              )}
            </div>
          </div>

          {/* Deleted Policies List */}
          <div className="space-y-4">
        {filteredPolicies.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm p-8 text-center transition-colors duration-200">
            <RotateCcw className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No deleted policies found</h3>
            <p className="text-gray-600 dark:text-gray-300">
              {searchTerm
                ? 'Try adjusting your search terms to see more results.'
                : 'Great! No policies are currently in the deleted state.'}
            </p>
          </div>
        ) : (
          filteredPolicies.map((policy) => (
            <div
              key={policy.id}
              className="bg-white dark:bg-gray-800 rounded-sharp shadow-sm hover:shadow-sm transition-all duration-200 border-l-4 border-red-400"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-4 flex-1">
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-red-100 rounded-sharp flex items-center justify-center">
                        <Trash2 className="h-6 w-6 text-red-600" />
                      </div>
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-1">
                        {policy.policyholderName}
                      </h3>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-300 mb-3">
                        <span className="flex items-center gap-1">
                          <FileText className="h-3 w-3" />
                          {policy.policyNumber}
                        </span>
                        <span className="flex items-center gap-1">
                          <Building className="h-3 w-3" />
                          {policy.insuranceCompany}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded text-xs">
                          {policy.policyType}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          Expires: {safeFormatDate(policy.policyEndDate, 'PP')}
                        </span>
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          Premium: ₹{(policy.premiumAmount || 0).toLocaleString()}
                        </span>
                      </div>
                      
                      <div className="mt-2 text-sm text-red-600 dark:text-red-400">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" />
                          Deleted on: {format(policy.deletedAt, 'PPp')}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedPolicy(policy)}
                      className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-3 py-2 rounded-sharp hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Eye className="h-4 w-4" />
                      View
                    </button>
                    <button
                      onClick={() => handleRestore(policy)}
                      disabled={isRestoring === policy.id || isPermanentlyDeleting === policy.id}
                      className="bg-green-600 text-white px-3 py-2 rounded-sharp hover:bg-green-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                    >
                      <RotateCcw className="h-4 w-4" />
                      {isRestoring === policy.id ? 'Restoring...' : 'Restore'}
                    </button>
                    <button
                      onClick={() => handlePermanentDelete(policy)}
                      disabled={isRestoring === policy.id || isPermanentlyDeleting === policy.id}
                      className="bg-red-600 text-white px-3 py-2 rounded-sharp hover:bg-red-700 disabled:opacity-50 transition-colors duration-200 flex items-center gap-2"
                    >
                      <Trash2 className="h-4 w-4" />
                      {isPermanentlyDeleting === policy.id ? 'Deleting...' : 'Delete Forever'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
        </>
      ) : (
        <DeletionRequestsTab
          userRole={user?.role || 'user'}
          currentUserId={user?.userId || ''}
          onApproveDeletion={handleApproveDeletion}
          onRejectDeletion={handleRejectDeletion}
          deletionRequests={deletionRequests}
          onRefresh={loadDeletionRequests}
        />
      )}

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <PolicyDetailsModal
          policy={selectedPolicy}
          onClose={() => setSelectedPolicy(null)}
        />
      )}

      {/* Restore Confirmation Modal */}
      <ConfirmationModal
        isOpen={showRestoreModal}
        onClose={handleRestoreCancel}
        onConfirm={handleRestoreConfirm}
        title="Restore Policy"
        message={`Are you sure you want to restore the policy for ${policyToRestore?.policyholderName}? This will move the policy back to active policies.`}
        confirmText="Restore"
        cancelText="Cancel"
        type="warning"
      />

      {/* Permanent Delete Confirmation Modal with Password */}
      <ConfirmationModal
        isOpen={showPermanentDeleteModal}
        onClose={handlePermanentDeleteCancel}
        onConfirm={handlePermanentDeleteConfirm}
        title="Permanently Delete Policy"
        message={`You are about to PERMANENTLY delete the policy for ${policyToPermanentlyDelete?.policyholderName}. This action cannot be undone and the policy data will be lost forever. This action requires administrator privileges. Please enter your password to confirm this critical action.`}
        confirmText="Delete Forever"
        cancelText="Cancel"
        type="danger"
        requirePassword={true}
        requireAdminRole={true}
        currentUserRole={user?.role}
        onPasswordValidation={validateUserPassword}
      />
      </div>
    </div>
  );
}
