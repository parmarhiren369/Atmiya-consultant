import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { razorpayService, SubscriptionPlan } from '../services/razorpayService';
import toast from 'react-hot-toast';
import { Check, Loader2, Sparkles, Zap, Crown } from 'lucide-react';

export function PricingPlans() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingPlan, setProcessingPlan] = useState<string | null>(null);

  useEffect(() => {
    loadPlans();
  }, []);

  const loadPlans = async () => {
    try {
      setLoading(true);
      const fetchedPlans = await razorpayService.getSubscriptionPlans();
      setPlans(fetchedPlans);
    } catch (error) {
      console.error('Error loading plans:', error);
      toast.error('Failed to load subscription plans');
    } finally {
      setLoading(false);
    }
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    // Check if user is logged in
    if (!user) {
      toast.error('Please login first to subscribe');
      // Store intended plan in sessionStorage
      sessionStorage.setItem('intendedPlan', plan.name);
      navigate('/login');
      return;
    }

    if (user.role === 'admin') {
      toast.error('Admin accounts do not require subscription');
      return;
    }

    try {
      setProcessingPlan(plan.name);

      console.log('Creating recurring subscription via n8n for plan:', plan.name);
      
      toast('Creating your subscription with autopay...', { icon: '🔄' });

      // Call n8n webhook to create Razorpay subscription
      // Set VITE_N8N_SUBSCRIPTION_WEBHOOK_URL in your .env file
      const n8nWebhookUrl = import.meta.env.VITE_N8N_SUBSCRIPTION_WEBHOOK_URL || '';
      
      if (!n8nWebhookUrl) {
        throw new Error('Subscription webhook not configured. Please contact support.');
      }
      
      const response = await fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: user.id,
          planName: plan.name,
          userEmail: user.email,
          userName: user.displayName || 'Customer',
          amount: plan.priceInr.toString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to create subscription via n8n');
      }

      const subscriptionData = await response.json();
      
      console.log('✅ Subscription created via n8n:', subscriptionData);

      toast.success('Subscription created! Opening payment page...', {
        duration: 3000,
      });

      // n8n returns an array, get the first item
      const subscription = Array.isArray(subscriptionData) ? subscriptionData[0] : subscriptionData;

      // Open the short_url from n8n response
      if (subscription && subscription.short_url) {
        window.open(subscription.short_url, '_blank');
        
        toast('Complete payment to activate recurring billing. Choose UPI Autopay for automatic renewals!', {
          icon: '💳',
          duration: 7000,
        });
      } else {
        throw new Error('No payment URL received from n8n');
      }

      setProcessingPlan(null);
    } catch (error: unknown) {
      console.error('Error creating subscription:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to create subscription. Please try again.';
      toast.error(errorMessage);
      setProcessingPlan(null);
    }
  };

  const getPlanIcon = (planName: string) => {
    switch (planName) {
      case 'basic':
        return <Check className="w-8 h-8" />;
      case 'standard':
        return <Zap className="w-8 h-8" />;
      case 'premium':
        return <Sparkles className="w-8 h-8" />;
      case 'enterprise':
        return <Crown className="w-8 h-8" />;
      default:
        return <Check className="w-8 h-8" />;
    }
  };

  const getPlanColor = (planName: string) => {
    switch (planName) {
      case 'basic':
        return 'from-blue-500 to-blue-600';
      case 'standard':
        return 'from-green-500 to-green-600';
      case 'premium':
        return 'from-purple-500 to-purple-600';
      case 'enterprise':
        return 'from-amber-500 to-amber-600';
      default:
        return 'from-gray-500 to-gray-600';
    }
  };

  const isRecommended = (planName: string) => planName === 'standard';

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Loading subscription plans...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-16">
          <h1 className="text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Choose Your Plan
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Start with a 15-day free trial. No credit card required. Cancel anytime.
          </p>
        </div>

        {/* Pricing Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
          {plans.map((plan) => (
            <div
              key={plan.id}
              className={`relative bg-white dark:bg-gray-800 rounded-2xl shadow-xl overflow-hidden transition-transform hover:scale-105 ${
                isRecommended(plan.name) ? 'ring-4 ring-green-500' : ''
              }`}
            >
              {/* Recommended Badge */}
              {isRecommended(plan.name) && (
                <div className="absolute top-0 right-0 bg-green-500 text-white px-4 py-1 text-sm font-semibold rounded-bl-lg">
                  MOST POPULAR
                </div>
              )}

              {/* Plan Header */}
              <div className={`bg-gradient-to-r ${getPlanColor(plan.name)} text-white p-8`}>
                <div className="flex items-center justify-between mb-4">
                  {getPlanIcon(plan.name)}
                  {plan.name !== 'enterprise' && (
                    <div className="text-right">
                      <div className="text-4xl font-bold">₹{plan.priceInr.toLocaleString('en-IN')}</div>
                      <div className="text-sm opacity-90">/{plan.durationDays} days</div>
                    </div>
                  )}
                </div>
                <h3 className="text-2xl font-bold mb-2">{plan.displayName}</h3>
                <p className="text-sm opacity-90">{plan.description}</p>
              </div>

              {/* Features List */}
              <div className="p-8">
                <ul className="space-y-4 mb-8">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start">
                      <Check className="w-5 h-5 text-green-500 mr-3 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700 dark:text-gray-300">{feature}</span>
                    </li>
                  ))}
                </ul>

                {/* Subscribe Button */}
                <button
                  onClick={() => plan.name === 'enterprise' ? window.location.href = 'mailto:support@demopolicymanager.com?subject=Enterprise Plan Inquiry' : handleSubscribe(plan)}
                  disabled={processingPlan === plan.name}
                  className={`w-full py-4 px-6 rounded-lg font-semibold text-white transition-all ${
                    processingPlan === plan.name
                      ? 'bg-gray-400 cursor-not-allowed'
                      : plan.name === 'enterprise'
                      ? 'bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700'
                      : isRecommended(plan.name)
                      ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700'
                      : 'bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700'
                  } shadow-lg hover:shadow-xl`}
                >
                  {processingPlan === plan.name ? (
                    <span className="flex items-center justify-center">
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Processing...
                    </span>
                  ) : plan.name === 'enterprise' ? (
                    'Contact Us'
                  ) : (
                    'Subscribe Now'
                  )}
                </button>

                {plan.durationDays >= 90 && (
                  <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-3">
                    Save {plan.durationDays === 90 ? '20%' : '40%'} compared to monthly
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* FAQs */}
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 max-w-4xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 text-center">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                What happens after the 15-day free trial?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                After your 15-day free trial ends, you'll need to choose a subscription plan to continue using the platform. Your data remains safe and will be accessible once you subscribe.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                Can I change my plan later?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes! You can upgrade or change your plan at any time. The remaining days from your current plan will be adjusted accordingly.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                What payment methods do you accept?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                We accept all major credit/debit cards, UPI, net banking, and wallet payments through Razorpay's secure payment gateway.
              </p>
            </div>
            <div>
              <h3 className="font-semibold text-lg text-gray-900 dark:text-white mb-2">
                Is there a refund policy?
              </h3>
              <p className="text-gray-600 dark:text-gray-400">
                Yes, we offer a 7-day money-back guarantee. If you're not satisfied with the service, contact us within 7 days of purchase for a full refund.
              </p>
            </div>
          </div>
        </div>

        {/* Back to Dashboard */}
        {user && (
          <div className="text-center mt-8">
            <button
              onClick={() => navigate('/')}
              className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
            >
              ← Back to Dashboard
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
