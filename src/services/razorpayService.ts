import { 
  collection, 
  doc, 
  getDocs, 
  addDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';

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
      const q = query(
        collection(db, COLLECTIONS.SUBSCRIPTION_PLANS),
        where('isActive', '==', true),
        orderBy('durationDays')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          name: data.name,
          displayName: data.displayName,
          description: data.description,
          priceInr: parseFloat(data.priceInr),
          currency: data.currency,
          durationDays: data.durationDays,
          razorpayPlanId: data.razorpayPlanId,
          razorpayPaymentLink: data.razorpayPaymentLink,
          features: data.features || [],
          isActive: data.isActive
        };
      });
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
      const plansQuery = query(
        collection(db, COLLECTIONS.SUBSCRIPTION_PLANS),
        where('name', '==', planName),
        where('isActive', '==', true)
      );
      const plansSnapshot = await getDocs(plansQuery);

      if (plansSnapshot.empty) {
        throw new Error('Subscription plan not found');
      }

      const planData = plansSnapshot.docs[0].data();
      const amount = Math.round(parseFloat(planData.priceInr) * 100);

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
          amount: planData.priceInr,
          currency: 'INR',
          status: 'pending',
          subscriptionPlan: planName,
          subscriptionDays: planData.durationDays,
          description: `TEST - Subscription payment for ${planData.displayName}`
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
   * Create payment record in Firestore
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
      const now = new Date().toISOString();
      const paymentDoc = {
        userId: data.userId,
        razorpayOrderId: data.razorpayOrderId || null,
        razorpayPaymentId: data.razorpayPaymentId || null,
        razorpaySignature: data.razorpaySignature || null,
        amount: data.amount,
        currency: data.currency,
        status: data.status,
        paymentMethod: data.paymentMethod || null,
        subscriptionPlan: data.subscriptionPlan,
        subscriptionDays: data.subscriptionDays,
        subscriptionStartDate: data.subscriptionStartDate?.toISOString() || null,
        subscriptionEndDate: data.subscriptionEndDate?.toISOString() || null,
        description: data.description || null,
        errorMessage: data.errorMessage || null,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.PAYMENT_HISTORY), paymentDoc);
      return docRef.id;
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
      const q = query(
        collection(db, COLLECTIONS.PAYMENT_HISTORY),
        where('razorpayOrderId', '==', orderId)
      );
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const paymentDoc = querySnapshot.docs[0];
        await updateDoc(doc(db, COLLECTIONS.PAYMENT_HISTORY, paymentDoc.id), {
          razorpayPaymentId: updates.razorpayPaymentId || null,
          razorpaySignature: updates.razorpaySignature || null,
          status: updates.status,
          paymentMethod: updates.paymentMethod || null,
          errorMessage: updates.errorMessage || null,
          updatedAt: new Date().toISOString(),
        });
      }
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
      const plansQuery = query(
        collection(db, COLLECTIONS.SUBSCRIPTION_PLANS),
        where('name', '==', planName)
      );
      const plansSnapshot = await getDocs(plansQuery);

      if (plansSnapshot.empty) {
        throw new Error('Subscription plan not found');
      }

      const planData = plansSnapshot.docs[0].data();

      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + planData.durationDays);

      // Update user subscription
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        subscriptionStatus: 'active',
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionPlan: planName,
        paymentMethod: 'razorpay',
        isLocked: false
      });

      // Update payment record with subscription dates
      const paymentsQuery = query(
        collection(db, COLLECTIONS.PAYMENT_HISTORY),
        where('userId', '==', userId),
        where('razorpayPaymentId', '==', razorpayPaymentId)
      );
      const paymentsSnapshot = await getDocs(paymentsQuery);

      if (!paymentsSnapshot.empty) {
        await updateDoc(doc(db, COLLECTIONS.PAYMENT_HISTORY, paymentsSnapshot.docs[0].id), {
          subscriptionStartDate: startDate.toISOString(),
          subscriptionEndDate: endDate.toISOString(),
          updatedAt: new Date().toISOString(),
        });
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
      const q = query(
        collection(db, COLLECTIONS.PAYMENT_HISTORY),
        where('userId', '==', userId),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => {
        const data = docSnap.data();
        return {
          id: docSnap.id,
          userId: data.userId,
          razorpayPaymentId: data.razorpayPaymentId,
          razorpayOrderId: data.razorpayOrderId,
          razorpaySignature: data.razorpaySignature,
          amount: parseFloat(data.amount),
          currency: data.currency,
          status: data.status,
          paymentMethod: data.paymentMethod,
          subscriptionPlan: data.subscriptionPlan,
          subscriptionDays: data.subscriptionDays,
          subscriptionStartDate: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : undefined,
          subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : undefined,
          description: data.description,
          errorMessage: data.errorMessage,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt)
        };
      });
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
