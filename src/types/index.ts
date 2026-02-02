export interface Policy {
  id: string;
  userId?: string; // Owner of the policy
  policyholderName: string;
  contactNo?: string;
  emailId?: string;
  address?: string;
  policyNumber: string;
  insuranceCompany: string;
  policyType: string; // Flexible policy type to allow custom values
  premiumAmount?: number;
  coverageAmount?: number;
  policyStartDate?: Date | string;
  policyEndDate?: Date | string;
  premiumDueDate?: Date | string;
  status?: string;
  paymentFrequency?: string;
  nomineeName?: string;
  nomineeRelationship?: string;
  notes?: string;
  documents?: unknown[];
  createdAt: Date;
  updatedAt: Date;
  memberOf?: string; // Group head ID
  member_of?: string; // Database column name
  // Legacy fields for backward compatibility
  startDate?: string;
  expiryDate?: string;
  pdfFileName?: string;
  fileId?: string;
  driveFileId?: string;
  driveFileUrl?: string;
  documentsFolderLink?: string;
  businessType?: string;
  // Vehicle insurance specific fields
  registrationNo?: string;
  engineNo?: string;
  chasisNo?: string;
  hp?: string;
  riskLocationAddress?: string;
  idv?: string;
  netPremium?: string;
  odPremium?: string; // OD Premium for Two wheeler/Four wheeler
  thirdPartyPremium?: string; // Third Party Premium for Two wheeler/Four wheeler
  gst?: string;
  totalPremium?: string;
  commissionPercentage?: string;
  commissionAmount?: string;
  remark?: string;
  productType?: string;
  referenceFromName?: string;
  isOneTimePolicy?: boolean;
  ncbPercentage?: string;
  isRenewed?: boolean;
  lastClaimDate?: string;
  lastClaimAmount?: string;
  hasClaimLastYear?: boolean;
  // Settlement/Claim fields
  claimStatus?: 'none' | 'in-progress' | 'settled';
  hasClaimSettled?: boolean;
  settledAmount?: string;
  settlementDate?: string;
}

export interface PolicyFormData {
  policyholderName: string;
  policyType: Policy['policyType'];
  insuranceCompany: string;
  policyNumber: string;
  startDate: string;
  expiryDate: string;
  premiumAmount: string;
  pdfFile?: File;
  pdfFileName?: string;
  fileId?: string;
  driveFileUrl?: string;
  pdfLink?: string; // PDF link from Google Drive
  documentsFolderLink?: string; // Google Drive folder link for client documents
  businessType?: string; // Business type - can be 'New', 'Renewal', 'Rollover' or custom value
  memberOf?: string; // Member of dropdown
  // Vehicle insurance specific fields
  contactNo?: string;
  emailId?: string;
  registrationNo?: string;
  engineNo?: string;
  chasisNo?: string;
  hp?: string;
  riskLocationAddress?: string;
  idv?: string;
  netPremium?: string;
  odPremium?: string; // OD Premium for Two wheeler/Four wheeler
  thirdPartyPremium?: string; // Third Party Premium for Two wheeler/Four wheeler
  gst?: string;
  totalPremium?: string;
  commissionPercentage?: string;
  commissionAmount?: string;
  remark?: string;
  referenceFromName?: string;
  isOneTimePolicy?: boolean;
  ncbPercentage?: string;
}

export interface AIExtractedData {
  policyholderName: string;
  policyNumber: string;
  insuranceCompany: string;
  startDate: string;
  expiryDate: string;
  premiumAmount: string;
  productType: string;
}

export interface ActivityLog {
  id: string;
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'RESTORE' | 'PERMANENT_DELETE';
  entityType: 'POLICY';
  entityId: string;
  entityName: string; // Policy holder name for easy identification
  description: string;
  oldData?: Partial<Policy>;
  newData?: Partial<Policy>;
  timestamp: Date;
  userId?: string; // For user management
  userDisplayName?: string; // Display name of the user who performed the action
}

export interface LapsedPolicy extends Policy {
  lapsedAt: Date;
  lapsedReason?: string;
}

export interface DeletedPolicy extends Policy {
  deletedAt: Date;
  deletedBy?: string; // For future user management
}

// Task Management Types
export interface Task {
  id: string;
  title: string;
  description: string;
  department?: 'sales' | 'pr' | 'marketing' | 'operations' | 'finance'; // Optional for backward compatibility
  assignedTo: string; // User ID (can be admin or user)
  assignedToName?: string; // Display name of assignee
  assignedBy: string; // Admin ID who assigned the task
  assignedByName?: string; // Display name of assigner
  assigned_to_team_member_id?: string; // Team member ID if assigned to team member
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: Date;
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date | null;
}

export interface SubAdmin {
  id: string;
  userId: string;
  displayName: string;
  email: string;
  department: 'sales' | 'pr' | 'marketing' | 'operations' | 'finance';
  isActive: boolean;
  createdAt: Date;
  createdBy: string; // Master admin ID
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: 'master_admin' | 'sub_admin';
  receiverId: string;
  message: string;
  imageUrl?: string;
  timestamp: Date;
  isRead: boolean;
}

export interface ChatRoom {
  id: string;
  masterAdminId: string;
  subAdminId: string;
  subAdminName: string;
  department: string;
  lastMessage?: ChatMessage;
  unreadCount: number;
  updatedAt: Date;
}

export interface Notification {
  id: string;
  type: 'task_assigned' | 'task_completed' | 'chat_message' | 'task_overdue';
  title: string;
  message: string;
  userId: string;
  isRead: boolean;
  createdAt: Date;
  relatedId?: string; // Task ID or Chat ID
}

export interface AppUser {
  id: string; // Firebase auth ID
  userId?: string; // Legacy field for backward compatibility
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  isActive: boolean;
  createdAt: Date;
  lastLogin?: Date;
  // Admin control fields
  isLocked: boolean;
  lockedReason?: string;
  lockedBy?: string; // Admin ID who locked
  lockedAt?: Date;
}

export interface FirebaseUserData {
  id: string;
  email: string;
  displayName?: string;
  display_name?: string;
  role: string;
  isActive?: boolean;
  is_active?: boolean;
  createdAt?: string;
  created_at?: string;
  lastLogin?: string;
  last_login?: string;
  isLocked?: boolean;
  is_locked?: boolean;
  lockedReason?: string;
  locked_reason?: string;
  lockedBy?: string;
  locked_by?: string;
  lockedAt?: string;
  locked_at?: string;
}

// Alias for backward compatibility
export type SupabaseUserData = FirebaseUserData;

export interface SignupCredentials {
  email: string;
  password: string;
  displayName: string;
  isAdmin?: boolean; // For initial admin signup
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface PolicyDeletionRequest {
  id: string;
  policyId: string;
  policyholderName: string;
  policyNumber: string;
  requestedBy: string; // User ID who requested the deletion
  requestedByName: string; // Display name of the user
  requestDate: Date;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string; // Admin ID who reviewed the request
  reviewedByName?: string; // Admin display name
  reviewDate?: Date;
  reviewComments?: string;
  requestReason?: string; // Why the user wants to delete permanently
}

// Lead Management Types
// Follow-up history tracking
export interface FollowUpHistory {
  id: string;
  leadId: string;
  followUpDate: Date | string;
  actualFollowUpDate: Date | string; // When the follow-up actually happened
  status: 'completed' | 'missed' | 'rescheduled';
  notes: string;
  nextFollowUpDate?: Date | string;
  createdBy: string;
  createdByName: string;
  createdAt: Date;
}

export interface Lead {
  id: string;
  userId: string; // Owner of the lead
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  productType: string; // TW (Two Wheeler), FW (Four Wheeler), Health, Life, etc.
  followUpDate: Date | string;
  status: 'new' | 'contacted' | 'qualified' | 'proposal_sent' | 'follow_up' | 'negotiation' | 'won' | 'lost' | 'canceled';
  leadSource: string; // Website, Referral, Social Media, Cold Call, etc.
  remark?: string;
  nextFollowUpDate?: Date | string;
  createdAt: Date;
  updatedAt: Date;
  // Additional fields for lead tracking
  assignedTo?: string; // For sub-admins or team members
  assignedToName?: string;
  assigned_to_team_member_id?: string; // Team member ID if assigned to team member
  priority?: 'low' | 'medium' | 'high';
  estimatedValue?: number;
  convertedToPolicyId?: string; // If lead is converted to policy
  isConverted?: boolean;
  followUpHistory?: FollowUpHistory[]; // Track all follow-ups
}

export interface LeadFormData {
  customerName: string;
  customerMobile: string;
  customerEmail: string;
  productType: string;
  followUpDate: string;
  status: Lead['status'];
  leadSource: string;
  remark?: string;
  nextFollowUpDate?: string;
  priority?: 'low' | 'medium' | 'high';
  estimatedValue?: number;
}

// Team Member Management Types
export interface TeamMember {
  id: string;
  adminUserId: string; // The admin who created this team member
  email: string;
  passwordHash: string;
  fullName: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  permissions?: TeamMemberPermissions;
}

export interface TeamMemberPermissions {
  id: string;
  teamMemberId: string;
  pageAccess: string[]; // Array of route paths the team member can access
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMemberFormData {
  fullName: string;
  email: string;
  password: string;
  pageAccess: string[];
}

export interface PagePermission {
  path: string;
  label: string;
  enabled: boolean;
}