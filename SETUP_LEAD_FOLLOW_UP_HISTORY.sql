-- Lead Follow-Up History Tracking Table
-- This table stores all follow-up interactions for leads, enabling complete tracking

-- Create lead_follow_up_history table
CREATE TABLE IF NOT EXISTS public.lead_follow_up_history (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
    follow_up_date TIMESTAMPTZ NOT NULL,
    actual_follow_up_date TIMESTAMPTZ NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('completed', 'missed', 'rescheduled')),
    notes TEXT NOT NULL,
    next_follow_up_date TIMESTAMPTZ,
    created_by TEXT NOT NULL,
    created_by_name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_lead_id ON public.lead_follow_up_history(lead_id);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_follow_up_date ON public.lead_follow_up_history(follow_up_date);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_status ON public.lead_follow_up_history(status);
CREATE INDEX IF NOT EXISTS idx_lead_follow_up_history_created_at ON public.lead_follow_up_history(created_at);

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
            SELECT id FROM public.leads WHERE user_id = auth.uid()::text
        )
    );

-- Users can insert follow-up history for their own leads
CREATE POLICY "Users can insert their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR INSERT
    WITH CHECK (
        lead_id IN (
            SELECT id FROM public.leads WHERE user_id = auth.uid()::text
        )
    );

-- Users can update their own follow-up history
CREATE POLICY "Users can update their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR UPDATE
    USING (created_by = auth.uid()::text)
    WITH CHECK (created_by = auth.uid()::text);

-- Users can delete their own follow-up history
CREATE POLICY "Users can delete their own lead follow-up history"
    ON public.lead_follow_up_history
    FOR DELETE
    USING (created_by = auth.uid()::text);

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

-- Verification query (you can run this after creating the table)
-- SELECT * FROM public.lead_follow_up_history LIMIT 10;

COMMENT ON TABLE public.lead_follow_up_history IS 'Stores follow-up interaction history for leads with complete tracking';
COMMENT ON COLUMN public.lead_follow_up_history.lead_id IS 'Reference to the lead';
COMMENT ON COLUMN public.lead_follow_up_history.follow_up_date IS 'Scheduled follow-up date';
COMMENT ON COLUMN public.lead_follow_up_history.actual_follow_up_date IS 'When the follow-up actually occurred';
COMMENT ON COLUMN public.lead_follow_up_history.status IS 'Follow-up status: completed, missed, or rescheduled';
COMMENT ON COLUMN public.lead_follow_up_history.notes IS 'Notes from the follow-up interaction';
COMMENT ON COLUMN public.lead_follow_up_history.next_follow_up_date IS 'Next scheduled follow-up date';
COMMENT ON COLUMN public.lead_follow_up_history.created_by IS 'User ID who created this follow-up record';
COMMENT ON COLUMN public.lead_follow_up_history.created_by_name IS 'Display name of user who created this record';
