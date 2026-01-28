// ============================================
// Razorpay Webhook Handler for Payment Verification
// ============================================
// This is a Node.js/Express backend service
// You need to deploy this separately or integrate with your backend

import dotenv from 'dotenv';
import express from 'express';
import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';
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
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY || ''; // Use service role key

console.log('🔧 Backend Configuration:');
console.log('  Port:', PORT);
console.log('  Razorpay Key ID:', RAZORPAY_KEY_ID ? `${RAZORPAY_KEY_ID.substring(0, 15)}...` : 'NOT SET');
console.log('  Razorpay Secret:', RAZORPAY_KEY_SECRET ? '[SET]' : 'NOT SET');
console.log('  Supabase URL:', SUPABASE_URL ? '[SET]' : 'NOT SET');

// Validate required environment variables
if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
  console.error('❌ ERROR: Razorpay credentials not found!');
  console.error('   Please check your .env.backend file');
  process.exit(1);
}

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('❌ ERROR: Supabase credentials not found!');
  console.error('   Please check your .env.backend file');
  process.exit(1);
}

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: RAZORPAY_KEY_ID,
  key_secret: RAZORPAY_KEY_SECRET
});

// Initialize Supabase with service role key
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

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

    // Fetch plan details from database
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Plan not found' });
    }

    // Create Razorpay order
    const amount = Math.round(parseFloat(plan.price_inr) * 100); // Convert to paise
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
        planDays: plan.duration_days
      }
    });
    
    console.log('✅ Razorpay order created successfully:', order.id);

    // Save order to payment_history
    const { error: paymentError } = await supabase
      .from('payment_history')
      .insert([{
        user_id: userId,
        razorpay_order_id: order.id,
        amount: plan.price_inr,
        currency: 'INR',
        status: 'pending',
        subscription_plan: planName,
        subscription_days: plan.duration_days,
        description: `Subscription payment for ${plan.display_name}`
      }]);

    if (paymentError) {
      console.error('Error saving payment record:', paymentError);
    }

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

    // Fetch plan details from database
    const { data: plan, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (planError || !plan) {
      return res.status(404).json({ error: 'Subscription plan not found' });
    }

    if (!plan.razorpay_plan_id) {
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
    const billingCycles = Math.ceil(plan.duration_days / 30);
    const subscriptionData = {
      plan_id: plan.razorpay_plan_id,
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

    // Step 3: Store subscription in database
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        razorpay_subscription_id: subscription.id,
        razorpay_customer_id: customer.id,
        plan_id: plan.id,
        plan_name: planName,
        status: 'created',
        payment_url: subscription.short_url,
        total_count: billingCycles,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error storing subscription:', insertError);
      // Continue anyway - webhook will handle it
    }

    // Step 4: Return subscription details
    res.json({
      success: true,
      subscription: {
        id: subscription.id,
        status: subscription.status,
        paymentUrl: subscription.short_url,
        planName: plan.display_name,
        amount: plan.price_inr,
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

      // Get subscription record from database
      const { data: subRecord, error: fetchError } = await supabase
        .from('user_subscriptions')
        .select('*, subscription_plans(*)')
        .eq('razorpay_subscription_id', subscriptionId)
        .single();

      if (fetchError || !subRecord) {
        console.error('Subscription record not found:', subscriptionId);
        return res.status(404).json({ error: 'Subscription record not found' });
      }

      // Update subscription status
      const { error: updateSubError } = await supabase
        .from('user_subscriptions')
        .update({
          status: 'active',
          current_start: new Date(subscription.current_start * 1000).toISOString(),
          current_end: new Date(subscription.current_end * 1000).toISOString(),
          paid_count: subscription.paid_count,
          activated_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', subscriptionId);

      if (updateSubError) {
        console.error('Error updating subscription:', updateSubError);
      }

      // Activate user's subscription
      const planDays = subRecord.subscription_plans?.duration_days || 30;
      const startDate = new Date(subscription.current_start * 1000);
      const endDate = new Date(subscription.current_end * 1000);

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          subscription_plan: subRecord.plan_name,
          payment_method: 'razorpay',
          is_locked: false
        })
        .eq('id', subRecord.user_id);

      if (userUpdateError) {
        console.error('Error activating user subscription:', userUpdateError);
        return res.status(500).json({ error: 'Failed to activate subscription' });
      }

      console.log(`✅ Subscription activated for user ${subRecord.user_id}, plan: ${subRecord.plan_name}`);
    }

    // Handle subscription.charged - recurring payment successful
    if (event.event === 'subscription.charged') {
      const subscription = event.payload.subscription.entity;
      const payment = event.payload.payment.entity;
      const subscriptionId = subscription.id;

      console.log('💰 Subscription charged:', subscriptionId, 'Payment:', payment.id);

      // Get subscription record
      const { data: subRecord } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('razorpay_subscription_id', subscriptionId)
        .single();

      if (subRecord) {
        // Update subscription dates
        await supabase
          .from('user_subscriptions')
          .update({
            current_start: new Date(subscription.current_start * 1000).toISOString(),
            current_end: new Date(subscription.current_end * 1000).toISOString(),
            paid_count: subscription.paid_count,
          })
          .eq('razorpay_subscription_id', subscriptionId);

        // Extend user subscription
        const endDate = new Date(subscription.current_end * 1000);
        await supabase
          .from('users')
          .update({
            subscription_end_date: endDate.toISOString(),
            subscription_status: 'active',
            is_locked: false
          })
          .eq('id', subRecord.user_id);

        console.log(`✅ Subscription extended for user ${subRecord.user_id}`);
      }
    }

    // Handle subscription.cancelled
    if (event.event === 'subscription.cancelled') {
      const subscription = event.payload.subscription.entity;
      const subscriptionId = subscription.id;

      console.log('❌ Subscription cancelled:', subscriptionId);

      // Update subscription status
      await supabase
        .from('user_subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
        })
        .eq('razorpay_subscription_id', subscriptionId);

      // Get subscription to update user
      const { data: subRecord } = await supabase
        .from('user_subscriptions')
        .select('*')
        .eq('razorpay_subscription_id', subscriptionId)
        .single();

      if (subRecord) {
        // Update user status to expired after current period ends
        await supabase
          .from('users')
          .update({
            subscription_status: 'cancelled', // Will expire when current_end passes
          })
          .eq('id', subRecord.user_id);

        console.log(`❌ Subscription marked cancelled for user ${subRecord.user_id}`);
      }
    }

    // Handle subscription.completed
    if (event.event === 'subscription.completed') {
      const subscription = event.payload.subscription.entity;
      const subscriptionId = subscription.id;

      console.log('✓ Subscription completed:', subscriptionId);

      await supabase
        .from('user_subscriptions')
        .update({
          status: 'completed',
        })
        .eq('razorpay_subscription_id', subscriptionId);
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
      const { data: paymentRecord, error: fetchError } = await supabase
        .from('payment_history')
        .select('*')
        .eq('razorpay_order_id', orderId)
        .single();

      if (fetchError || !paymentRecord) {
        console.error('Payment record not found:', orderId);
        return res.status(404).json({ error: 'Payment record not found' });
      }

      // Update payment record
      const { error: updatePaymentError } = await supabase
        .from('payment_history')
        .update({
          razorpay_payment_id: paymentId,
          status: 'success',
          payment_method: payment.method
        })
        .eq('razorpay_order_id', orderId);

      if (updatePaymentError) {
        console.error('Error updating payment:', updatePaymentError);
      }

      // Activate subscription for user
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + paymentRecord.subscription_days);

      const { error: userUpdateError } = await supabase
        .from('users')
        .update({
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          subscription_plan: paymentRecord.subscription_plan,
          payment_method: 'razorpay',
          is_locked: false
        })
        .eq('id', paymentRecord.user_id);

      if (userUpdateError) {
        console.error('Error activating subscription:', userUpdateError);
        return res.status(500).json({ error: 'Failed to activate subscription' });
      }

      // Update payment history with subscription dates
      await supabase
        .from('payment_history')
        .update({
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString()
        })
        .eq('razorpay_order_id', orderId);

      console.log(`Subscription activated for user ${paymentRecord.user_id}`);
    }

    // Handle payment.failed event
    if (event.event === 'payment.failed') {
      const payment = event.payload.payment.entity;
      const orderId = payment.order_id;

      await supabase
        .from('payment_history')
        .update({
          razorpay_payment_id: payment.id,
          status: 'failed',
          error_message: payment.error_description || 'Payment failed'
        })
        .eq('razorpay_order_id', orderId);

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
