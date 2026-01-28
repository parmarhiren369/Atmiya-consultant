import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LoginCredentials } from '../types';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { Mail, Lock, CreditCard, XCircle } from 'lucide-react';
import toast from 'react-hot-toast';

const Login: React.FC = () => {
  const [credentials, setCredentials] = useState<LoginCredentials>({
    email: '',
    password: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [showExpiredModal, setShowExpiredModal] = useState(false);
  const { login, user, teamMember, isTeamMember } = useAuth();
  const navigate = useNavigate();

  // If already logged in, redirect based on user type
  if (user || teamMember) {
    // Team members go straight to dashboard
    if (isTeamMember) {
      return <Navigate to="/dashboard" replace />;
    }
    
    // Regular users - check subscription
    if (user) {
      // If subscription expired, redirect to pricing
      if (user.role !== 'admin' && user.subscriptionStatus === 'expired') {
        return <Navigate to="/pricing" replace />;
      }
      // Otherwise redirect to dashboard
      return <Navigate to="/dashboard" replace />;
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await login(credentials);
      
      // Check if there's an intended plan to subscribe to
      const intendedPlan = sessionStorage.getItem('intendedPlan');
      if (intendedPlan) {
        sessionStorage.removeItem('intendedPlan');
        navigate('/pricing');
        toast.success('Login successful! Please select your plan.');
      } else {
        // Explicitly navigate to dashboard after successful login
        navigate('/dashboard');
      }
    } catch (error: any) {
      // Login failed - show error
      console.error('Login error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoToPricing = () => {
    setShowExpiredModal(false);
    navigate('/pricing');
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setCredentials(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 flex items-center justify-center p-4">
      {/* Subscription Expired Modal */}
      {showExpiredModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl max-w-md w-full p-8 animate-in fade-in zoom-in duration-300">
            <div className="text-center">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-red-100 dark:bg-red-900/30 mb-4">
                <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
              </div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
                Subscription Required
              </h3>
              <p className="text-gray-600 dark:text-gray-400 mb-6">
                Your subscription has expired or is inactive. Please choose a plan to continue using the application.
              </p>
              <div className="space-y-3">
                <button
                  onClick={handleGoToPricing}
                  className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 px-6 rounded-lg font-semibold hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <CreditCard className="w-5 h-5" />
                  View Subscription Plans
                </button>
                <button
                  onClick={() => setShowExpiredModal(false)}
                  className="w-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 py-3 px-6 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-600 transition-all duration-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-md w-full">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/onclickslogin.png" alt="OnClicks Logo" className="w-64 h-auto object-contain" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Policy Management System
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Sign in to access the dashboard
          </p>
        </div>

        {/* Login Form */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="you@example.com"
                  value={credentials.email}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter your password"
                  value={credentials.password}
                  onChange={handleChange}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 text-white py-3 rounded-lg font-medium hover:from-blue-700 hover:to-indigo-700 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  Signing in...
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5" />
                  Sign in
                </>
              )}
            </button>
          </form>

          {/* Signup Link */}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                to="/signup"
                className="text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-medium"
              >
                Sign up for free
              </Link>
            </p>
          </div>

          {/* Trial Info */}
          <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
            <p className="text-xs text-green-800 dark:text-green-200 text-center">
              🎉 New users get <strong>15 days free trial</strong>
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-6 text-center text-sm text-gray-500 dark:text-gray-400">
          Authorized Users Only
        </p>
      </div>
    </div>
  );
};

export default Login;
