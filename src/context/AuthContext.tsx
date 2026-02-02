import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { AppUser, LoginCredentials, TeamMember } from '../types';
import { firebaseAuthService } from '../services/firebaseAuthService';
import { teamMemberService } from '../services/teamMemberService';
import toast from 'react-hot-toast';

interface AuthContextType {
  user: AppUser | null;
  teamMember: TeamMember | null;
  isTeamMember: boolean;
  pageAccess: string[];
  effectiveUserId: string | null; // Admin's user ID for team members, own user ID for regular users
  loading: boolean;
  login: (credentials: LoginCredentials) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null);
  const [teamMember, setTeamMember] = useState<TeamMember | null>(null);
  const [pageAccess, setPageAccess] = useState<string[]>([]);
  const [effectiveUserId, setEffectiveUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    const initializeAuth = async () => {
      try {
        const timeoutPromise = new Promise<null>((resolve) => {
          setTimeout(() => resolve(null), 3000);
        });

        const currentUser = await Promise.race([
          firebaseAuthService.getCurrentUser(),
          timeoutPromise
        ]);
        
        if (currentUser) {
          setUser(currentUser);
          setEffectiveUserId(currentUser.id); // Set effectiveUserId for regular users
        }
      } catch (error) {
        console.error('Auth error:', error);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();

    // Listen for Firebase auth state changes
    const unsubscribe = firebaseAuthService.onAuthStateChange(async (firebaseUser) => {
      console.log('Auth state change:', firebaseUser ? 'signed in' : 'signed out');
      
      if (firebaseUser) {
        try {
          const currentUser = await firebaseAuthService.getCurrentUser();
          if (currentUser) {
            setUser(currentUser);
            setEffectiveUserId(currentUser.id);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
        setLoading(false);
      } else {
        setUser(null);
        setEffectiveUserId(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribe();
    };
  }, []);

  const login = async (credentials: LoginCredentials) => {
    try {
      setLoading(true);
      
      // First, try team member authentication
      try {
        const teamMemberAuth = await teamMemberService.authenticateTeamMember(
          credentials.email,
          credentials.password
        );
        
        if (teamMemberAuth) {
          // Team member login successful - use admin's user ID for data access
          console.log('Team member authenticated:', teamMemberAuth);
          console.log('Setting pageAccess to:', teamMemberAuth.permissions?.pageAccess);
          
          setTeamMember(teamMemberAuth);
          setPageAccess(teamMemberAuth.permissions?.pageAccess || []);
          setEffectiveUserId(teamMemberAuth.adminUserId); // Use admin's ID for queries
          setUser(null);
          
          console.log('State set. pageAccess should now be:', teamMemberAuth.permissions?.pageAccess);
          
          toast.success(`Welcome, ${teamMemberAuth.fullName}!`);
          return;
        }
      } catch (teamMemberError) {
        console.log('Not a team member, trying regular auth:', teamMemberError);
      }
      
      // If not a team member, try regular user authentication
      const { user: authenticatedUser, error } = await firebaseAuthService.signin(credentials);
      
      if (error) {
        toast.error(error);
        throw new Error(error);
      }

      if (authenticatedUser) {
        setUser(authenticatedUser);
        setTeamMember(null);
        setPageAccess([]); // Admin/regular users have full access
        setEffectiveUserId(authenticatedUser.id); // Use own ID
        
        toast.success(`Welcome back, ${authenticatedUser.displayName}!`);
      }
    } catch (error) {
      throw error;
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (teamMember) {
        // Team member logout - just clear local state
        setTeamMember(null);
        setPageAccess([]);
        setEffectiveUserId(null);
      } else {
        // Regular user logout
        await firebaseAuthService.signout();
        setUser(null);
        setEffectiveUserId(null);
      }
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  const value = {
    user,
    teamMember,
    isTeamMember: !!teamMember,
    pageAccess,
    effectiveUserId,
    loading,
    login,
    logout,
    isAuthenticated: !!(user || teamMember)
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
