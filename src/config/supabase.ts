import { createClient } from '@supabase/supabase-js';

// Supabase Configuration - Set these in your .env file
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Supabase credentials not configured. Please set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Database table names
export const TABLES = {
  USERS: 'users',
  POLICIES: 'policies',
  ACTIVITY_LOGS: 'activity_logs',
  DELETED_POLICIES: 'deleted_policies',
  LAPSED_POLICIES: 'lapsed_policies',
  TASKS: 'tasks',
};

export default supabase;
