import { 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { doc, setDoc, getDoc, updateDoc } from 'firebase/firestore';
import { auth, db, COLLECTIONS } from '../config/firebase';
import { AppUser, SignupCredentials, LoginCredentials } from '../types';

interface FirestoreUserData {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: string;
  lastLogin?: string;
  isLocked: boolean;
  lockedReason?: string;
  lockedBy?: string;
  lockedAt?: string;
}

export class FirebaseAuthService {
  /**
   * Sign up a new user
   */
  async signup(credentials: SignupCredentials): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      console.log('Starting signup for:', credentials.email);
      
      // Create auth user in Firebase
      const userCredential = await createUserWithEmailAndPassword(
        auth, 
        credentials.email, 
        credentials.password
      );

      const firebaseUser = userCredential.user;
      console.log('Auth user created:', firebaseUser.uid);

      // Create user profile in Firestore
      const userProfileData: FirestoreUserData = {
        id: firebaseUser.uid,
        email: credentials.email,
        displayName: credentials.displayName,
        role: credentials.isAdmin ? 'admin' : 'user',
        isActive: true,
        createdAt: new Date().toISOString(),
        isLocked: false,
      };

      console.log('Creating user profile in Firestore:', userProfileData);

      await setDoc(doc(db, COLLECTIONS.USERS, firebaseUser.uid), userProfileData);

      console.log('Profile created successfully');

      // Parse the returned data
      const parsedUser = this.parseUserData(userProfileData);

      // Send user data to webhook (optional)
      try {
        const webhookData = {
          userId: parsedUser.id,
          email: parsedUser.email,
          displayName: parsedUser.displayName,
          role: parsedUser.role,
          createdAt: parsedUser.createdAt,
          timestamp: new Date().toISOString(),
        };
        
        const response = await fetch('/api/send-webhook', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(webhookData),
        });
        
        if (response.ok) {
          console.log('✅ Webhook notification sent successfully');
        }
      } catch (webhookError) {
        console.error('❌ Failed to send webhook notification:', webhookError);
        // Don't fail signup if webhook fails
      }

      return { user: parsedUser, error: null };
    } catch (error) {
      console.error('Signup error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Signup failed';
      return { user: null, error: errorMessage };
    }
  }

  /**
   * Sign in user
   */
  async signin(credentials: LoginCredentials): Promise<{ user: AppUser | null; error: string | null }> {
    try {
      // Authenticate with Firebase
      const userCredential = await signInWithEmailAndPassword(
        auth,
        credentials.email,
        credentials.password
      );

      const firebaseUser = userCredential.user;

      // Get user profile from Firestore
      const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
      const userDoc = await getDoc(userDocRef);

      if (!userDoc.exists()) {
        await signOut(auth);
        return { user: null, error: 'User profile not found in database' };
      }

      const profileData = userDoc.data() as FirestoreUserData;
      const user = this.parseUserData(profileData);

      // Check if account is locked
      if (user.isLocked) {
        await signOut(auth);
        return { user: null, error: `Account locked: ${user.lockedReason || 'Contact admin'}` };
      }

      // Update last login
      await updateDoc(userDocRef, { lastLogin: new Date().toISOString() });

      return { user: { ...user, lastLogin: new Date() }, error: null };
    } catch (error) {
      console.error('Signin error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Login failed';
      return { user: null, error: errorMessage };
    }
  }

  /**
   * Sign out user
   */
  async signout(): Promise<{ error: string | null }> {
    try {
      await signOut(auth);
      return { error: null };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Signout failed';
      return { error: errorMessage };
    }
  }

  /**
   * Get current user (returns a promise that resolves with the user)
   */
  async getCurrentUser(): Promise<AppUser | null> {
    return new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
        unsubscribe(); // Unsubscribe after first callback
        
        if (!firebaseUser) {
          resolve(null);
          return;
        }

        try {
          const userDocRef = doc(db, COLLECTIONS.USERS, firebaseUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            resolve(null);
            return;
          }

          const profileData = userDoc.data() as FirestoreUserData;
          const user = this.parseUserData(profileData);
          resolve(user);
        } catch (error) {
          console.error('Error getting current user:', error);
          resolve(null);
        }
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 5000);
    });
  }

  /**
   * Get the current Firebase user (for auth state)
   */
  getFirebaseUser(): FirebaseUser | null {
    return auth.currentUser;
  }

  /**
   * Subscribe to auth state changes
   */
  onAuthStateChange(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  /**
   * Check if user can access system
   * Simple check - just verify user is not locked
   */
  canAccessSystem(user: AppUser): boolean {
    if (user.isLocked) return false;
    return true;
  }

  /**
   * Parse user data from Firestore
   */
  private parseUserData(data: FirestoreUserData): AppUser {
    return {
      id: data.id,
      email: data.email,
      displayName: data.displayName || 'Unknown User',
      role: data.role === 'admin' ? 'admin' : 'user',
      isActive: data.isActive ?? true,
      createdAt: new Date(data.createdAt || Date.now()),
      lastLogin: data.lastLogin ? new Date(data.lastLogin) : undefined,
      isLocked: data.isLocked ?? false,
      lockedReason: data.lockedReason,
      lockedBy: data.lockedBy,
      lockedAt: data.lockedAt ? new Date(data.lockedAt) : undefined,
    };
  }

  /**
   * Get user by ID from Firestore
   */
  async getUserById(userId: string): Promise<AppUser | null> {
    try {
      const userDocRef = doc(db, COLLECTIONS.USERS, userId);
      const userDoc = await getDoc(userDocRef);
      
      if (!userDoc.exists()) {
        return null;
      }

      return this.parseUserData(userDoc.data() as FirestoreUserData);
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  /**
   * Update user profile
   */
  async updateUserProfile(userId: string, updates: Partial<FirestoreUserData>): Promise<void> {
    try {
      const userDocRef = doc(db, COLLECTIONS.USERS, userId);
      await updateDoc(userDocRef, updates);
    } catch (error) {
      console.error('Error updating user profile:', error);
      throw error;
    }
  }
}

export const firebaseAuthService = new FirebaseAuthService();
