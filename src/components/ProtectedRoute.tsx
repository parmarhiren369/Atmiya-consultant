import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { AlertTriangle, XCircle, Clock, CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, teamMember, isTeamMember, pageAccess, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showWarning, setShowWarning] = useState(false);
  const [warningMessage, setWarningMessage] = useState('');
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAccessAndSubscription = async () => {
      // Team members: check if they have access to current page
      if (isTeamMember && teamMember) {
        const currentPath = location.pathname;
        const hasAccess = pageAccess.includes(currentPath);
        
        console.log('ProtectedRoute check - Path:', currentPath, 'Has access:', hasAccess, 'PageAccess:', pageAccess);
        
        if (!hasAccess) {
          // Redirect to first accessible page
          const firstPage = pageAccess[0] || '/dashboard';
          navigate(firstPage);
          return;
        }
        
        setShowWarning(false);
        return;
      }
      
      if (!user) {
        setShouldRedirect(true);
        return;
      }

      // Admins don't need subscription checks
      if (user.role === 'admin') {
        setShowWarning(false);
        return;
      }

      // Check if user can access the system
      const canAccess = firebaseAuthService.canAccessSystem(user);
      
      if (!canAccess) {
        // User is expired or locked
        if (user.isLocked) {
          toast.error('Your account has been locked. Please contact support.');
          setShouldRedirect(true);
        } else {
          // Subscription expired - show error but don't redirect (let component handle it)
          console.log('User subscription expired');
        }
        return;
      }

      // Check remaining days and show warning if needed
      const remaining = firebaseAuthService.getDaysRemaining(user);

      if (remaining <= 5 && remaining > 0) {
        setShowWarning(true);
        if (user.subscriptionStatus === 'trial') {
          setWarningMessage(`Your free trial expires in ${remaining} day${remaining === 1 ? '' : 's'}. Upgrade to continue using the service!`);
        } else {
          setWarningMessage(`Your subscription expires in ${remaining} day${remaining === 1 ? '' : 's'}. Please renew to avoid interruption.`);
        }
      } else {
        setShowWarning(false);
      }
    };

    checkAccessAndSubscription();
  }, [user, teamMember, isTeamMember, pageAccess, navigate, location.pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 dark:border-blue-400 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !teamMember) {
    return <Navigate to="/login" replace />;
  }

  if (shouldRedirect) {
    return <Navigate to="/pricing" replace />;
  }

  // Check if user is locked (only for regular users, not team members)
  if (user && user.isLocked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <XCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Account Locked
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Your account has been locked.
          </p>
          {user.lockedReason && (
            <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
              <p className="text-sm text-red-800 dark:text-red-200">
                <strong>Reason:</strong> {user.lockedReason}
              </p>
            </div>
          )}
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Please contact support for assistance.
          </p>
          <button
            onClick={() => navigate('/login')}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  // Check if subscription is expired (not admin)
  // Check subscription expiry (only for regular users, not team members or admins)
  if (user && user.role !== 'admin' && !firebaseAuthService.canAccessSystem(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
        <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
          <Clock className="w-16 h-16 text-orange-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            {user.subscriptionStatus === 'trial' ? 'Trial Expired' : 'Subscription Expired'}
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {user.subscriptionStatus === 'trial' 
              ? 'Your free trial has ended. Upgrade to continue using our service.'
              : 'Your subscription has expired. Please renew to continue.'}
          </p>
          <div className="space-y-3">
            <button
              onClick={() => navigate('/pricing')}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-lg hover:from-blue-700 hover:to-blue-800 font-semibold"
            >
              <CreditCard className="w-5 h-5" />
              View Plans & Subscribe
            </button>
            <button
              onClick={() => navigate('/login')}
              className="w-full px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
            >
              Back to Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Warning Banner for expiring subscriptions */}
      {showWarning && user && user.role !== 'admin' && (
        <div className="bg-gradient-to-r from-orange-500 to-red-500 text-white px-4 py-3 shadow-lg">
          <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm font-medium">{warningMessage}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate('/pricing')}
                className="px-4 py-1 bg-white text-orange-600 rounded font-semibold text-sm hover:bg-gray-100 flex-shrink-0"
              >
                Subscribe Now
              </button>
              <button
                onClick={() => setShowWarning(false)}
                className="text-white hover:text-gray-200 flex-shrink-0"
              >
                ×
              </button>
            </div>
          </div>
        </div>
      )}
      
      {children}
    </>
  );
};

export default ProtectedRoute;
