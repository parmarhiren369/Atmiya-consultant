import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { razorpayService, PaymentHistory } from '../services/razorpayService';
import { supabaseAuthService } from '../services/supabaseAuthService';
import toast from 'react-hot-toast';
import { 
  CreditCard, Calendar, CheckCircle, XCircle, Clock, 
  TrendingUp, Receipt, AlertCircle, ArrowRight 
} from 'lucide-react';

export function SubscriptionPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [loading, setLoading] = useState(true);

  const loadPaymentHistory = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      const history = await razorpayService.getPaymentHistory(user.id);
      setPaymentHistory(history);
    } catch (error) {
      console.error('Error loading payment history:', error);
      toast.error('Failed to load payment history');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }

    loadPaymentHistory();
  }, [user, navigate, loadPaymentHistory]);

  const getStatusBadge = (status: string) => {
    const badges = {
      pending: { color: 'bg-yellow-100 text-yellow-800', icon: <Clock className="w-4 h-4" />, text: 'Pending' },
      success: { color: 'bg-green-100 text-green-800', icon: <CheckCircle className="w-4 h-4" />, text: 'Success' },
      failed: { color: 'bg-red-100 text-red-800', icon: <XCircle className="w-4 h-4" />, text: 'Failed' },
      refunded: { color: 'bg-gray-100 text-gray-800', icon: <AlertCircle className="w-4 h-4" />, text: 'Refunded' }
    };

    const badge = badges[status as keyof typeof badges] || badges.pending;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const getSubscriptionStatusColor = () => {
    if (!user) return 'bg-gray-100 text-gray-800';

    switch (user.subscriptionStatus) {
      case 'trial':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200';
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
      case 'expired':
        return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  if (!user) return null;

  const daysRemaining = supabaseAuthService.getDaysRemaining(user);
  const isExpired = user.subscriptionStatus === 'expired';
  const isTrial = user.subscriptionStatus === 'trial';

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
            <CreditCard className="w-8 h-8 text-blue-600" />
            My Subscription
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">
            Manage your subscription and view payment history
          </p>
        </div>

        {/* Current Subscription Status */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
                Current Status
              </h2>
              <div className="flex items-center gap-3">
                <span className={`px-4 py-2 rounded-full text-sm font-medium ${getSubscriptionStatusColor()}`}>
                  {user.subscriptionStatus === 'trial' ? 'Free Trial' : 
                   user.subscriptionStatus === 'active' ? 'Active Subscription' : 
                   'Expired'}
                </span>
              </div>
            </div>
            
            {isExpired && (
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-semibold shadow-lg transition-all"
              >
                Renew Now
                <ArrowRight className="w-5 h-5" />
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Days Remaining */}
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <Calendar className="w-5 h-5 text-blue-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Days Remaining</span>
              </div>
              <div className={`text-3xl font-bold ${daysRemaining <= 3 ? 'text-red-600' : 'text-blue-600'}`}>
                {daysRemaining > 0 ? daysRemaining : 0}
              </div>
            </div>

            {/* Start Date */}
            <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Start Date</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {isTrial && user.trialStartDate
                  ? new Date(user.trialStartDate).toLocaleDateString()
                  : user.subscriptionStartDate
                  ? new Date(user.subscriptionStartDate).toLocaleDateString()
                  : '-'}
              </div>
            </div>

            {/* End Date */}
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-2">
                <TrendingUp className="w-5 h-5 text-purple-600" />
                <span className="text-sm font-medium text-gray-600 dark:text-gray-400">End Date</span>
              </div>
              <div className="text-lg font-semibold text-gray-900 dark:text-white">
                {isTrial && user.trialEndDate
                  ? new Date(user.trialEndDate).toLocaleDateString()
                  : user.subscriptionEndDate
                  ? new Date(user.subscriptionEndDate).toLocaleDateString()
                  : '-'}
              </div>
            </div>
          </div>

          {/* Warning Messages */}
          {daysRemaining <= 5 && daysRemaining > 0 && (
            <div className="mt-6 bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 rounded">
              <div className="flex items-start">
                <AlertCircle className="w-5 h-5 text-yellow-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                    Your {isTrial ? 'trial' : 'subscription'} expires in {daysRemaining} days!
                  </p>
                  <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                    {isTrial 
                      ? 'Subscribe now to continue enjoying all features without interruption.' 
                      : 'Renew your subscription to avoid service disruption.'}
                  </p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-2 text-sm text-yellow-800 dark:text-yellow-200 font-semibold hover:underline flex items-center gap-1"
                  >
                    View Plans <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {isExpired && (
            <div className="mt-6 bg-red-50 dark:bg-red-900/20 border-l-4 border-red-400 p-4 rounded">
              <div className="flex items-start">
                <XCircle className="w-5 h-5 text-red-600 mr-3 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-red-800 dark:text-red-200">
                    Your {isTrial ? 'trial has' : 'subscription has'} expired
                  </p>
                  <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                    Subscribe now to regain access to all features and your data.
                  </p>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="mt-2 text-sm text-red-800 dark:text-red-200 font-semibold hover:underline flex items-center gap-1"
                  >
                    Subscribe Now <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Payment History */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
              <Receipt className="w-6 h-6 text-blue-600" />
              Payment History
            </h2>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <Clock className="w-12 h-12 animate-spin text-blue-500 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400">Loading payment history...</p>
            </div>
          ) : paymentHistory.length === 0 ? (
            <div className="text-center py-12">
              <Receipt className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 dark:text-gray-400 mb-4">No payment history yet</p>
              <button
                onClick={() => navigate('/pricing')}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                View subscription plans
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Description</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Amount</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Payment ID</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {paymentHistory.map((payment) => (
                    <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        {new Date(payment.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                        {payment.description || `${payment.subscriptionPlan} plan`}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900 dark:text-white">
                        ₹{payment.amount.toLocaleString('en-IN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(payment.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400 font-mono">
                        {payment.razorpayPaymentId ? payment.razorpayPaymentId.substring(0, 20) + '...' : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="mt-8 flex gap-4 justify-center">
          <button
            onClick={() => navigate('/')}
            className="px-6 py-3 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 font-medium"
          >
            Back to Dashboard
          </button>
          <button
            onClick={() => navigate('/pricing')}
            className="px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 font-medium shadow-lg"
          >
            View All Plans
          </button>
        </div>
      </div>
    </div>
  );
}
