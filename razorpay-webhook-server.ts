// ============================================
// Razorpay Webhook Handler for Payment Verification
// ============================================
// This is a Node.js/Express backend service
// You need to deploy this separately or integrate with your backend

import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import admin from 'firebase-admin';
import Razorpay from 'razorpay';

// Load environment variables from .env.backend
dotenv.config({ path: '.env.backend' });

const app = express();
app.use(express.json());
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  res.header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// Environment variables
const PORT = process.env.PORT || 3000;
const RAZORPAY_KEY_ID = process.env.RAZORPAY_KEY_ID || '';
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || '';
const RAZORPAY_WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET || '';

// Firebase Admin credentials
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || '';
const FIREBASE_CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL || '';
const FIREBASE_PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n');

console.log('🔧 Backend Configuration:');
console.log('  Port:', PORT);
console.log('  Razorpay Key ID:', RAZORPAY_KEY_ID ? `${RAZORPAY_KEY_ID.substring(0, 15)}...` : 'NOT SET');
console.log('  Razorpay Secret:', RAZORPAY_KEY_SECRET ? '[SET]' : 'NOT SET');
console.log('  Firebase Project ID:', FIREBASE_PROJECT_ID ? '[SET]' : 'NOT SET');

// Validate required environment variables
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ ERROR: Razorpay credentials not found!');
  console.error('   Please check your .env.backend file');
  process.exit(1);
}

if (!FIREBASE_PROJECT_ID || !FIREBASE_CLIENT_EMAIL || !FIREBASE_PRIVATE_KEY) {
  console.error('❌ ERROR: Firebase Admin credentials not found!');
  console.error('   Please check your .env.backend file');
  process.exit(1);
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Initialize Firebase Admin
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: FIREBASE_PROJECT_ID,
      clientEmail: FIREBASE_CLIENT_EMAIL,
      privateKey: FIREBASE_PRIVATE_KEY,
    }),
  });
}

const db = admin.firestore();

// Collection names (matching frontend)
const COLLECTIONS = {
  USERS: 'users',
  SUBSCRIPTION_PLANS: 'subscriptionPlans',
  PAYMENT_HISTORY: 'paymentHistory',
  USER_SUBSCRIPTIONS: 'userSubscriptions',
};

/**
 * Verify Razorpay signature
 */
function verifySignature(body: string, signature: string): boolean {
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(body)
    .digest('hex');
  
  return expectedSignature === signature;
}

/**
 * Create Razorpay order endpoint
 */
app.post('/api/create-razorpay-order', async (req, res) => {
  try {
    const { userId, planName } = req.body;

    if (!userId || !planName) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    // Fetch plan details from Firestore
    const plansSnapshot = await db.collection(COLLECTIONS.SUBSCRIPTION_PLANS)
      .where('name', '==', planName)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (plansSnapshot.empty) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    const plan = plansSnapshot.docs[0].data();
    const planId = plansSnapshot.docs[0].id;

    // Create Razorpay order
    const amount = Math.round(parseFloat(plan.priceInr) * 100); // Convert to paise
    // Generate short receipt ID (max 40 chars for Razorpay)
    const shortUserId = userId.substring(0, 8);
    const timestamp = Date.now().toString().slice(-10);
    const receipt = `rcpt_${shortUserId}_${timestamp}`.substring(0, 40);
    
    console.log('Creating Razorpay order:', { amount, receipt, userId: shortUserId });
    
    const order = await razorpay.orders.create({
      amount: amount,
      currency: 'INR',
      receipt: receipt,
      notes: {
        userId: userId,
        planName: planName,
        planDays: plan.durationDays
      }
    });
    
    console.log('✅ Razorpay order created successfully:', order.id);

    // Save order to payment_history
    await db.collection(COLLECTIONS.PAYMENT_HISTORY).add({
      userId: userId,
      razorpayOrderId: order.id,
      amount: plan.priceInr,
      currency: 'INR',
      status: 'pending',
      subscriptionPlan: planName,
      subscriptionDays: plan.durationDays,
      description: `Subscription payment for ${plan.displayName}`,
      createdAt: new Date().toISOString(),
    });

    res.json({
      success: true,
      order: order
    });
  } catch (error) {
    console.error('Error creating order:', error);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

/**
 * Create dynamic Razorpay subscription for individual user
 */
app.post('/api/create-subscription', async (req, res) => {
  try {
    const { userId, planName, userEmail, userName } = req.body;

    if (!userId || !planName || !userEmail) {
      return res.status(400).json({ error: 'Missing required fields: userId, planName, userEmail' });
    }

    console.log('Creating subscription for user:', userId, 'plan:', planName);

    // Fetch plan details from Firestore
    const plansSnapshot = await db.collection(COLLECTIONS.SUBSCRIPTION_PLANS)
      .where('name', '==', planName)
      .where('isActive', '==', true)
      .limit(1)
      .get();

    if (plansSnapshot.empty) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    const plan = plansSnapshot.docs[0].data();
    const planId = plansSnapshot.docs[0].id;

    if (!plan.razorpayPlanId) {
      return res.status(400).json({ error: 'Plan does not have Razorpay configuration' });
    }

    // Step 1: Create or get Razorpay customer
    const customerData = {
      name: userName || 'Customer',
      email: userEmail,
      fail_existing: '0' // Return existing customer if already exists
    };

    console.log('Creating Razorpay customer...', userEmail);
    const customer = await razorpay.customers.create(customerData);
    console.log('✅ Razorpay customer created:', customer.id);

    // Step 2: Create Razorpay subscription
    const billingCycles = Math.ceil(plan.durationDays / 30);
    const subscriptionData = {
      plan_id: plan.razorpayPlanId,
      customer_id: customer.id,
      total_count: billingCycles,
      quantity: 1,
      customer_notify: 1, // Send email to customer
      notes: {
        userId: userId,
        planName: planName,
        created_via: 'policy_manager_saas'
      }
    };

    console.log('Creating Razorpay subscription...', subscriptionData);
    const subscription = await razorpay.subscriptions.create(subscriptionData);
    console.log('✅ Razorpay subscription created:', subscription.id);

    // Step 3: Store subscription in Firestore
    await db.collection(COLLECTIONS.USER_SUBSCRIPTIONS).add({
      userId: userId,
      razorpaySubscriptionId: subscription.id,
      razorpayCustomerId: customer.id,
      planId: planId,
      planName: planName,
      status: 'created',
      paymentUrl: subscription.short_url,
      totalCount: billingCycles,
      createdAt: new Date().toISOString(),
    });

    // Step 4: Return subscription details
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        paymentUrl: subscription.short_url,
        planName: plan.displayName,
        amount: plan.priceInr,
        currency: plan.currency,
      },
    });
  } catch (error: any) {
    console.error('Error creating subscription:', error);
    res.status(500).json({ 
      error: 'Failed to create subscription',
      details: error?.message || 'Unknown error'
    });
  }
});

/**
 * Razorpay webhook endpoint
 * Handles both order-based payments AND subscription-based payments
 */
app.post('/api/razorpay-webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  try {
    const signature = req.headers['x-razorpay-signature'] as string;
    const body = req.body.toString();

    // Verify webhook signature
    if (!verifySignature(body, signature)) {
      console.error('Invalid webhook signature');
      return res.status(400).json({ error: 'Invalid signature' });
    }

    const event = JSON.parse(body);
    console.log('Webhook event:', event.event, event.payload);

    // ==========================================
    // SUBSCRIPTION-BASED PAYMENT EVENTS
    // ==========================================
    
    // Handle subscription.activated - when user completes first payment
    if (event.event === 'subscription.activated') {
      const subscription = event.payload.subscription.entity;
      const subscriptionId = subscription.id;

      console.log('✅ Subscription activated:', subscriptionId);

      // Get subscription record from Firestore
      const subSnapshot = await db.collection(COLLECTIONS.USER_SUBSCRIPTIONS)
        .where('razorpaySubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (subSnapshot.empty) {
        console.error('Subscription record not found:', subscriptionId);
        return res.status(404).json({ error: 'Subscription record not found' });
      }

      const subDoc = subSnapshot.docs[0];
      const subRecord = subDoc.data();

      // Get plan details
      const planDoc = await db.collection(COLLECTIONS.SUBSCRIPTION_PLANS).doc(subRecord.planId).get();
      const planData = planDoc.exists ? planDoc.data() : null;
      const planDays = planData?.durationDays || 30;

      // Update subscription status
      await subDoc.ref.update({
        status: 'active',
        currentStart: new Date(subscription.current_start * 1000).toISOString(),
        currentEnd: new Date(subscription.current_end * 1000).toISOString(),
        paidCount: subscription.paid_count,
        activatedAt: new Date().toISOString(),
      });

      // Activate user's subscription
      const startDate = new Date(subscription.current_start * 1000);
      const endDate = new Date(subscription.current_end * 1000);

      await db.collection(COLLECTIONS.USERS).doc(subRecord.userId).update({
        subscriptionStatus: 'active',
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionPlan: subRecord.planName,
        paymentMethod: 'razorpay',
        isLocked: false
      });

      console.log(`✅ Subscription activated for user ${subRecord.userId}, plan: ${subRecord.planName}`);
    }

    // Handle subscription.charged - recurring payment successful
    if (event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;
      const subscriptionId = subscription.id;

      console.log('💰 Subscription charged:', subscriptionId, 'Payment:', payment.id);

      // Get subscription record
      const subSnapshot = await db.collection(COLLECTIONS.USER_SUBSCRIPTIONS)
        .where('razorpaySubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (!subSnapshot.empty) {
        const subDoc = subSnapshot.docs[0];
        const subRecord = subDoc.data();

        // Update subscription dates
        await subDoc.ref.update({
          currentStart: new Date(subscription.current_start * 1000).toISOString(),
          currentEnd: new Date(subscription.current_end * 1000).toISOString(),
          paidCount: subscription.paid_count,
        });

        // Extend user subscription
        const endDate = new Date(subscription.current_end * 1000);
        await db.collection(COLLECTIONS.USERS).doc(subRecord.userId).update({
          subscriptionEndDate: endDate.toISOString(),
          subscriptionStatus: 'active',
          isLocked: false
        });

        console.log(`✅ Subscription extended for user ${subRecord.userId}`);
      }
    }

    // Handle subscription.cancelled
    if (event.event === 'subscription.cancelled') {
      const subscription = event.payload.subscription.entity;
      const subscriptionId = subscription.id;

      console.log('❌ Subscription cancelled:', subscriptionId);

      // Get subscription record
      const subSnapshot = await db.collection(COLLECTIONS.USER_SUBSCRIPTIONS)
        .where('razorpaySubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (!subSnapshot.empty) {
        const subDoc = subSnapshot.docs[0];
        const subRecord = subDoc.data();

        // Update subscription status
        await subDoc.ref.update({
          status: 'cancelled',
          cancelledAt: new Date().toISOString(),
        });

        // Update user status to expired after current period ends
        await db.collection(COLLECTIONS.USERS).doc(subRecord.userId).update({
          subscriptionStatus: 'cancelled',
        });

        console.log(`❌ Subscription marked cancelled for user ${subRecord.userId}`);
      }
    }

    // Handle subscription.completed
    if (event.event === 'subscription.completed') {
      const subscription = event.payload.subscription.entity;
      const subscriptionId = subscription.id;

      console.log('✓ Subscription completed:', subscriptionId);

      const subSnapshot = await db.collection(COLLECTIONS.USER_SUBSCRIPTIONS)
        .where('razorpaySubscriptionId', '==', subscriptionId)
        .limit(1)
        .get();

      if (!subSnapshot.empty) {
        await subSnapshot.docs[0].ref.update({
          status: 'completed',
        });
      }
    }

    // ==========================================
    // ORDER-BASED PAYMENT EVENTS (Legacy/Fallback)
    // ==========================================
    
    // Handle payment.authorized event
    if (event.event === 'payment.authorized' || event.event === 'payment.captured') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;
      const paymentId = payment.id;

      // Get order details from payment_history
      const paymentSnapshot = await db.collection(COLLECTIONS.PAYMENT_HISTORY)
        .where('razorpayOrderId', '==', orderId)
        .limit(1)
        .get();

      if (paymentSnapshot.empty) {
        console.error('Payment record not found:', orderId);
        return res.status(404).json({ error: 'Payment record not found' });
      }

      const paymentDoc = paymentSnapshot.docs[0];
      const paymentRecord = paymentDoc.data();

      // Update payment record
      await paymentDoc.ref.update({
        razorpayPaymentId: paymentId,
        status: 'success',
        paymentMethod: payment.method
      });

      // Activate subscription for user
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + paymentRecord.subscriptionDays);

      await db.collection(COLLECTIONS.USERS).doc(paymentRecord.userId).update({
        subscriptionStatus: 'active',
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString(),
        subscriptionPlan: paymentRecord.subscriptionPlan,
        paymentMethod: 'razorpay',
        isLocked: false
      });

      // Update payment history with subscription dates
      await paymentDoc.ref.update({
        subscriptionStartDate: startDate.toISOString(),
        subscriptionEndDate: endDate.toISOString()
      });

      console.log(`Subscription activated for user ${paymentRecord.userId}`);
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      const paymentSnapshot = await db.collection(COLLECTIONS.PAYMENT_HISTORY)
        .where('razorpayOrderId', '==', orderId)
        .limit(1)
        .get();

      if (!paymentSnapshot.empty) {
        await paymentSnapshot.docs[0].ref.update({
          razorpayPaymentId: payment.id,
          status: 'failed',
          errorMessage: payment.error_description || 'Payment failed'
        });
      }

      console.log(`Payment failed for order ${orderId}`);
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});

/**
 * Verify payment endpoint (for manual verification)
 */
app.post('/api/verify-payment', async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // Verify signature
    const text = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expectedSignature = crypto
      .createHmac('sha256', RAZORPAY_KEY_SECRET)
      .update(text)
      .digest('hex');

    if (expectedSignature !== razorpay_signature) {
      return res.status(400).json({ error: 'Invalid signature' });
    }

    res.json({ success: true, verified: true });
  } catch (error) {
    console.error('Verification error:', error);
    res.status(500).json({ error: 'Verification failed' });
  }
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Razorpay webhook server running on port ${PORT}`);
  console.log(`Webhook URL: http://localhost:${PORT}/api/razorpay-webhook`);
  console.log('Make sure to set this URL in Razorpay Dashboard');
});

export default app;
