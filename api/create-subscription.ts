/**
 * Supabase Edge Function: Create Dynamic Razorpay Subscription
 * 
 * This function creates a unique subscription for each user via Razorpay API
 * 
 * Flow:
 * 1. User clicks subscribe → Frontend calls this API
 * 2. This API creates a NEW Razorpay subscription for that user
 * 3. Returns unique subscription link
 * 4. User pays → Razorpay webhook updates that user's subscription
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID') || '';
const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || '';
const SUPABASE_SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';

interface CreateSubscriptionRequest {
  userId: string;
  planName: string;
  userEmail: string;
  userName: string;
}

interface RazorpaySubscriptionResponse {
  id: string;
  entity: string;
  plan_id: string;
  customer_id: string;
  status: string;
  current_start: number;
  current_end: number;
  short_url: string;
  created_at: number;
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      },
    });
  }

  try {
    // Parse request body
    const { userId, planName, userEmail, userName }: CreateSubscriptionRequest = await req.json();

    if (!userId || !planName || !userEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: userId, planName, userEmail' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Initialize Supabase client
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Get plan details from database
    const { data: planData, error: planError } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('name', planName)
      .eq('is_active', true)
      .single();

    if (planError || !planData) {
      return new Response(
        JSON.stringify({ error: 'Subscription plan not found' }),
        { 
          status: 404,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    // Check if plan has Razorpay plan ID
    if (!planData.razorpay_plan_id) {
      return new Response(
        JSON.stringify({ error: 'Plan does not have Razorpay configuration' }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
        }
      );
    }

    console.log('Creating subscription for user:', userId, 'plan:', planName);

    // Step 1: Create or get Razorpay customer
    const customerResponse = await createRazorpayCustomer(userEmail, userName);
    console.log('Razorpay customer:', customerResponse.id);

    // Step 2: Create Razorpay subscription
    const subscriptionResponse = await createRazorpaySubscription(
      planData.razorpay_plan_id,
      customerResponse.id,
      planData.duration_days
    );
    console.log('Razorpay subscription created:', subscriptionResponse.id);

    // Step 3: Store subscription in database
    const { error: insertError } = await supabase
      .from('user_subscriptions')
      .insert({
        user_id: userId,
        razorpay_subscription_id: subscriptionResponse.id,
        razorpay_customer_id: customerResponse.id,
        plan_id: planData.id,
        plan_name: planName,
        status: 'created',
        payment_url: subscriptionResponse.short_url,
        created_at: new Date().toISOString(),
      });

    if (insertError) {
      console.error('Error storing subscription:', insertError);
      // Continue anyway - webhook will handle it
    }

    // Step 4: Return subscription details to frontend
    return new Response(
      JSON.stringify({
        success: true,
        subscription: {
          id: subscriptionResponse.id,
          status: subscriptionResponse.status,
          paymentUrl: subscriptionResponse.short_url,
          planName: planData.display_name,
          amount: planData.price_inr,
          currency: planData.currency,
        },
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  } catch (error) {
    console.error('Error creating subscription:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Failed to create subscription',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' },
      }
    );
  }
});

/**
 * Create or get Razorpay customer
 */
async function createRazorpayCustomer(email: string, name: string) {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  const response = await fetch('https://api.razorpay.com/v1/customers', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: name || 'Customer',
      email: email,
      fail_existing: '0', // Return existing customer if already exists
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Razorpay customer creation failed:', errorText);
    throw new Error(`Failed to create Razorpay customer: ${errorText}`);
  }

  return await response.json();
}

/**
 * Create Razorpay subscription
 */
async function createRazorpaySubscription(
  planId: string,
  customerId: string,
  totalCount: number
): Promise<RazorpaySubscriptionResponse> {
  const auth = btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`);

  // Calculate billing cycles based on duration
  // For monthly billing: duration_days / 30
  const billingCycles = Math.ceil(totalCount / 30);

  const response = await fetch('https://api.razorpay.com/v1/subscriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      plan_id: planId,
      customer_id: customerId,
      total_count: billingCycles,
      quantity: 1,
      customer_notify: 1, // Send email to customer
      notes: {
        created_via: 'policy_manager_saas',
        environment: Deno.env.get('ENVIRONMENT') || 'production',
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Razorpay subscription creation failed:', errorText);
    throw new Error(`Failed to create Razorpay subscription: ${errorText}`);
  }

  return await response.json();
}
