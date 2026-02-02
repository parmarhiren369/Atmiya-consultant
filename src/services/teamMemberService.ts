import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { TeamMember, TeamMemberPermissions, TeamMemberFormData } from '../types';
import bcrypt from 'bcryptjs';
import { localBackupService } from './localBackupService';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to TeamMember type
const mapDocToTeamMember = (id: string, data: Record<string, unknown>): TeamMember => ({
  id,
  adminUserId: data.adminUserId as string,
  email: data.email as string,
  passwordHash: (data.password as string) || (data.passwordHash as string) || '',
  password: data.password as string | undefined,
  fullName: data.fullName as string,
  mobileNo: data.mobileNo as string | undefined,
  permissions: data.permissions as TeamMemberPermissions | undefined,
  isActive: data.isActive as boolean,
  createdAt: toDate(data.createdAt as Timestamp | string) || new Date(),
  updatedAt: toDate(data.updatedAt as Timestamp | string) || new Date(),
  lastLogin: toDate(data.lastLogin as Timestamp | string),
});

export const teamMemberService = {
  // Get all team members for an admin
  getTeamMembers: async (adminUserId: string): Promise<TeamMember[]> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.TEAM_MEMBERS),
        where('adminUserId', '==', adminUserId)
      );
      const querySnapshot = await getDocs(q);

      return querySnapshot.docs.map(docSnap => 
        mapDocToTeamMember(docSnap.id, docSnap.data())
      );
    } catch (error) {
      console.error('Error fetching team members:', error);
      throw error;
    }
  },

  // Get a single team member by ID
  getTeamMemberById: async (id: string): Promise<TeamMember | null> => {
    try {
      const docSnap = await getDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id));
      
      if (!docSnap.exists()) return null;

      return mapDocToTeamMember(docSnap.id, docSnap.data());
    } catch (error) {
      console.error('Error fetching team member:', error);
      throw error;
    }
  },

  // Create a new team member
  createTeamMember: async (
    teamMemberData: Omit<TeamMember, 'id' | 'createdAt' | 'updatedAt'> | (TeamMemberFormData & { adminUserId?: string })
  ): Promise<string> => {
    try {
      // Hash the password before storing
      const salt = await bcrypt.genSalt(10);
      const passwordToHash = (teamMemberData as TeamMember).password || (teamMemberData as TeamMember).passwordHash || (teamMemberData as TeamMemberFormData).password || '';
      const hashedPassword = await bcrypt.hash(passwordToHash, salt);

      // Handle both TeamMember and TeamMemberFormData inputs
      const pageAccessArray = (teamMemberData as TeamMemberFormData).pageAccess || 
        ((teamMemberData as TeamMember).permissions?.pageAccess) || [];

      const now = new Date().toISOString();
      const memberWithTimestamps = {
        adminUserId: (teamMemberData as TeamMember).adminUserId || '',
        email: teamMemberData.email.toLowerCase(),
        password: hashedPassword,
        fullName: teamMemberData.fullName,
        mobileNo: (teamMemberData as TeamMember).mobileNo || '',
        permissions: { pageAccess: pageAccessArray },
        isActive: (teamMemberData as TeamMember).isActive ?? true,
        createdAt: now,
        updatedAt: now,
      };

      const docRef = await addDoc(collection(db, COLLECTIONS.TEAM_MEMBERS), memberWithTimestamps);
      console.log('Team member created with ID:', docRef.id);

      // Local backup (don't backup password for security)
      const backupData = { ...memberWithTimestamps, password: '[HASHED]' };
      await localBackupService.backup('teamMembers', {
        action: 'CREATE',
        data: { id: docRef.id, ...backupData },
        userId: teamMemberData.adminUserId,
        userName: undefined,
        timestamp: now,
      });

      return docRef.id;
    } catch (error) {
      console.error('Error creating team member:', error);
      throw error;
    }
  },

  // Update a team member
  updateTeamMember: async (
    id: string, 
    updates: Partial<Omit<TeamMember, 'id' | 'createdAt' | 'adminUserId'>>
  ): Promise<void> => {
    try {
      const updateData: { [key: string]: string | boolean | TeamMemberPermissions | FieldValue | undefined } = {
        updatedAt: new Date().toISOString(),
      };

      if (updates.email !== undefined) updateData.email = updates.email.toLowerCase();
      if (updates.fullName !== undefined) updateData.fullName = updates.fullName;
      if (updates.mobileNo !== undefined) updateData.mobileNo = updates.mobileNo;
      if (updates.permissions !== undefined) updateData.permissions = updates.permissions;
      if (updates.isActive !== undefined) updateData.isActive = updates.isActive;
      
      // Hash new password if provided
      if (updates.password) {
        const salt = await bcrypt.genSalt(10);
        updateData.password = await bcrypt.hash(updates.password, salt);
      }

      await updateDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id), updateData);
      console.log('Team member updated successfully');

      // Local backup (don't backup password for security)
      const backupData = { ...updateData };
      if (backupData.password) backupData.password = '[HASHED]';
      await localBackupService.backup('teamMembers', {
        action: 'UPDATE',
        data: { id, ...backupData },
        userId: undefined,
        userName: undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error updating team member:', error);
      throw error;
    }
  },

  // Delete a team member
  deleteTeamMember: async (id: string): Promise<void> => {
    try {
      await deleteDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id));
      console.log('Team member deleted successfully');

      // Local backup
      await localBackupService.backup('teamMembers', {
        action: 'DELETE',
        data: { id, deletedAt: new Date().toISOString() },
        userId: undefined,
        userName: undefined,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      console.error('Error deleting team member:', error);
      throw error;
    }
  },

  // Authenticate a team member
  authenticateTeamMember: async (email: string, password: string): Promise<TeamMember | null> => {
    try {
      const q = query(
        collection(db, COLLECTIONS.TEAM_MEMBERS),
        where('email', '==', email.toLowerCase()),
        where('isActive', '==', true)
      );
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        console.log('No team member found with email:', email);
        return null;
      }

      const docSnap = querySnapshot.docs[0];
      const data = docSnap.data();
      
      // Verify password
      const isValidPassword = await bcrypt.compare(password, data.password);
      
      if (!isValidPassword) {
        console.log('Invalid password for team member:', email);
        return null;
      }

      // Update last login
      await updateDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, docSnap.id), {
        lastLogin: new Date().toISOString(),
      });

      return mapDocToTeamMember(docSnap.id, data);
    } catch (error) {
      console.error('Error authenticating team member:', error);
      throw error;
    }
  },

  // Update team member permissions
  updatePermissions: async (id: string, permissions: TeamMemberPermissions): Promise<void> => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id), {
        permissions,
        updatedAt: new Date().toISOString(),
      });
      console.log('Team member permissions updated successfully');
    } catch (error) {
      console.error('Error updating team member permissions:', error);
      throw error;
    }
  },

  // Get team member count for an admin
  getTeamMemberCount: async (adminUserId?: string): Promise<number> => {
    try {
      let q;
      if (adminUserId) {
        q = query(
          collection(db, COLLECTIONS.TEAM_MEMBERS),
          where('adminUserId', '==', adminUserId)
        );
      } else {
        q = query(collection(db, COLLECTIONS.TEAM_MEMBERS));
      }
      const querySnapshot = await getDocs(q);
      return querySnapshot.size;
    } catch (error) {
      console.error('Error getting team member count:', error);
      return 0;
    }
  },

  // Generate a random password
  generatePassword: (length: number = 12): string => {
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
    let password = '';
    for (let i = 0; i < length; i++) {
      password += charset.charAt(Math.floor(Math.random() * charset.length));
    }
    return password;
  },

  // Toggle team member active status
  toggleTeamMemberStatus: async (id: string, isActive: boolean): Promise<void> => {
    try {
      await updateDoc(doc(db, COLLECTIONS.TEAM_MEMBERS, id), {
        isActive,
        updatedAt: new Date().toISOString(),
      });
      console.log('Team member status toggled successfully');
    } catch (error) {
      console.error('Error toggling team member status:', error);
      throw error;
    }
  },
};
