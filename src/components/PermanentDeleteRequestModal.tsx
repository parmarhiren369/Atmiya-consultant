import { useState } from 'react';
import { X, AlertTriangle, Lock, CheckCircle } from 'lucide-react';
import { Policy } from '../types';
import toast from 'react-hot-toast';

interface PermanentDeleteRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  policy: Policy;
  onSubmitRequest: (policyId: string, reason: string, password: string) => Promise<void>;
  onPasswordValidation: (password: string) => Promise<boolean>;
}

export function PermanentDeleteRequestModal({
  isOpen,
  onClose,
  policy,
  onSubmitRequest,
  onPasswordValidation
}: PermanentDeleteRequestModalProps) {
  const [password, setPassword] = useState('');
  const [reason, setReason] = useState('');
  const [isValidating, setIsValidating] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      toast.error('Please provide a reason for permanent deletion');
      return;
    }

    if (!password) {
      setPasswordError('Please enter your password');
      return;
    }

    setIsValidating(true);
    setPasswordError('');

    try {
      // Validate password
      const isValidPassword = await onPasswordValidation(password);
      if (!isValidPassword) {
        setPasswordError('Incorrect password');
        setIsValidating(false);
        return;
      }

      // Submit the deletion request
      await onSubmitRequest(policy.id, reason, password);
      
      setShowSuccess(true);
      
      // Auto close after showing success
      setTimeout(() => {
        setShowSuccess(false);
        handleClose();
      }, 2000);

    } catch (error) {
      console.error('Error submitting deletion request:', error);
      toast.error('Failed to submit deletion request');
      setIsValidating(false);
    }
  };

  const handleClose = () => {
    setPassword('');
    setReason('');
    setPasswordError('');
    setShowSuccess(false);
    setIsValidating(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-red-500" />
            Request Permanent Deletion
          </h2>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {showSuccess ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
              Request Submitted Successfully
            </h3>
            <p className="text-gray-600 dark:text-gray-300">
              Your request for permanent deletion has been sent to the administrators for review.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
              <div className="flex items-start">
                <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5 mr-3 flex-shrink-0" />
                <div>
                  <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                    Warning: Permanent Deletion Request
                  </h4>
                  <p className="text-sm text-red-700 dark:text-red-400">
                    You are requesting permanent deletion of policy for <strong>{policy.policyholderName}</strong> 
                    (Policy: {policy.policyNumber}). This action requires admin approval and once approved, 
                    the policy data will be permanently lost.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Permanent Deletion *
              </label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Please explain why this policy needs to be permanently deleted..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm with Password *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setPasswordError('');
                  }}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter your password"
                  required
                />
              </div>
              {passwordError && (
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{passwordError}</p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isValidating || !reason.trim() || !password}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 disabled:cursor-not-allowed text-white rounded-lg transition-colors duration-200"
              >
                {isValidating ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
