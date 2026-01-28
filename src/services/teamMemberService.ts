import { supabase } from '../config/supabase';
import { TeamMember, TeamMemberFormData } from '../types';

/**
 * Team Member Service
 * Handles CRUD operations for team members and their permissions
 * Admin can create up to 3 team members who can be assigned tasks and leads
 * 
 * Note: Using simple SHA-256 hashing for browser compatibility
 */

// Simple SHA-256 hash function for browser
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const teamMemberService = {
  /**
   * Get count of team members for current admin
   */
  async getTeamMemberCount(): Promise<number> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { count, error } = await supabase
      .from('team_members')
      .select('*', { count: 'exact', head: true })
      .eq('admin_user_id', user.id)
      .eq('is_active', true);

    if (error) {
      console.error('Error fetching team member count:', error);
      throw error;
    }

    return count || 0;
  },

  /**
   * Get all team members for current admin
   */
  async getTeamMembers(): Promise<TeamMember[]> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        permissions:team_member_permissions(*)
      `)
      .eq('admin_user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }

    return (data || []).map(member => ({
      id: member.id,
      adminUserId: member.admin_user_id,
      email: member.email,
      passwordHash: member.password_hash,
      fullName: member.full_name,
      isActive: member.is_active,
      createdAt: new Date(member.created_at),
      updatedAt: new Date(member.updated_at),
      permissions: member.permissions?.[0] ? {
        id: member.permissions[0].id,
        teamMemberId: member.permissions[0].team_member_id,
        pageAccess: member.permissions[0].page_access || [],
        createdAt: new Date(member.permissions[0].created_at),
        updatedAt: new Date(member.permissions[0].updated_at),
      } : undefined
    }));
  },

  /**
   * Create a new team member
   */
  async createTeamMember(formData: TeamMemberFormData): Promise<TeamMember> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if limit reached
    const count = await this.getTeamMemberCount();
    if (count >= 3) {
      throw new Error('Maximum limit of 3 team members reached');
    }

    // Check if email already exists
    const { data: existingMember } = await supabase
      .from('team_members')
      .select('id')
      .eq('email', formData.email)
      .single();

    if (existingMember) {
      throw new Error('A team member with this email already exists');
    }

    // Hash password
    const passwordHash = await hashPassword(formData.password);

    // Create team member
    const { data: newMember, error: memberError } = await supabase
      .from('team_members')
      .insert({
        admin_user_id: user.id,
        email: formData.email,
        password_hash: passwordHash,
        full_name: formData.fullName,
        is_active: true
      })
      .select()
      .single();

    if (memberError) {
      console.error('Error creating team member:', memberError);
      throw memberError;
    }

    // Create permissions
    const { data: permissions, error: permError } = await supabase
      .from('team_member_permissions')
      .insert({
        team_member_id: newMember.id,
        page_access: formData.pageAccess
      })
      .select()
      .single();

    if (permError) {
      console.error('Error creating team member permissions:', permError);
      // Rollback: delete the team member
      await supabase.from('team_members').delete().eq('id', newMember.id);
      throw permError;
    }

    return {
      id: newMember.id,
      adminUserId: newMember.admin_user_id,
      email: newMember.email,
      passwordHash: newMember.password_hash,
      fullName: newMember.full_name,
      isActive: newMember.is_active,
      createdAt: new Date(newMember.created_at),
      updatedAt: new Date(newMember.updated_at),
      permissions: {
        id: permissions.id,
        teamMemberId: permissions.team_member_id,
        pageAccess: permissions.page_access || [],
        createdAt: new Date(permissions.created_at),
        updatedAt: new Date(permissions.updated_at),
      }
    };
  },

  /**
   * Update team member
   */
  async updateTeamMember(id: string, formData: Partial<TeamMemberFormData>): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Update team member basic info
    const updateData: any = {};
    if (formData.fullName) updateData.full_name = formData.fullName;
    if (formData.email) updateData.email = formData.email;
    if (formData.password) {
      updateData.password_hash = await hashPassword(formData.password);
    }

    if (Object.keys(updateData).length > 0) {
      const { error: memberError } = await supabase
        .from('team_members')
        .update(updateData)
        .eq('id', id)
        .eq('admin_user_id', user.id);

      if (memberError) {
        console.error('Error updating team member:', memberError);
        throw memberError;
      }
    }

    // Update permissions if provided
    if (formData.pageAccess) {
      const { error: permError } = await supabase
        .from('team_member_permissions')
        .update({ page_access: formData.pageAccess })
        .eq('team_member_id', id);

      if (permError) {
        console.error('Error updating team member permissions:', permError);
        throw permError;
      }
    }
  },

  /**
   * Toggle team member active status
   */
  async toggleTeamMemberStatus(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Get current status
    const { data: member } = await supabase
      .from('team_members')
      .select('is_active')
      .eq('id', id)
      .eq('admin_user_id', user.id)
      .single();

    if (!member) {
      throw new Error('Team member not found');
    }

    // Toggle status
    const { error } = await supabase
      .from('team_members')
      .update({ is_active: !member.is_active })
      .eq('id', id)
      .eq('admin_user_id', user.id);

    if (error) {
      console.error('Error toggling team member status:', error);
      throw error;
    }
  },

  /**
   * Delete team member
   */
  async deleteTeamMember(id: string): Promise<void> {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      throw new Error('User not authenticated');
    }

    const { error } = await supabase
      .from('team_members')
      .delete()
      .eq('id', id)
      .eq('admin_user_id', user.id);

    if (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  /**
   * Get team member by ID (for assignment dropdowns)
   */
  async getTeamMemberById(id: string): Promise<TeamMember | null> {
    const { data, error } = await supabase
      .from('team_members')
      .select(`
        *,
        permissions:team_member_permissions(*)
      `)
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching team member:', error);
      return null;
    }

    if (!data) return null;

    return {
      id: data.id,
      adminUserId: data.admin_user_id,
      email: data.email,
      passwordHash: data.password_hash,
      fullName: data.full_name,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      permissions: data.permissions?.[0] ? {
        id: data.permissions[0].id,
        teamMemberId: data.permissions[0].team_member_id,
        pageAccess: data.permissions[0].page_access || [],
        createdAt: new Date(data.permissions[0].created_at),
        updatedAt: new Date(data.permissions[0].updated_at),
      } : undefined
    };
  },

  /**
   * Authenticate team member login
   */
  async authenticateTeamMember(email: string, password: string): Promise<TeamMember | null> {
    try {
      // First get team member
      const { data: memberData, error: memberError } = await supabase
        .from('team_members')
        .select('*')
        .eq('email', email)
        .eq('is_active', true)
        .single();

      if (memberError || !memberData) {
        console.error('Error authenticating team member:', memberError);
        return null;
      }

      console.log('Team member found:', memberData);

      // Hash the input password and compare
      const inputPasswordHash = await hashPassword(password);
      const isValid = inputPasswordHash === memberData.password_hash;
      
      if (!isValid) {
        console.error('Password does not match');
        return null;
      }

      // Now get permissions separately
      const { data: permData, error: permError } = await supabase
        .from('team_member_permissions')
        .select('*')
        .eq('team_member_id', memberData.id)
        .single();

      console.log('Permissions data:', permData);
      console.log('Permissions error:', permError);

      const teamMemberResult = {
        id: memberData.id,
        adminUserId: memberData.admin_user_id,
        email: memberData.email,
        passwordHash: memberData.password_hash,
        fullName: memberData.full_name,
        isActive: memberData.is_active,
        createdAt: new Date(memberData.created_at),
        updatedAt: new Date(memberData.updated_at),
        permissions: permData ? {
          id: permData.id,
          teamMemberId: permData.team_member_id,
          pageAccess: permData.page_access || [],
          createdAt: new Date(permData.created_at),
          updatedAt: new Date(permData.updated_at),
        } : undefined
      };
      
      console.log('Final team member object:', teamMemberResult);
      console.log('Final page access:', teamMemberResult.permissions?.pageAccess);
      
      return teamMemberResult;
    } catch (error) {
      console.error('Exception in authenticateTeamMember:', error);
      return null;
    }
  },

  /**
   * Generate a random password
   */
  generatePassword(length: number = 12): string {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  }
};
