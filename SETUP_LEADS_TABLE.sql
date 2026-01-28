-- Create leads table for lead management system
CREATE TABLE IF NOT EXISTS leads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_name TEXT NOT NULL,
  customer_mobile TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  product_type TEXT NOT NULL,
  follow_up_date TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'new',
  lead_source TEXT NOT NULL,
  remark TEXT,
  next_follow_up_date TIMESTAMP WITH TIME ZONE,
  priority TEXT DEFAULT 'medium',
  estimated_value NUMERIC,
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  assigned_to_name TEXT,
  converted_to_policy_id UUID,
  is_converted BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_product_type ON leads(product_type);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_date ON leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON leads(priority);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_is_converted ON leads(is_converted);

-- Add constraint to ensure valid status values
ALTER TABLE leads ADD CONSTRAINT valid_status 
  CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'follow_up', 'negotiation', 'won', 'lost', 'canceled'));

-- Add constraint to ensure valid priority values
ALTER TABLE leads ADD CONSTRAINT valid_priority 
  CHECK (priority IN ('low', 'medium', 'high'));

-- Enable Row Level Security (RLS)
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
-- Policy: Users can view their own leads
CREATE POLICY "Users can view their own leads"
  ON leads
  FOR SELECT
  USING (auth.uid() = user_id);

-- Policy: Users can insert their own leads
CREATE POLICY "Users can insert their own leads"
  ON leads
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can update their own leads
CREATE POLICY "Users can update their own leads"
  ON leads
  FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own leads
CREATE POLICY "Users can delete their own leads"
  ON leads
  FOR DELETE
  USING (auth.uid() = user_id);

-- Create a trigger to automatically update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_leads_updated_at
  BEFORE UPDATE ON leads
  FOR EACH ROW
  EXECUTE FUNCTION update_leads_updated_at();

-- Grant necessary permissions
GRANT ALL ON leads TO authenticated;
GRANT ALL ON leads TO service_role;

-- Add comment to the table
COMMENT ON TABLE leads IS 'Stores customer lead information for lead management and tracking';
