ALTER TABLE subscription_plans 
ADD COLUMN IF NOT EXISTS razorpay_payment_link TEXT;

-- First, delete old plans
DELETE FROM subscription_plans;
INSERT INTO subscription_plans (
  name, 
  display_name, 
  description, 
  price_inr, 
  currency, 
  duration_days, 
  is_active, 
  features,
  razorpay_payment_link
)
VALUES 
  (
    'basic',
    'Basic Plan',
    'Perfect for individual agents and small teams',
    799.00,
    'INR',
    30,
    true,
    '["Up to 300 policies/month", "Manual policy entry", "Basic dashboard with analytics", "Policy reminders", "Claims management", "Activity logs", "Email support", "Mobile responsive", "Dark mode", "Search & filters"]'::jsonb,
    'https://rzp.io/rzp/uasXBqe'
  ),
  (
    'standard',
    'Standard Plan',
    'AI-powered automation for growing agencies',
    1499.00,
    'INR',
    30,
    true,
    '["Up to 800 policies/month", "AI auto-fill from PDF documents", "Manual entry option", "Advanced dashboard & charts", "Task management system", "Commission tracking", "Lapsed policies management", "Export to Excel/CSV", "Priority email support", "All Basic features"]'::jsonb,
    'https://rzp.io/rzp/3Qz9HtAn'
  ),
  (
    'premium',
    'Premium Plan',
    'Complete solution with bulk operations for established agencies',
    2499.00,
    'INR',
    30,
    true,
    '["Up to 2000 policies/month", "AI auto-fill from PDF", "Bulk import via Excel/CSV", "Bulk export capabilities", "Sub-admin management", "Advanced task assignment", "Team collaboration tools", "Commission analytics", "Custom reports", "WhatsApp support", "Priority phone support", "All Standard features"]'::jsonb,
    'https://rzp.io/rzp/8GnDQzqY'
  ),
  (
    'enterprise',
    'Enterprise Plan',
    'Tailored solution for large organizations and brokers',
    0.00,
    'INR',
    30,
    true,
    '["Unlimited policies", "Multi-branch support", "Custom AI training", "API access", "Custom integrations", "Dedicated account manager", "24/7 priority support", "Custom workflows", "White-label options", "Data migration assistance", "SLA guarantee", "Onboarding training", "All Premium features"]'::jsonb,
    NULL
  );

-- Verify the new plans
SELECT 
  name, 
  display_name, 
  price_inr, 
  duration_days, 
  features 
FROM subscription_plans 
WHERE is_active = true
ORDER BY price_inr;
