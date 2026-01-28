import { supabase, TABLES } from '../config/supabase';
import { AppUser, SignupCredentials, LoginCredentials, SupabaseUserData } from '../types';

const TRIAL_DAYS = 15;
// Set to true to bypass subscription checks during development/testing
const DEV_MODE = false;

export class SupabaseAuthService {
  /**
   * Sign up a new user
   */
  async signup(credentials: SignupCredentials): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      console.log('Starting signup for:', credentials.email);
      
      // Create auth user in Supabase with email confirmation disabled
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: credentials.email,
        password: credentials.password,
        options: {
          emailRedirectTo: undefined,
          data: {
            display_name: credentials.displayName,
          }
        }
      });

      if (authError) {
        console.error('Auth signup error:', authError);
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Failed to create user' };
      }

      console.log('Auth user created:', authData.user.id);

      // Calculate trial dates
      const trialStartDate = new Date();
      const trialEndDate = new Date();
      trialEndDate.setDate(trialEndDate.getDate() + TRIAL_DAYS);

      // Create user profile in database with snake_case column names
      const userProfileData = {
        id: authData.user.id,
        email: credentials.email,
        display_name: credentials.displayName,
        role: credentials.isAdmin ? 'admin' : 'user',
        is_active: true,
        created_at: new Date().toISOString(),
        subscription_status: credentials.isAdmin ? 'active' : 'trial',
        trial_start_date: credentials.isAdmin ? null : trialStartDate.toISOString(),
        trial_end_date: credentials.isAdmin ? null : trialEndDate.toISOString(),
        is_locked: false,
      };

      console.log('Inserting profile data:', userProfileData);

      const { data: profileData, error: profileError } = await supabase
        .from(TABLES.USERS)
        .insert([userProfileData])
        .select()
        .single();

      if (profileError) {
        console.error('Profile creation error:', profileError);
        return { user: null, error: `Failed to create profile: ${profileError.message}` };
      }

      console.log('Profile created successfully');

      // Parse the returned data using the helper method
      const parsedUser = this.parseUserData(profileData);

      // Send user data to webhook via Vite proxy
      console.log('🔔 Attempting to send webhook notification...');
      try {
        const webhookData = {
          userId: parsedUser.id,
          email: parsedUser.email,
          displayName: parsedUser.displayName,
          role: parsedUser.role,
          subscriptionStatus: parsedUser.subscriptionStatus,
          trialStartDate: parsedUser.trialStartDate,
          trialEndDate: parsedUser.trialEndDate,
          createdAt: parsedUser.createdAt,
          timestamp: new Date().toISOString(),
        };
        
        console.log('📤 Webhook payload:', webhookData);
        
        // Use API route which works in both development and production
        const response = await fetch('/api/send-webhook', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(webhookData),
        });
        
        console.log('✅ Webhook response status:', response.status);
        console.log('✅ Webhook response ok:', response.ok);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('❌ Webhook failed with status:', response.status, errorText);
        } else {
          console.log('✅ Webhook notification sent successfully for:', parsedUser.email);
        }
      } catch (webhookError) {
        console.error('❌ Failed to send webhook notification:', webhookError);
        console.error('❌ Error details:', webhookError instanceof Error ? webhookError.message : 'Unknown error');
        // Don't fail signup if webhook fails
      }

      return { 
        user: parsedUser, 
        error: null 
      };
    } catch (error) {
      console.error('Signup error:', error);
      return { user: null, error: error instanceof Error ? error.message : 'Signup failed' };
    }
  }

  /**
   * Sign in user
   */
  async signin(credentials: LoginCredentials): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      // Authenticate with Supabase
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: credentials.email,
        password: credentials.password,
      });

      if (authError) {
        return { user: null, error: authError.message };
      }

      if (!authData.user) {
        return { user: null, error: 'Authentication failed' };
      }

      // Get user profile with timeout
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });

      const profilePromise = supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', authData.user.id)
        .maybeSingle();

      const result = await Promise.race([profilePromise, timeoutPromise]);

      if (!result || result === null) {
        await supabase.auth.signOut();
        return { user: null, error: 'Unable to fetch user profile. Please try again.' };
      }

      const { data: profileData, error: profileError } = result as { data: SupabaseUserData | null; error: unknown };

      if (profileError || !profileData) {
        await supabase.auth.signOut();
        return { user: null, error: 'User profile not found in database' };
      }

      // Parse user data
      const user = this.parseUserData(profileData);

      // Check if account is locked
      if (user.isLocked) {
        await supabase.auth.signOut();
        return { user: null, error: `Account locked: ${user.lockedReason || 'Contact admin'}` };
      }

      // Check and update subscription status
      let finalUser = user;
      if (!DEV_MODE) {
        finalUser = await this.checkAndUpdateSubscriptionStatus(user);
        // DON'T sign out expired users - let them login to access pricing page
        // ProtectedRoute will handle blocking access to features
      }

      // Update last login
      supabase
        .from(TABLES.USERS)
        .update({ last_login: new Date().toISOString() })
        .eq('id', authData.user.id)
        .then(() => {});

      return { user: { ...finalUser, lastLogin: new Date() }, error: null };
    } catch (error) {
      return { user: null, error: error instanceof Error ? error.message : 'Login failed' };
    }
  }

  /**
   * Sign out user
   */
  async signout(): Promise<{ error: string | null }> {
    try {
      const { error } = await supabase.auth.signOut();
      return { error: error ? error.message : null };
    } catch (error) {
      return { error: error instanceof Error ? error.message : 'Signout failed' };
    }
  }

  /**
   * Get current session
   */
  async getCurrentUser(): Promise<AppUser | null> {
    try {
      const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
      
      if (authError || !authUser) {
        return null;
      }

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise<null>((resolve) => {
        setTimeout(() => resolve(null), 3000);
      });

      const profilePromise = supabase
        .from(TABLES.USERS)
        .select('*')
        .eq('id', authUser.id)
        .maybeSingle();

      const result = await Promise.race([profilePromise, timeoutPromise]);
      
      if (!result || result === null) {
        return null;
      }

      const { data: profileData, error } = result as { data: SupabaseUserData | null; error: unknown };

      if (error || !profileData) {
        return null;
      }

      const user = this.parseUserData(profileData);
      // Always check and update subscription status
      const updatedUser = await this.checkAndUpdateSubscriptionStatus(user);
      return updatedUser;
    } catch {
      return null;
    }
  }

  /**
   * Check and update subscription status
   */
  private async checkAndUpdateSubscriptionStatus(user: AppUser): Promise<AppUser> {
    if (user.role === 'admin') return user; // Admins don't have subscription limits

    const now = new Date();
    let needsUpdate = false;
    let newStatus = user.subscriptionStatus;

    // Check if trial expired
    if (user.subscriptionStatus === 'trial' && user.trialEndDate) {
      if (now > user.trialEndDate) {
        newStatus = 'expired';
        needsUpdate = true;
      }
    }

    // Check if active subscription expired
    if (user.subscriptionStatus === 'active' && user.subscriptionEndDate) {
      if (now > user.subscriptionEndDate) {
        newStatus = 'expired';
        needsUpdate = true;
      }
    }

    if (needsUpdate) {
      await supabase
        .from(TABLES.USERS)
        .update({ subscription_status: newStatus })
        .eq('id', user.id);

      return { ...user, subscriptionStatus: newStatus };
    }

    return user;
  }

  /**
   * Calculate days remaining
   */
  getDaysRemaining(user: AppUser): number {
    if (user.role === 'admin') return Infinity;

    const now = new Date();
    let endDate: Date | undefined;

    if (user.subscriptionStatus === 'trial') {
      endDate = user.trialEndDate;
    } else if (user.subscriptionStatus === 'active') {
      endDate = user.subscriptionEndDate;
    }

    if (!endDate) return 0;

    const diffTime = endDate.getTime() - now.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return Math.max(0, diffDays);
  }

  /**
   * Check if user can access system
   */
  canAccessSystem(user: AppUser): boolean {
    if (user.role === 'admin') return true;
    if (user.isLocked) return false;
    return user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'active';
  }

  /**
   * Parse user data from database
   */
  private parseUserData(data: SupabaseUserData): AppUser {
    return {
      id: data.id,
      email: data.email,
      displayName: (data.displayName || data.display_name) || 'Unknown User',
      role: (data.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
      isActive: data.isActive ?? data.is_active ?? true,
      createdAt: new Date(data.createdAt || data.created_at || Date.now()),
      lastLogin: data.lastLogin ? new Date(data.lastLogin) : data.last_login ? new Date(data.last_login) : undefined,
      subscriptionStatus: (data.subscriptionStatus || data.subscription_status || 'trial') as 'trial' | 'active' | 'expired' | 'locked',
      trialStartDate: data.trialStartDate ? new Date(data.trialStartDate) : data.trial_start_date ? new Date(data.trial_start_date) : undefined,
      trialEndDate: data.trialEndDate ? new Date(data.trialEndDate) : data.trial_end_date ? new Date(data.trial_end_date) : undefined,
      subscriptionStartDate: data.subscriptionStartDate ? new Date(data.subscriptionStartDate) : data.subscription_start_date ? new Date(data.subscription_start_date) : undefined,
      subscriptionEndDate: data.subscriptionEndDate ? new Date(data.subscriptionEndDate) : data.subscription_end_date ? new Date(data.subscription_end_date) : undefined,
      isLocked: data.isLocked ?? data.is_locked ?? false,
      lockedReason: data.lockedReason || data.locked_reason,
      lockedBy: data.lockedBy || data.locked_by,
      lockedAt: data.lockedAt ? new Date(data.lockedAt) : data.locked_at ? new Date(data.locked_at) : undefined,
    };
  }
}

export const supabaseAuthService = new SupabaseAuthService();
