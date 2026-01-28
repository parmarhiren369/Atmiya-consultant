-- Create table to track individual user subscriptions
CREATE TABLE IF NOT EXISTS user_subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  razorpay_subscription_id TEXT UNIQUE NOT NULL,
  razorpay_customer_id TEXT,
  plan_id UUID REFERENCES subscription_plans(id),
  plan_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'created', -- created, active, paused, cancelled, completed, expired
  payment_url TEXT,
  current_start TIMESTAMPTZ,
  current_end TIMESTAMPTZ,
  paid_count INTEGER DEFAULT 0,
  total_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  activated_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ
);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_user_id ON user_subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_razorpay_id ON user_subscriptions(razorpay_subscription_id);
CREATE INDEX IF NOT EXISTS idx_user_subscriptions_status ON user_subscriptions(status);

-- Enable RLS
ALTER TABLE user_subscriptions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view their own subscriptions"
  ON user_subscriptions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage all subscriptions"
  ON user_subscriptions FOR ALL
  USING (auth.role() = 'service_role');

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_user_subscriptions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER update_user_subscriptions_updated_at
  BEFORE UPDATE ON user_subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_user_subscriptions_updated_at();

-- Add comments for documentation
COMMENT ON TABLE user_subscriptions IS 'Stores individual user subscription data from Razorpay';
COMMENT ON COLUMN user_subscriptions.razorpay_subscription_id IS 'Unique Razorpay subscription ID (sub_xxx)';
COMMENT ON COLUMN user_subscriptions.status IS 'Subscription status: created, active, paused, cancelled, completed, expired';
COMMENT ON COLUMN user_subscriptions.payment_url IS 'Short URL for user to complete payment';
