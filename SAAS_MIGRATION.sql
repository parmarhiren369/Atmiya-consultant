-- ============================================
-- SaaS Migration Script - Complete Setup
-- ============================================
-- This script:
-- 1. Fixes RLS policies to allow admin access
-- 2. Adds Razorpay payment fields
-- 3. Creates payment history table
-- 4. Sets up proper indexes

-- ============================================
-- STEP 1: Fix RLS Policies for Admin Access
-- ============================================

-- Drop existing policies (both old and new names)
DROP POLICY IF EXISTS "Users can read own data" ON users;
DROP POLICY IF EXISTS "Admins can read all users" ON users;
DROP POLICY IF EXISTS "Users and admins can read users" ON users;
DROP POLICY IF EXISTS "Admins can update users" ON users;

-- Create new policy: Users can read their own data OR admin can read all
CREATE POLICY "Users and admins can read users"
ON users FOR SELECT
USING (
  auth.uid()::TEXT = id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- Allow admins to update any user
CREATE POLICY "Admins can update users"
ON users FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- ============================================
-- STEP 2: Add Razorpay Payment Fields to Users Table
-- ============================================

-- Add Razorpay customer and subscription IDs
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_customer_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS razorpay_subscription_id TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method TEXT; -- 'razorpay', 'manual', etc.
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_plan TEXT DEFAULT 'monthly'; -- 'monthly', 'yearly'

-- Create indexes for payment fields
CREATE INDEX IF NOT EXISTS idx_users_razorpay_customer ON users(razorpay_customer_id);
CREATE INDEX IF NOT EXISTS idx_users_razorpay_subscription ON users(razorpay_subscription_id);

-- ============================================
-- STEP 3: Create Payment History Table
-- ============================================

CREATE TABLE IF NOT EXISTS payment_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Payment gateway details
  razorpay_payment_id TEXT,
  razorpay_order_id TEXT,
  razorpay_signature TEXT,
  
  -- Payment info
  amount DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'success', 'failed', 'refunded'
  payment_method TEXT, -- 'card', 'netbanking', 'upi', etc.
  
  -- Subscription details
  subscription_plan TEXT NOT NULL, -- 'monthly', 'yearly'
  subscription_days INTEGER NOT NULL,
  subscription_start_date TIMESTAMP WITH TIME ZONE,
  subscription_end_date TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  description TEXT,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_payment_status CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  CONSTRAINT valid_subscription_plan CHECK (subscription_plan IN ('monthly', 'quarterly', 'yearly'))
);

-- Create indexes for payment history
CREATE INDEX IF NOT EXISTS idx_payment_user_id ON payment_history(user_id);
CREATE INDEX IF NOT EXISTS idx_payment_status ON payment_history(status);
CREATE INDEX IF NOT EXISTS idx_payment_razorpay_payment_id ON payment_history(razorpay_payment_id);
CREATE INDEX IF NOT EXISTS idx_payment_created_at ON payment_history(created_at DESC);

-- ============================================
-- STEP 4: Enable RLS on Payment History
-- ============================================

ALTER TABLE payment_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can read own payment history" ON payment_history;
DROP POLICY IF EXISTS "Service can insert payment history" ON payment_history;
DROP POLICY IF EXISTS "Service can update payment history" ON payment_history;

-- Users can read their own payment history
CREATE POLICY "Users can read own payment history"
ON payment_history FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- System can insert payment records (we'll use service role for this)
CREATE POLICY "Service can insert payment history"
ON payment_history FOR INSERT
WITH CHECK (true);

-- System can update payment records
CREATE POLICY "Service can update payment history"
ON payment_history FOR UPDATE
USING (true);

-- ============================================
-- STEP 5: Create Subscription Plans Table
-- ============================================

CREATE TABLE IF NOT EXISTS subscription_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  description TEXT,
  
  -- Pricing
  price_inr DECIMAL(10, 2) NOT NULL,
  currency TEXT DEFAULT 'INR',
  
  -- Duration
  duration_days INTEGER NOT NULL,
  
  -- Razorpay integration
  razorpay_plan_id TEXT,
  
  -- Features
  features JSONB,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert default plans
INSERT INTO subscription_plans (name, display_name, description, price_inr, duration_days, features, is_active)
VALUES 
  (
    'monthly',
    'Monthly Plan',
    'Access to all features for 30 days',
    999.00,
    30,
    '["Unlimited policies", "AI-powered extraction", "Dashboard access", "Email support"]'::jsonb,
    true
  ),
  (
    'quarterly',
    'Quarterly Plan',
    'Access to all features for 90 days - Save 20%',
    2399.00,
    90,
    '["Unlimited policies", "AI-powered extraction", "Dashboard access", "Priority support", "20% savings"]'::jsonb,
    true
  ),
  (
    'yearly',
    'Yearly Plan',
    'Access to all features for 365 days - Save 40%',
    7199.00,
    365,
    '["Unlimited policies", "AI-powered extraction", "Dashboard access", "Premium support", "40% savings", "Free updates"]'::jsonb,
    true
  )
ON CONFLICT (name) DO NOTHING;

-- Create index
CREATE INDEX IF NOT EXISTS idx_subscription_plans_active ON subscription_plans(is_active);

-- Enable RLS
ALTER TABLE subscription_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Everyone can read active plans" ON subscription_plans;
DROP POLICY IF EXISTS "Admins can modify plans" ON subscription_plans;

-- Everyone can read active plans
CREATE POLICY "Everyone can read active plans"
ON subscription_plans FOR SELECT
USING (is_active = true);

-- Only admins can modify plans
CREATE POLICY "Admins can modify plans"
ON subscription_plans FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- ============================================
-- STEP 6: Create Function to Update Subscription Status
-- ============================================

CREATE OR REPLACE FUNCTION update_subscription_status()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Update expired trials
  UPDATE users
  SET subscription_status = 'expired'
  WHERE subscription_status = 'trial'
    AND trial_end_date < NOW()
    AND is_locked = false;

  -- Update expired subscriptions
  UPDATE users
  SET subscription_status = 'expired'
  WHERE subscription_status = 'active'
    AND subscription_end_date < NOW()
    AND is_locked = false;
END;
$$;

-- ============================================
-- STEP 7: Create Trigger for Updated_at Timestamp
-- ============================================

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to payment_history
DROP TRIGGER IF EXISTS update_payment_history_updated_at ON payment_history;
CREATE TRIGGER update_payment_history_updated_at
BEFORE UPDATE ON payment_history
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to subscription_plans
DROP TRIGGER IF EXISTS update_subscription_plans_updated_at ON subscription_plans;
CREATE TRIGGER update_subscription_plans_updated_at
BEFORE UPDATE ON subscription_plans
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 8: Create Policy Management Tables
-- ============================================

-- Main policies table
CREATE TABLE IF NOT EXISTS policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Policyholder information
  policyholder_name TEXT NOT NULL,
  contact_no TEXT,
  email_id TEXT,
  address TEXT,
  
  -- Policy details
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  premium_amount DECIMAL(12, 2),
  coverage_amount DECIMAL(12, 2),
  
  -- Dates
  policy_start_date DATE,
  policy_end_date DATE,
  premium_due_date DATE,
  
  -- Status and categories
  status TEXT DEFAULT 'active',
  payment_frequency TEXT, -- 'monthly', 'quarterly', 'yearly'
  
  -- Additional details
  nominee_name TEXT,
  nominee_relationship TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT valid_policy_status CHECK (status IN ('active', 'inactive', 'lapsed', 'cancelled'))
);

-- Deleted policies table (soft delete)
CREATE TABLE IF NOT EXISTS deleted_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_policy_id UUID NOT NULL,
  
  -- All policy fields (same as policies table)
  policyholder_name TEXT NOT NULL,
  contact_no TEXT,
  email_id TEXT,
  address TEXT,
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  premium_amount DECIMAL(12, 2),
  coverage_amount DECIMAL(12, 2),
  policy_start_date DATE,
  policy_end_date DATE,
  premium_due_date DATE,
  status TEXT,
  payment_frequency TEXT,
  nominee_name TEXT,
  nominee_relationship TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Deletion metadata
  deleted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  deleted_by UUID REFERENCES users(id),
  deletion_reason TEXT,
  
  -- Original timestamps
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Lapsed policies table
CREATE TABLE IF NOT EXISTS lapsed_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  original_policy_id UUID NOT NULL,
  
  -- All policy fields (same as policies table)
  policyholder_name TEXT NOT NULL,
  contact_no TEXT,
  email_id TEXT,
  address TEXT,
  policy_number TEXT NOT NULL,
  insurance_company TEXT NOT NULL,
  policy_type TEXT NOT NULL,
  premium_amount DECIMAL(12, 2),
  coverage_amount DECIMAL(12, 2),
  policy_start_date DATE,
  policy_end_date DATE,
  premium_due_date DATE,
  status TEXT,
  payment_frequency TEXT,
  nominee_name TEXT,
  nominee_relationship TEXT,
  notes TEXT,
  documents JSONB DEFAULT '[]'::jsonb,
  
  -- Lapsed metadata
  lapsed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  lapsed_reason TEXT,
  
  -- Original timestamps
  created_at TIMESTAMP WITH TIME ZONE,
  updated_at TIMESTAMP WITH TIME ZONE
);

-- Activity logs table
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  
  -- Activity details
  action TEXT NOT NULL,
  policy_id UUID,
  policy_number TEXT,
  policyholder_name TEXT,
  description TEXT,
  
  -- User information
  performed_by UUID REFERENCES users(id),
  performed_by_name TEXT,
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  metadata JSONB DEFAULT '{}'::jsonb,
  
  -- Constraints
  CONSTRAINT valid_action_type CHECK (action IN (
    'CREATE', 'UPDATE', 'DELETE', 'RESTORE', 'PERMANENT_DELETE', 
    'MARK_LAPSED', 'REACTIVATE', 'EXPORT', 'IMPORT', 'VIEW'
  ))
);

-- Policy deletion requests table
CREATE TABLE IF NOT EXISTS policy_deletion_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Policy information
  policy_id UUID NOT NULL,
  policy_number TEXT NOT NULL,
  policyholder_name TEXT NOT NULL,
  
  -- Request details
  requested_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_by_name TEXT NOT NULL,
  reason TEXT NOT NULL,
  
  -- Status tracking
  status TEXT DEFAULT 'pending',
  request_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Review information
  reviewed_by UUID REFERENCES users(id),
  reviewed_by_name TEXT,
  review_date TIMESTAMP WITH TIME ZONE,
  review_comments TEXT,
  
  -- Constraints
  CONSTRAINT valid_deletion_status CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Tasks table for task management
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Task details
  title TEXT NOT NULL,
  description TEXT,
  
  -- Assignment
  assigned_to UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  assigned_to_name TEXT NOT NULL,
  assigned_by_name TEXT NOT NULL,
  
  -- Due date and status
  due_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT DEFAULT 'pending',
  priority TEXT DEFAULT 'medium',
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  
  -- Constraints
  CONSTRAINT valid_task_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  CONSTRAINT valid_task_priority CHECK (priority IN ('low', 'medium', 'high', 'urgent'))
);

-- Create indexes for policies
CREATE INDEX IF NOT EXISTS idx_policies_user_id ON policies(user_id);
CREATE INDEX IF NOT EXISTS idx_policies_policy_number ON policies(policy_number);
CREATE INDEX IF NOT EXISTS idx_policies_status ON policies(status);
CREATE INDEX IF NOT EXISTS idx_policies_created_at ON policies(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_policies_premium_due_date ON policies(premium_due_date);

-- Create indexes for deleted_policies
CREATE INDEX IF NOT EXISTS idx_deleted_policies_user_id ON deleted_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_deleted_policies_deleted_at ON deleted_policies(deleted_at DESC);
CREATE INDEX IF NOT EXISTS idx_deleted_policies_original_id ON deleted_policies(original_policy_id);

-- Create indexes for lapsed_policies
CREATE INDEX IF NOT EXISTS idx_lapsed_policies_user_id ON lapsed_policies(user_id);
CREATE INDEX IF NOT EXISTS idx_lapsed_policies_lapsed_at ON lapsed_policies(lapsed_at DESC);
CREATE INDEX IF NOT EXISTS idx_lapsed_policies_original_id ON lapsed_policies(original_policy_id);

-- Create indexes for activity_logs
CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_policy_id ON activity_logs(policy_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action);

-- Create indexes for policy_deletion_requests
CREATE INDEX IF NOT EXISTS idx_deletion_requests_policy_id ON policy_deletion_requests(policy_id);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_requested_by ON policy_deletion_requests(requested_by);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_status ON policy_deletion_requests(status);
CREATE INDEX IF NOT EXISTS idx_deletion_requests_request_date ON policy_deletion_requests(request_date DESC);

-- Create indexes for tasks
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);
CREATE INDEX IF NOT EXISTS idx_tasks_created_at ON tasks(created_at DESC);

-- ============================================
-- STEP 9: Enable RLS on Policy Tables
-- ============================================

-- Enable RLS
ALTER TABLE policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE deleted_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE lapsed_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE policy_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Drop existing policies for policies table
DROP POLICY IF EXISTS "Users can read own policies" ON policies;
DROP POLICY IF EXISTS "Users can insert own policies" ON policies;
DROP POLICY IF EXISTS "Users can update own policies" ON policies;
DROP POLICY IF EXISTS "Users can delete own policies" ON policies;

-- Policies RLS policies
CREATE POLICY "Users can read own policies"
ON policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert own policies"
ON policies FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can update own policies"
ON policies FOR UPDATE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can delete own policies"
ON policies FOR DELETE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- Drop existing policies for deleted_policies table
DROP POLICY IF EXISTS "Users can read own deleted policies" ON deleted_policies;
DROP POLICY IF EXISTS "Users can insert deleted policies" ON deleted_policies;
DROP POLICY IF EXISTS "Users can delete from deleted policies" ON deleted_policies;

-- Deleted policies RLS policies
CREATE POLICY "Users can read own deleted policies"
ON deleted_policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert deleted policies"
ON deleted_policies FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT OR auth.uid()::TEXT = deleted_by::TEXT);

CREATE POLICY "Users can delete from deleted policies"
ON deleted_policies FOR DELETE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- Drop existing policies for lapsed_policies table
DROP POLICY IF EXISTS "Users can read own lapsed policies" ON lapsed_policies;
DROP POLICY IF EXISTS "Users can insert lapsed policies" ON lapsed_policies;
DROP POLICY IF EXISTS "Users can delete lapsed policies" ON lapsed_policies;

-- Lapsed policies RLS policies
CREATE POLICY "Users can read own lapsed policies"
ON lapsed_policies FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert lapsed policies"
ON lapsed_policies FOR INSERT
WITH CHECK (auth.uid()::TEXT = user_id::TEXT);

CREATE POLICY "Users can delete lapsed policies"
ON lapsed_policies FOR DELETE
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- Drop existing policies for activity_logs table
DROP POLICY IF EXISTS "Users can read own activity logs" ON activity_logs;
DROP POLICY IF EXISTS "Users can insert activity logs" ON activity_logs;

-- Activity logs RLS policies
CREATE POLICY "Users can read own activity logs"
ON activity_logs FOR SELECT
USING (
  auth.uid()::TEXT = user_id::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert activity logs"
ON activity_logs FOR INSERT
WITH CHECK (true);

-- Drop existing policies for policy_deletion_requests table
DROP POLICY IF EXISTS "Users can read own deletion requests" ON policy_deletion_requests;
DROP POLICY IF EXISTS "Users can insert deletion requests" ON policy_deletion_requests;
DROP POLICY IF EXISTS "Admins can update deletion requests" ON policy_deletion_requests;

-- Policy deletion requests RLS policies
CREATE POLICY "Users can read own deletion requests"
ON policy_deletion_requests FOR SELECT
USING (
  auth.uid()::TEXT = requested_by::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert deletion requests"
ON policy_deletion_requests FOR INSERT
WITH CHECK (auth.uid()::TEXT = requested_by::TEXT);

CREATE POLICY "Admins can update deletion requests"
ON policy_deletion_requests FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- Drop existing policies for tasks table
DROP POLICY IF EXISTS "Users can read assigned tasks" ON tasks;
DROP POLICY IF EXISTS "Users can read created tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete tasks" ON tasks;

-- Tasks RLS policies
CREATE POLICY "Users can read assigned tasks"
ON tasks FOR SELECT
USING (
  auth.uid()::TEXT = assigned_to::TEXT
  OR
  auth.uid()::TEXT = assigned_by::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can insert tasks"
ON tasks FOR INSERT
WITH CHECK (auth.uid()::TEXT = assigned_by::TEXT);

CREATE POLICY "Users can update tasks"
ON tasks FOR UPDATE
USING (
  auth.uid()::TEXT = assigned_to::TEXT
  OR
  auth.uid()::TEXT = assigned_by::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

CREATE POLICY "Users can delete tasks"
ON tasks FOR DELETE
USING (
  auth.uid()::TEXT = assigned_by::TEXT
  OR
  EXISTS (
    SELECT 1 FROM users admin_check 
    WHERE admin_check.id::TEXT = auth.uid()::TEXT 
    AND admin_check.role = 'admin'
  )
);

-- ============================================
-- STEP 10: Create Triggers for Updated_at
-- ============================================

-- Add trigger to policies
DROP TRIGGER IF EXISTS update_policies_updated_at ON policies;
CREATE TRIGGER update_policies_updated_at
BEFORE UPDATE ON policies
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- STEP 11: Grant Necessary Permissions
-- ============================================

-- ============================================
-- STEP 11: Grant Necessary Permissions
-- ============================================

-- Grant usage on sequences
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;

-- Grant access to tables
GRANT SELECT, INSERT, UPDATE ON payment_history TO authenticated;
GRANT SELECT ON subscription_plans TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON policies TO authenticated;
GRANT SELECT, INSERT, DELETE ON deleted_policies TO authenticated;
GRANT SELECT, INSERT, DELETE ON lapsed_policies TO authenticated;
GRANT SELECT, INSERT ON activity_logs TO authenticated;
GRANT SELECT, INSERT ON policy_deletion_requests TO authenticated;
GRANT UPDATE ON policy_deletion_requests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON tasks TO authenticated;

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these after migration to verify:
-- SELECT * FROM subscription_plans WHERE is_active = true;
-- SELECT COUNT(*) FROM users;
-- SELECT subscription_status, COUNT(*) FROM users GROUP BY subscription_status;
-- SELECT COUNT(*) FROM policies;
-- SELECT COUNT(*) FROM activity_logs;

-- ============================================
-- DONE!
-- ============================================
-- Run this script in your Supabase SQL editor
-- Then restart your application
