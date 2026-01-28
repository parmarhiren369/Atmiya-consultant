import { supabase } from '../config/supabase';
import { AppUser } from '../types';

export class UserService {
  private static instance: UserService;

  static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async initializeUsers(): Promise<void> {
    // Check if users already exist
    const existingUsers = await this.getAllUsers();
    
    if (existingUsers.length === 0) {
      console.warn('No users found in database. Please sign up to create your account.');
    } else {
      console.log(`Found ${existingUsers.length} users in database.`);
    }
  }

  async authenticateUser(_userId: string, _password: string): Promise<AppUser | null> {
    // This method is deprecated - use Supabase auth instead
    console.warn('authenticateUser is deprecated. Use Supabase auth via supabaseAuthService.');
    return null;
  }

  async getAllUsers(): Promise<AppUser[]> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      return (data || []).map(row => ({
        id: row.id,
        userId: row.id, // Use id as userId for compatibility
        displayName: row.display_name,
        email: row.email,
        role: row.role,
        isActive: row.is_active,
        createdAt: new Date(row.created_at),
        lastLogin: row.last_login ? new Date(row.last_login) : undefined,
        subscriptionStatus: row.subscription_status || 'trial',
        isLocked: row.is_locked || false,
      }));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows returned
          return null;
        }
        throw error;
      }

      if (!data) return null;

      return {
        id: data.id,
        userId: data.id,
        displayName: data.display_name,
        email: data.email,
        role: data.role,
        isActive: data.is_active,
        createdAt: new Date(data.created_at),
        lastLogin: data.last_login ? new Date(data.last_login) : undefined,
        subscriptionStatus: data.subscription_status || 'trial',
        isLocked: data.is_locked || false,
      };
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('users')
        .update({ last_login: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating last login:', error);
      }
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }
}

export const userService = UserService.getInstance();

