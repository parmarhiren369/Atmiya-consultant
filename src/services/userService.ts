import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  query, 
  where, 
  orderBy,
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { AppUser } from '../types';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to AppUser type
const mapDocToUser = (id: string, data: Record<string, unknown>): AppUser => ({
  id,
  userId: id, // Use id as userId for compatibility
  displayName: data.displayName as string,
  email: data.email as string,
  role: data.role as 'admin' | 'user',
  isActive: (data.isActive as boolean) ?? true,
  createdAt: toDate(data.createdAt as Timestamp | string) || new Date(),
  lastLogin: toDate(data.lastLogin as Timestamp | string),
  subscriptionStatus: (data.subscriptionStatus as AppUser['subscriptionStatus']) || 'trial',
  isLocked: (data.isLocked as boolean) || false,
  lockedReason: data.lockedReason as string,
  lockedBy: data.lockedBy as string,
  lockedAt: toDate(data.lockedAt as Timestamp | string),
  trialStartDate: toDate(data.trialStartDate as Timestamp | string),
  trialEndDate: toDate(data.trialEndDate as Timestamp | string),
  subscriptionStartDate: toDate(data.subscriptionStartDate as Timestamp | string),
  subscriptionEndDate: toDate(data.subscriptionEndDate as Timestamp | string),
});

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
    // This method is deprecated - use Firebase auth instead
    console.warn('authenticateUser is deprecated. Use Firebase auth via firebaseAuthService.');
    return null;
  }

  async getAllUsers(): Promise<AppUser[]> {
    try {
      const q = query(
        collection(db, COLLECTIONS.USERS),
        where('isActive', '==', true),
        orderBy('createdAt', 'desc')
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToUser(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  async getUserById(userId: string): Promise<AppUser | null> {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.USERS, userId));

      if (!docSnap.exists()) return null;

      return mapDocToUser(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error getting user by ID:', error);
      return null;
    }
  }

  async updateUserLastLogin(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        lastLogin: new Date().toISOString()
      });
    } catch (error) {
      console.error('Error updating last login:', error);
    }
  }

  async lockUser(userId: string, reason: string, lockedBy: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        isLocked: true,
        lockedReason: reason,
        lockedBy,
        lockedAt: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error locking user:', error);
      throw error;
    }
  }

  async unlockUser(userId: string): Promise<void> {
    try {
      await updateDoc(doc(db, COLLECTIONS.USERS, userId), {
        isLocked: false,
        lockedReason: null,
        lockedBy: null,
        lockedAt: null,
      });
    } catch (error) {
      console.error('Error unlocking user:', error);
      throw error;
    }
  }

  async updateSubscription(
    userId: string, 
    subscriptionStatus: AppUser['subscriptionStatus'],
    startDate?: Date,
    endDate?: Date
  ): Promise<void> {
    try {
      const updateData: Record<string, unknown> = {
        subscriptionStatus,
      };
      
      if (startDate) updateData.subscriptionStartDate = startDate.toISOString();
      if (endDate) updateData.subscriptionEndDate = endDate.toISOString();

      await updateDoc(doc(db, COLLECTIONS.USERS, userId), updateData);
    } catch (error) {
      console.error('Error updating subscription:', error);
      throw error;
    }
  }
}

export const userService = UserService.getInstance();
