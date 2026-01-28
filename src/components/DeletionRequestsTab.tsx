import { useState, useEffect } from 'react';
import { CheckCircle, X, AlertTriangle, User, Calendar, MessageSquare } from 'lucide-react';
import { PolicyDeletionRequest } from '../types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

interface DeletionRequestsTabProps {
  userRole: 'admin' | 'user';
  currentUserId: string;
  onApproveDeletion: (requestId: string, policyId: string, reviewComments?: string) => Promise<void>;
  onRejectDeletion: (requestId: string, reviewComments?: string) => Promise<void>;
  deletionRequests: PolicyDeletionRequest[];
  onRefresh: () => void;
}

export function DeletionRequestsTab({
  userRole,
  currentUserId,
  onApproveDeletion,
  onRejectDeletion,
  deletionRequests,
  onRefresh
}: DeletionRequestsTabProps) {
  const [selectedRequest, setSelectedRequest] = useState<PolicyDeletionRequest | null>(null);
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewComments, setReviewComments] = useState('');
  const [reviewAction, setReviewAction] = useState<'approve' | 'reject'>('approve');
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    onRefresh();
  }, [onRefresh]);

  const handleReview = (request: PolicyDeletionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setReviewAction(action);
    setReviewComments('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedRequest) return;

    setIsProcessing(true);
    try {
      if (reviewAction === 'approve') {
        await onApproveDeletion(selectedRequest.id, selectedRequest.policyId, reviewComments);
        toast.success('Deletion request approved and policy permanently deleted');
      } else {
        await onRejectDeletion(selectedRequest.id, reviewComments);
        toast.success('Deletion request rejected');
      }
      
      setShowReviewModal(false);
      setSelectedRequest(null);
      onRefresh();
    } catch (error) {
      console.error('Error processing review:', error);
      toast.error(`Failed to ${reviewAction} deletion request`);
    } finally {
      setIsProcessing(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/20';
      case 'approved': return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/20';
      case 'rejected': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  const filteredRequests = userRole === 'admin' 
    ? deletionRequests 
    : deletionRequests.filter(req => req.requestedBy === currentUserId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
          {userRole === 'admin' ? 'Policy Deletion Requests' : 'My Deletion Requests'}
        </h3>
        <button
          onClick={onRefresh}
          className="px-3 py-1 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
        >
          Refresh
        </button>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-8 text-center transition-colors duration-200">
          <AlertTriangle className="h-12 w-12 text-gray-400 dark:text-gray-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-2">
            No deletion requests found
          </h3>
          <p className="text-gray-600 dark:text-gray-300">
            {userRole === 'admin' 
              ? 'No users have submitted policy deletion requests.'
              : 'You have not submitted any policy deletion requests.'}
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div
              key={request.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 border-l-4 border-yellow-400"
            >
              <div className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                        {request.policyholderName}
                      </h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(request.status)}`}>
                        {request.status.charAt(0).toUpperCase() + request.status.slice(1)}
                      </span>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-300 mb-2">
                      <strong>Policy Number:</strong> {request.policyNumber}
                    </p>
                    
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400 mb-3">
                      <div className="flex items-center">
                        <User className="h-4 w-4 mr-1" />
                        Requested by: {request.requestedByName}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-1" />
                        {format(request.requestDate, 'MMM dd, yyyy at HH:mm')}
                      </div>
                    </div>

                    {request.requestReason && (
                      <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 mb-3">
                        <p className="text-sm text-gray-700 dark:text-gray-300">
                          <strong>Reason:</strong> {request.requestReason}
                        </p>
                      </div>
                    )}

                    {request.status !== 'pending' && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3">
                        <div className="flex items-center text-sm text-blue-700 dark:text-blue-300 mb-1">
                          <MessageSquare className="h-4 w-4 mr-1" />
                          Reviewed by {request.reviewedByName} on {request.reviewDate && format(request.reviewDate, 'MMM dd, yyyy at HH:mm')}
                        </div>
                        {request.reviewComments && (
                          <p className="text-sm text-blue-700 dark:text-blue-300">
                            <strong>Comments:</strong> {request.reviewComments}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                  
                  {userRole === 'admin' && request.status === 'pending' && (
                    <div className="flex gap-2 ml-4">
                      <button
                        onClick={() => handleReview(request, 'approve')}
                        className="bg-green-600 text-white px-3 py-2 rounded-lg hover:bg-green-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <CheckCircle className="h-4 w-4" />
                        Approve
                      </button>
                      <button
                        onClick={() => handleReview(request, 'reject')}
                        className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors duration-200 flex items-center gap-2"
                      >
                        <X className="h-4 w-4" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Review Modal */}
      {showReviewModal && selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                {reviewAction === 'approve' ? 'Approve' : 'Reject'} Deletion Request
              </h2>
              <button
                onClick={() => setShowReviewModal(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div className={`p-4 rounded-lg ${reviewAction === 'approve' ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                <p className={`text-sm ${reviewAction === 'approve' ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                  You are about to <strong>{reviewAction}</strong> the deletion request for policy of{' '}
                  <strong>{selectedRequest.policyholderName}</strong> (Policy: {selectedRequest.policyNumber}).
                  {reviewAction === 'approve' && (
                    <span className="block mt-2 font-medium">
                      Warning: Approving this request will permanently delete the policy data. This action cannot be undone.
                    </span>
                  )}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Review Comments (Optional)
                </label>
                <textarea
                  value={reviewComments}
                  onChange={(e) => setReviewComments(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Add any comments about your decision..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowReviewModal(false)}
                  disabled={isProcessing}
                  className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  disabled={isProcessing}
                  className={`px-4 py-2 text-white rounded-lg transition-colors duration-200 disabled:opacity-50 ${
                    reviewAction === 'approve' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {isProcessing ? 'Processing...' : `${reviewAction === 'approve' ? 'Approve' : 'Reject'} Request`}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
