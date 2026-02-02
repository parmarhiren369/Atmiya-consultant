import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { 
  User, 
  Mail, 
  Calendar, 
  Shield, 
  CheckCircle,
  AlertCircle,
  Crown
} from 'lucide-react';

export function Profile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const formatDate = (date: Date | undefined) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-gray-600 dark:text-gray-400">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            My Profile
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Manage your account settings
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm overflow-hidden mb-6">
          {/* Header Section with Gradient */}
          <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-8 text-white">
            <div className="flex items-center space-x-4">
              <div className="bg-white/20 backdrop-blur-sm p-4 rounded-full">
                <User className="h-12 w-12" />
              </div>
              <div>
                <h2 className="text-2xl font-bold">{user.displayName}</h2>
                <p className="text-blue-100 flex items-center space-x-2 mt-1">
                  <Mail className="h-4 w-4" />
                  <span>{user.email}</span>
                </p>
              </div>
            </div>
          </div>

          {/* Profile Information */}
          <div className="p-8 space-y-6">
            {/* Account Details Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span>Account Details</span>
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Full Name
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.displayName}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Email Address
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {user.email}
                  </p>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Account Role
                  </label>
                  <div className="flex items-center space-x-2">
                    {user.role === 'admin' ? (
                      <Crown className="h-4 w-4 text-yellow-500" />
                    ) : (
                      <User className="h-4 w-4 text-blue-500" />
                    )}
                    <span className="text-gray-900 dark:text-white font-medium capitalize">
                      {user.role}
                    </span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-500 dark:text-gray-400">
                    Member Since
                  </label>
                  <p className="text-gray-900 dark:text-white font-medium">
                    {formatDate(user.createdAt)}
                  </p>
                </div>
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-gray-200 dark:border-gray-700"></div>

            {/* Account Status Section */}
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center space-x-2">
                <CheckCircle className="h-5 w-5 text-green-600" />
                <span>Account Status</span>
              </h3>

              <div className="space-y-4">
                {/* Status Badge */}
                <div className="flex items-center justify-between flex-wrap gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
                      Current Status
                    </p>
                    <div className="inline-flex items-center space-x-2 px-4 py-2 rounded-full border bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800">
                      <CheckCircle className="h-4 w-4" />
                      <span className="font-medium">Active</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                      Account Type
                    </p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">
                      {user.role === 'admin' ? 'Admin Account' : 'Full Access'}
                    </p>
                  </div>
                </div>

                {user.role === 'admin' && (
                  <div className="p-4 rounded-sharp bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800">
                    <div className="flex items-center space-x-3">
                      <Crown className="h-5 w-5 text-yellow-600 dark:text-yellow-400" />
                      <p className="text-yellow-900 dark:text-yellow-200 font-medium">
                        You have an admin account with full access to all features.
                      </p>
                    </div>
                  </div>
                )}

                {user.role !== 'admin' && (
                  <div className="p-4 rounded-sharp bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      <p className="text-blue-900 dark:text-blue-200 font-medium">
                        You have full access to all features.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Account Locked Warning */}
        {user.isLocked && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-card p-6 mb-6">
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="text-lg font-semibold text-red-900 dark:text-red-200 mb-1">
                  Account Locked
                </h3>
                <p className="text-red-700 dark:text-red-300 mb-2">
                  Your account has been locked.
                </p>
                {user.lockedReason && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Reason: {user.lockedReason}
                  </p>
                )}
                {user.lockedAt && (
                  <p className="text-sm text-red-600 dark:text-red-400">
                    Locked on: {formatDate(user.lockedAt)}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Security Information */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-card p-6">
          <div className="flex items-start space-x-3">
            <Shield className="h-6 w-6 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-lg font-semibold text-blue-900 dark:text-blue-200 mb-1">
                Account Security
              </h3>
              <p className="text-blue-700 dark:text-blue-300 text-sm">
                Your account is secured with industry-standard encryption. Contact support if you need to update your password or have any security concerns.
              </p>
            </div>
          </div>
        </div>

        {/* Support Button */}
        <div className="mt-6 flex justify-center">
          <button
            onClick={() => navigate('/support')}
            className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium"
          >
            <Shield className="h-5 w-5" />
            <span>Contact Support</span>
          </button>
        </div>
      </div>
    </div>
  );
}
