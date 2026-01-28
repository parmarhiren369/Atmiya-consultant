import { supabase, TABLES } from '../config/supabase';

// Razorpay configuration - Set these in your .env file
const RAZORPAY_KEY_ID = import.meta.env.VITE_RAZORPAY_KEY_ID || '';
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3000';

if (!RAZORPAY_KEY_ID) {
  console.warn('⚠️ Razorpay Key ID not configured. Please set VITE_RAZORPAY_KEY_ID in your .env file');
}

export interface SubscriptionPlan {
  id: string;
  name: string;
  displayName: string;
  description: string;
  priceInr: number;
  currency: string;
  durationDays: number;
  razorpayPlanId?: string;
  razorpayPaymentLink?: string;
  features: string[];
  isActive: boolean;
}

export interface PaymentHistory {
  id: string;
  userId: string;
  razorpayPaymentId?: string;
  razorpayOrderId?: string;
  razorpaySignature?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'success' | 'failed' | 'refunded';
  paymentMethod?: string;
  subscriptionPlan: string;
  subscriptionDays: number;
  subscriptionStartDate?: Date;
  subscriptionEndDate?: Date;
  description?: string;
  errorMessage?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface RazorpayOrderResponse {
  id: string;
  entity: string;
  amount: number;
  amount_paid: number;
  amount_due: number;
  currency: string;
  receipt: string;
  status: string;
  created_at: number;
}

declare global {
  interface Window {
    Razorpay: {
      new(options: Record<string, unknown>): {
        open: () => void;
      };
    };
  }
}

class RazorpayService {
  private keyId: string;

  constructor() {
    this.keyId = RAZORPAY_KEY_ID;
  }

  /**
   * Load Razorpay checkout script
   */
  async loadRazorpayScript(): Promise<boolean> {
    return new Promise((resolve) => {
      if (window.Razorpay) {
        resolve(true);
        return;
      }

      const script = document.createElement('script');
      script.src = 'https://checkout.razorpay.com/v1/checkout.js';
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => resolve(false);
      document.body.appendChild(script);
    });
  }

  /**
   * Get all active subscription plans
   */
  async getSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('is_active', true)
        .order('duration_days');

      if (error) throw error;

      return data.map(plan => ({
        id: plan.id,
        name: plan.name,
        displayName: plan.display_name,
        description: plan.description,
        priceInr: parseFloat(plan.price_inr),
        currency: plan.currency,
        durationDays: plan.duration_days,
        razorpayPlanId: plan.razorpay_plan_id,
        razorpayPaymentLink: plan.razorpay_payment_link,
        features: plan.features || [],
        isActive: plan.is_active
      }));
    } catch (error) {
      console.error('Error fetching subscription plans:', error);
      throw error;
    }
  }

  /**
   * Create Razorpay order for subscription via backend API
   */
  async createOrder(userId: string, planName: string): Promise<RazorpayOrderResponse> {
    try {
      console.log('Creating order for user:', userId, 'plan:', planName);
      
      // Get plan details first
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', planName)
        .eq('is_active', true)
        .single();

      if (planError || !planData) {
        throw new Error('Subscription plan not found');
      }

      const amount = Math.round(parseFloat(planData.price_inr) * 100);

      try {
        // Try to call backend API first
        const response = await fetch(`${BACKEND_URL}/api/create-razorpay-order`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ userId, planName }),
        });

        if (response.ok) {
          const data = await response.json();
          console.log('✅ Order created via backend:', data.order);
          return data.order;
        } else {
          throw new Error('Backend API failed');
        }
      } catch (backendError) {
        // Backend not available - show clear message to user
        console.warn('⚠️ Backend server not running. Starting in TEST MODE.');
        console.warn('⚠️ To use LIVE payments, start backend server with:');
        console.warn('   npx tsx razorpay-webhook-server.ts');
        
        // Create mock order for testing
        const orderData: RazorpayOrderResponse = {
          id: 'order_TEST_' + Date.now(),
          entity: 'order',
          amount: amount,
          amount_paid: 0,
          amount_due: amount,
          currency: 'INR',
          receipt: `receipt_${userId}_${Date.now()}`,
          status: 'created',
          created_at: Math.floor(Date.now() / 1000)
        };

        console.log('📝 Mock order created for testing:', orderData);
        console.log('⚠️ WARNING: This is a TEST order. Use test card: 4111 1111 1111 1111');

        // Create payment record
        await this.createPaymentRecord({
          userId,
          razorpayOrderId: orderData.id,
          amount: planData.price_inr,
          currency: 'INR',
          status: 'pending',
          subscriptionPlan: planName,
          subscriptionDays: planData.duration_days,
          description: `TEST - Subscription payment for ${planData.display_name}`
        });

        return orderData;
      }
    } catch (error) {
      console.error('Error creating order:', error);
      throw error;
    }
  }

  /**
   * Open Razorpay payment checkout
   */
  async openCheckout(
    order: RazorpayOrderResponse,
    userEmail: string,
    userName: string,
    onSuccess: (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => void,
    onFailure: (error: { error?: string }) => void
  ): Promise<void> {
    try {
      // Validate Razorpay key
      if (!this.keyId) {
        throw new Error('Razorpay Key ID is not configured. Please add VITE_RAZORPAY_KEY_ID to your .env file');
      }

      console.log('Loading Razorpay script...');
      
      const scriptLoaded = await this.loadRazorpayScript();
      
      if (!scriptLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection.');
      }

      console.log('Razorpay script loaded successfully');
      console.log('Opening checkout with order:', order);

      const options = {
        key: this.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Policy Manager SaaS',
        description: 'Subscription Payment',
        order_id: order.id,
        prefill: {
          name: userName,
          email: userEmail,
        },
        theme: {
          color: '#3B82F6'
        },
        handler: async (response: { razorpay_payment_id: string; razorpay_order_id: string; razorpay_signature: string }) => {
          try {
            await onSuccess(response);
          } catch (error) {
            console.error('Error in success handler:', error);
            onFailure({ error: error instanceof Error ? error.message : 'Payment processing failed' });
          }
        },
        modal: {
          ondismiss: () => {
            onFailure({ error: 'Payment cancelled by user' });
          },
          escape: true,
          backdropclose: false
        }
      };

      try {
        const razorpayInstance = new window.Razorpay(options);
        razorpayInstance.open();
      } catch (razorpayError) {
        console.error('Error creating/opening Razorpay instance:', razorpayError);
        onFailure({ error: razorpayError instanceof Error ? razorpayError.message : 'Failed to open payment gateway' });
        throw razorpayError;
      }
    } catch (error) {
      console.error('Error opening Razorpay checkout:', error);
      // Re-throw with better error message
      if (error instanceof Error) {
        throw new Error(`Payment gateway error: ${error.message}`);
      }
      throw new Error('Failed to initialize payment gateway');
    }
  }

  /**
   * Verify payment signature (should be done on backend)
   * WARNING: This is insecure! Payment verification MUST be done on the backend
   */
  verifyPaymentSignature(
    _orderId: string,
    _paymentId: string,
    _signature: string
  ): boolean {
    // This is just a placeholder for the flow
    // In production, send these details to your backend for verification
    console.warn('Payment verification should be done on backend!');
    return true; // Placeholder
  }

  /**
   * Create payment record in database
   */
  async createPaymentRecord(data: {
    userId: string;
    razorpayOrderId?: string;
    razorpayPaymentId?: string;
    razorpaySignature?: string;
    amount: number;
    currency: string;
    status: 'pending' | 'success' | 'failed' | 'refunded';
    paymentMethod?: string;
    subscriptionPlan: string;
    subscriptionDays: number;
    subscriptionStartDate?: Date;
    subscriptionEndDate?: Date;
    description?: string;
    errorMessage?: string;
  }): Promise<string> {
    try {
      const { data: paymentData, error } = await supabase
        .from('payment_history')
        .insert([{
          user_id: data.userId,
          razorpay_order_id: data.razorpayOrderId,
          razorpay_payment_id: data.razorpayPaymentId,
          razorpay_signature: data.razorpaySignature,
          amount: data.amount,
          currency: data.currency,
          status: data.status,
          payment_method: data.paymentMethod,
          subscription_plan: data.subscriptionPlan,
          subscription_days: data.subscriptionDays,
          subscription_start_date: data.subscriptionStartDate?.toISOString(),
          subscription_end_date: data.subscriptionEndDate?.toISOString(),
          description: data.description,
          error_message: data.errorMessage
        }])
        .select()
        .single();

      if (error) throw error;

      return paymentData.id;
    } catch (error) {
      console.error('Error creating payment record:', error);
      throw error;
    }
  }

  /**
   * Update payment record after payment completion
   */
  async updatePaymentRecord(
    orderId: string,
    updates: {
      razorpayPaymentId?: string;
      razorpaySignature?: string;
      status: 'success' | 'failed';
      paymentMethod?: string;
      errorMessage?: string;
    }
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('payment_history')
        .update({
          razorpay_payment_id: updates.razorpayPaymentId,
          razorpay_signature: updates.razorpaySignature,
          status: updates.status,
          payment_method: updates.paymentMethod,
          error_message: updates.errorMessage
        })
        .eq('razorpay_order_id', orderId);

      if (error) throw error;
    } catch (error) {
      console.error('Error updating payment record:', error);
      throw error;
    }
  }

  /**
   * Activate subscription after successful payment
   */
  async activateSubscription(
    userId: string,
    planName: string,
    razorpayPaymentId: string
  ): Promise<void> {
    try {
      // Get plan details
      const { data: planData, error: planError } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('name', planName)
        .single();

      if (planError || !planData) {
        throw new Error('Subscription plan not found');
      }

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + planData.duration_days);

      // Update user subscription
      const { error: updateError } = await supabase
        .from(TABLES.USERS)
        .update({
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          subscription_plan: planName,
          payment_method: 'razorpay',
          is_locked: false
        })
        .eq('id', userId);

      if (updateError) throw updateError;

      // Update payment record with subscription dates
      const { error: paymentUpdateError } = await supabase
        .from('payment_history')
        .update({
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString()
        })
        .eq('user_id', userId)
        .eq('razorpay_payment_id', razorpayPaymentId);

      if (paymentUpdateError) {
        console.error('Error updating payment record dates:', paymentUpdateError);
      }
    } catch (error) {
      console.error('Error activating subscription:', error);
      throw error;
    }
  }

  /**
   * Create dynamic subscription for a user via backend API
   * This creates a unique Razorpay subscription per user
   */
  async createDynamicSubscription(
    userId: string,
    planName: string,
    userEmail: string,
    userName: string
  ): Promise<{
    subscriptionId: string;
    paymentUrl: string;
    status: string;
  }> {
    try {
      console.log('Creating dynamic subscription for user:', userId);

      // Call backend API to create subscription
      const response = await fetch(`${BACKEND_URL}/api/create-subscription`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId,
          planName,
          userEmail,
          userName: userName || 'Customer',
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create subscription');
      }

      const data = await response.json();
      
      if (!data.success || !data.subscription) {
        throw new Error('Invalid response from subscription API');
      }

      console.log('✅ Dynamic subscription created:', data.subscription.id);

      return {
        subscriptionId: data.subscription.id,
        paymentUrl: data.subscription.paymentUrl,
        status: data.subscription.status,
      };
    } catch (error) {
      console.error('Error creating dynamic subscription:', error);
      throw error;
    }
  }

  /**
   * Get payment history for a user
   */
  async getPaymentHistory(userId: string): Promise<PaymentHistory[]> {
    try {
      const { data, error } = await supabase
        .from('payment_history')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data.map(payment => ({
        id: payment.id,
        userId: payment.user_id,
        razorpayPaymentId: payment.razorpay_payment_id,
        razorpayOrderId: payment.razorpay_order_id,
        razorpaySignature: payment.razorpay_signature,
        amount: parseFloat(payment.amount),
        currency: payment.currency,
        status: payment.status,
        paymentMethod: payment.payment_method,
        subscriptionPlan: payment.subscription_plan,
        subscriptionDays: payment.subscription_days,
        subscriptionStartDate: payment.subscription_start_date ? new Date(payment.subscription_start_date) : undefined,
        subscriptionEndDate: payment.subscription_end_date ? new Date(payment.subscription_end_date) : undefined,
        description: payment.description,
        errorMessage: payment.error_message,
        createdAt: new Date(payment.created_at),
        updatedAt: new Date(payment.updated_at)
      }));
    } catch (error) {
      console.error('Error fetching payment history:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(
    userId: string,
    orderId: string,
    paymentId: string,
    signature: string,
    planName: string
  ): Promise<void> {
    try {
      // Update payment record
      await this.updatePaymentRecord(orderId, {
        razorpayPaymentId: paymentId,
        razorpaySignature: signature,
        status: 'success'
      });

      // Activate subscription
      await this.activateSubscription(userId, planName, paymentId);
    } catch (error) {
      console.error('Error handling payment success:', error);
      throw error;
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(
    orderId: string,
    errorMessage: string
  ): Promise<void> {
    try {
      await this.updatePaymentRecord(orderId, {
        status: 'failed',
        errorMessage
      });
    } catch (error) {
      console.error('Error handling payment failure:', error);
      throw error;
    }
  }
}

export const razorpayService = new RazorpayService();
