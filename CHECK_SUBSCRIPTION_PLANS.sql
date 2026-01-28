-- Check if subscription_plans table exists and has data
SELECT * FROM subscription_plans WHERE is_active = true;

-- If no data, insert sample plans
INSERT INTO subscription_plans (name, display_name, description, price_inr, currency, duration_days, is_active, features)
VALUES 
  ('monthly', 'Monthly Plan', 'Access to all features for 30 days', 999, 'INR', 30, true, 
   ARRAY['Unlimited policies', 'AI-powered extraction', 'Dashboard access', 'Email support']),
  ('quarterly', 'Quarterly Plan', 'Access to all features for 90 days - Save 20%', 2399, 'INR', 90, true,
   ARRAY['Unlimited policies', 'AI-powered extraction', 'Dashboard access', 'Priority support', '20% savings']),
  ('yearly', 'Yearly Plan', 'Access to all features for 365 days - Save 40%', 7199, 'INR', 365, true,
   ARRAY['Unlimited policies', 'AI-powered extraction', 'Dashboard access', 'Premium support', '40% savings', 'Free updates'])
ON CONFLICT (name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  price_inr = EXCLUDED.price_inr,
  duration_days = EXCLUDED.duration_days,
  is_active = EXCLUDED.is_active,
  features = EXCLUDED.features;

-- Verify the data
SELECT name, display_name, price_inr, duration_days, is_active FROM subscription_plans;
