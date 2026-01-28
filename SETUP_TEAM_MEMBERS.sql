-- ========================================
-- TEAM MEMBERS & PERMISSIONS SETUP
-- Run this script in your Supabase SQL Editor
-- ========================================

-- ========================================
-- PART 1: TEAM MEMBERS TABLE
-- ========================================

-- Create team_members table
CREATE TABLE IF NOT EXISTS public.team_members (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    admin_user_id UUID NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_members_admin_user_id ON public.team_members(admin_user_id);
CREATE INDEX IF NOT EXISTS idx_team_members_email ON public.team_members(email);
CREATE INDEX IF NOT EXISTS idx_team_members_is_active ON public.team_members(is_active);

-- Enable Row Level Security
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view their own team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can insert their own team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can update their own team members" ON public.team_members;
DROP POLICY IF EXISTS "Admins can delete their own team members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their own record" ON public.team_members;
DROP POLICY IF EXISTS "Allow login authentication for team members" ON public.team_members;

-- Create RLS policies
CREATE POLICY "Allow login authentication for team members"
    ON public.team_members
    FOR SELECT
    USING (is_active = true);

CREATE POLICY "Admins can view their own team members"
    ON public.team_members
    FOR SELECT
    USING (admin_user_id = auth.uid());

CREATE POLICY "Admins can insert their own team members"
    ON public.team_members
    FOR INSERT
    WITH CHECK (
        admin_user_id = auth.uid()
        AND (SELECT COUNT(*) FROM public.team_members WHERE admin_user_id = auth.uid()) < 3
    );

CREATE POLICY "Admins can update their own team members"
    ON public.team_members
    FOR UPDATE
    USING (admin_user_id = auth.uid())
    WITH CHECK (admin_user_id = auth.uid());

CREATE POLICY "Admins can delete their own team members"
    ON public.team_members
    FOR DELETE
    USING (admin_user_id = auth.uid());

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_team_members_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_team_members_updated_at ON public.team_members;
CREATE TRIGGER update_team_members_updated_at
    BEFORE UPDATE ON public.team_members
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_members_updated_at();

-- Grant permissions
GRANT ALL ON public.team_members TO authenticated;
GRANT ALL ON public.team_members TO service_role;

-- ========================================
-- PART 2: TEAM MEMBER PERMISSIONS TABLE
-- ========================================

-- Create team_member_permissions table
CREATE TABLE IF NOT EXISTS public.team_member_permissions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    team_member_id UUID NOT NULL REFERENCES public.team_members(id) ON DELETE CASCADE,
    page_access JSONB NOT NULL DEFAULT '[]'::jsonb,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(team_member_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_team_member_permissions_team_member_id ON public.team_member_permissions(team_member_id);

-- Enable Row Level Security
ALTER TABLE public.team_member_permissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view their team members permissions" ON public.team_member_permissions;
DROP POLICY IF EXISTS "Admins can insert their team members permissions" ON public.team_member_permissions;
DROP POLICY IF EXISTS "Admins can update their team members permissions" ON public.team_member_permissions;
DROP POLICY IF EXISTS "Admins can delete their team members permissions" ON public.team_member_permissions;
DROP POLICY IF EXISTS "Team members can view their own permissions" ON public.team_member_permissions;
DROP POLICY IF EXISTS "Allow public read for active team member permissions" ON public.team_member_permissions;

-- Create RLS policies
CREATE POLICY "Allow public read for active team member permissions"
    ON public.team_member_permissions
    FOR SELECT
    USING (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE is_active = true
        )
    );

CREATE POLICY "Admins can view their team members permissions"
    ON public.team_member_permissions
    FOR SELECT
    USING (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE admin_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can insert their team members permissions"
    ON public.team_member_permissions
    FOR INSERT
    WITH CHECK (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE admin_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can update their team members permissions"
    ON public.team_member_permissions
    FOR UPDATE
    USING (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE admin_user_id = auth.uid()
        )
    )
    WITH CHECK (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE admin_user_id = auth.uid()
        )
    );

CREATE POLICY "Admins can delete their team members permissions"
    ON public.team_member_permissions
    FOR DELETE
    USING (
        team_member_id IN (
            SELECT id FROM public.team_members WHERE admin_user_id = auth.uid()
        )
    );

CREATE POLICY "Team members can view their own permissions"
    ON public.team_member_permissions
    FOR SELECT
    USING (team_member_id = auth.uid());

-- Create trigger function to update updated_at
CREATE OR REPLACE FUNCTION public.update_team_member_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_team_member_permissions_updated_at ON public.team_member_permissions;
CREATE TRIGGER update_team_member_permissions_updated_at
    BEFORE UPDATE ON public.team_member_permissions
    FOR EACH ROW
    EXECUTE FUNCTION public.update_team_member_permissions_updated_at();

-- Grant permissions
GRANT ALL ON public.team_member_permissions TO authenticated;
GRANT ALL ON public.team_member_permissions TO service_role;

-- ========================================
-- PART 3: UPDATE EXISTING TABLES
-- ========================================

-- Add team member assignment to tasks table
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS assigned_to_team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_team_member ON public.tasks(assigned_to_team_member_id);

-- Add team member assignment to leads table
ALTER TABLE public.leads 
ADD COLUMN IF NOT EXISTS assigned_to_team_member_id UUID REFERENCES public.team_members(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_leads_assigned_to_team_member ON public.leads(assigned_to_team_member_id);

-- ========================================
-- PART 4: HELPFUL COMMENTS
-- ========================================

COMMENT ON TABLE public.team_members IS 'Stores team members created by admin users (max 3 per admin)';
COMMENT ON TABLE public.team_member_permissions IS 'Stores page access permissions for each team member';

COMMENT ON COLUMN public.team_members.admin_user_id IS 'The admin user who created this team member';
COMMENT ON COLUMN public.team_members.email IS 'Team member login email (unique)';
COMMENT ON COLUMN public.team_members.password_hash IS 'Hashed password for team member login';
COMMENT ON COLUMN public.team_members.is_active IS 'Whether the team member account is active';

COMMENT ON COLUMN public.team_member_permissions.page_access IS 'JSON array of page routes the team member can access';

-- ========================================
-- SETUP COMPLETE!
-- ========================================
-- Tables created:
-- ✅ public.team_members - Team member accounts (max 3 per admin)
-- ✅ public.team_member_permissions - Page access permissions
--
-- Tables updated:
-- ✅ public.tasks - Added assigned_to_team_member_id column
-- ✅ public.leads - Added assigned_to_team_member_id column
--
-- Features enabled:
-- ✅ Row Level Security (RLS) - Admins can only manage their team members
-- ✅ 3-member limit enforced in INSERT policy
-- ✅ Foreign key constraints with CASCADE delete
-- ✅ Team members can view their own record and permissions
-- ✅ Auto timestamps managed
-- ✅ Unique email constraint
--
-- Next steps:
-- 1. Create team members from Task Management page
-- 2. Assign page permissions via checkboxes
-- 3. Team members can log in with their credentials
-- 4. Tasks and leads can be assigned to team members
-- ========================================
