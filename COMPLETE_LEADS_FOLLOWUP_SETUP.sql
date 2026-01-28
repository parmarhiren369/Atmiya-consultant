-- ========================================
-- COMPLETE LEADS & FOLLOW-UP HISTORY SETUP
-- Run this script in your Supabase SQL Editor
-- ========================================

-- ========================================
-- PART 1: LEADS TABLE SETUP
-- ========================================

-- Create leads table if not exists
CREATE TABLE IF NOT EXISTS public.leads (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL,
    customer_name TEXT NOT NULL,
    customer_mobile TEXT NOT NULL,
    customer_email TEXT NOT NULL,
    product_type TEXT NOT NULL,
    follow_up_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('new', 'contacted', 'qualified', 'proposal_sent', 'follow_up', 'negotiation', 'won', 'lost', 'canceled')),
    lead_source TEXT NOT NULL,
    remark TEXT,
    next_follow_up_date TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    assigned_to UUID,
    assigned_to_name TEXT,
    priority TEXT CHECK (priority IN ('low', 'medium', 'high')),
    estimated_value NUMERIC(12, 2),
    converted_to_policy_id UUID,
    is_converted BOOLEAN DEFAULT FALSE
);

-- Create indexes for leads table
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON public.leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON public.leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up_date ON public.leads(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_next_follow_up_date ON public.leads(next_follow_up_date);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON public.leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_priority ON public.leads(priority);

-- Enable Row Level Security for leads
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (leads)
DROP POLICY IF EXISTS "Users can view their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can insert their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update their own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can delete their own leads" ON public.leads;

-- Create RLS policies for leads
CREATE POLICY "Users can view their own leads"
    ON public.leads
    FOR SELECT
    USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own leads"
    ON public.leads
    FOR INSERT
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own leads"
    ON public.leads
    FOR UPDATE
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own leads"
    ON public.leads
    FOR DELETE
    USING (user_id = auth.uid());

-- Create trigger function to update updated_at timestamp for leads
CREATE OR REPLACE FUNCTION public.update_leads_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for leads
DROP TRIGGER IF EXISTS update_leads_updated_at ON public.leads;
CREATE TRIGGER update_leads_updated_at
    BEFORE UPDATE ON public.leads
    FOR EACH ROW
    EXECUTE FUNCTION public.update_leads_updated_at();

-- Grant permissions for leads
GRANT ALL ON public.leads TO authenticated;
GRANT ALL ON public.leads TO service_role;

-- ========================================
-- PART 2: LEAD FOLLOW-UP HISTORY TABLE
-- ========================================

-- Create lead_follow_up_history table
CREATE TABLE IF NOT EXISTS public.lead_follow_up_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    follow_up_date TIMESTAMPTZ NOT NULL,
    actual_follow_up_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'rescheduled')),
    notes TEXT NOT NULL,
    next_follow_up_date TIMESTAMPTZ,
    created_by UUID NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_lead_id ON public.lead_follow_up_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_follow_up_date ON public.lead_follow_up_history(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_status ON public.lead_follow_up_history(status);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_created_at ON public.lead_follow_up_history(created_at);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_created_by ON public.lead_follow_up_history(created_by);

-- Enable Row Level Security (RLS)
ALTER TABLE public.lead_follow_up_history ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own lead follow-up history" ON public.lead_follow_up_history;
DROP POLICY IF EXISTS "Users can insert their own lead follow-up history" ON public.lead_follow_up_history;
DROP POLICY IF EXISTS "Users can update their own lead follow-up history" ON public.lead_follow_up_history;
DROP POLICY IF EXISTS "Users can delete their own lead follow-up history" ON public.lead_follow_up_history;

-- Create RLS policies
-- Users can view follow-up history for their own leads
CREATE POLICY "Users can view their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR SELECT
    USING (
        lead_id IN (
            SELECT id FROM public.leads WHERE user_id = auth.uid()
        )
    );

-- Users can insert follow-up history for their own leads
CREATE POLICY "Users can insert their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR INSERT
    WITH CHECK (
        lead_id IN (
            SELECT id FROM public.leads WHERE user_id = auth.uid()
        )
        AND created_by = auth.uid()
    );

-- Users can update their own follow-up history
CREATE POLICY "Users can update their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR UPDATE
    USING (created_by = auth.uid())
    WITH CHECK (created_by = auth.uid());

-- Users can delete their own follow-up history
CREATE POLICY "Users can delete their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR DELETE
    USING (created_by = auth.uid());

-- Create trigger function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_lead_follow_up_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_lead_follow_up_history_updated_at ON public.lead_follow_up_history;
CREATE TRIGGER update_lead_follow_up_history_updated_at
    BEFORE UPDATE ON public.lead_follow_up_history
    FOR EACH ROW
    EXECUTE FUNCTION public.update_lead_follow_up_history_updated_at();

-- Grant necessary permissions
GRANT ALL ON public.lead_follow_up_history TO authenticated;
GRANT ALL ON public.lead_follow_up_history TO service_role;

-- ========================================
-- PART 3: VERIFICATION & COMMENTS
-- ========================================

-- Add helpful comments
COMMENT ON TABLE public.leads IS 'Stores all leads/inquiries with complete tracking';
COMMENT ON TABLE public.lead_follow_up_history IS 'Stores follow-up interaction history for leads with complete tracking';

COMMENT ON COLUMN public.lead_follow_up_history.lead_id IS 'Reference to the lead';
COMMENT ON COLUMN public.lead_follow_up_history.follow_up_date IS 'Scheduled follow-up date';
COMMENT ON COLUMN public.lead_follow_up_history.actual_follow_up_date IS 'When the follow-up actually occurred';
COMMENT ON COLUMN public.lead_follow_up_history.status IS 'Follow-up status: completed, missed, or rescheduled';
COMMENT ON COLUMN public.lead_follow_up_history.notes IS 'Notes from the follow-up interaction';
COMMENT ON COLUMN public.lead_follow_up_history.next_follow_up_date IS 'Next scheduled follow-up date';
COMMENT ON COLUMN public.lead_follow_up_history.created_by IS 'User ID who created this follow-up record';
COMMENT ON COLUMN public.lead_follow_up_history.created_by_name IS 'Display name of user who created this record';

-- Verification queries (run these to verify setup)
-- SELECT COUNT(*) as total_leads FROM public.leads;
-- SELECT COUNT(*) as total_follow_up_history FROM public.lead_follow_up_history;

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Tables created:
-- ✅ public.leads - Main leads/inquiries table
-- ✅ public.lead_follow_up_history - Follow-up history tracking
--
-- Features enabled:
-- ✅ Row Level Security (RLS) - Users can only access their own data
-- ✅ Foreign key constraints - Follow-up history linked to leads
-- ✅ Auto timestamps - created_at and updated_at automatically managed
-- ✅ Indexes - Optimized for fast queries
-- ✅ Cascade delete - Deleting a lead removes all its follow-up history
--
-- Type consistency:
-- ✅ All user IDs are UUID type matching auth.uid()
-- ✅ No UUID↔TEXT casting issues
-- ✅ All comparisons are UUID to UUID
--
-- Next steps:
-- 1. Your application can now save follow-up history
-- 2. Each user's data is completely isolated
-- 3. Test by creating a lead and adding follow-up records
-- ========================================
