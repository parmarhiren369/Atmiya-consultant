import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Navigate, useNavigate, useLocation } from 'react-router-dom';
import { XCircle } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { user, teamMember, isTeamMember, pageAccess, loading } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    const checkAccess = async () => {
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
        return;
      }
      
      if (!user) {
        setShouldRedirect(true);
        return;
      }
    };

    checkAccess();
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
    return <Navigate to="/login" replace />;
  }

  // Check if user is locked (admin control - only for regular users, not team members)
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

  return <>{children}</>;
};

export default ProtectedRoute;
