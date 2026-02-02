import { initializeApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getStorage, FirebaseStorage } from 'firebase/storage';

// Firebase Configuration - Set these in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
};

// Validate Firebase configuration
const isConfigValid = firebaseConfig.apiKey && firebaseConfig.projectId;

if (!isConfigValid) {
  console.warn('⚠️ Firebase credentials not configured. Please set the following in your .env file:');
  console.warn('   VITE_FIREBASE_API_KEY');
  console.warn('   VITE_FIREBASE_AUTH_DOMAIN');
  console.warn('   VITE_FIREBASE_PROJECT_ID');
  console.warn('   VITE_FIREBASE_STORAGE_BUCKET');
  console.warn('   VITE_FIREBASE_MESSAGING_SENDER_ID');
  console.warn('   VITE_FIREBASE_APP_ID');
}

// Initialize Firebase
let app: FirebaseApp;
let auth: Auth;
let db: Firestore;
let storage: FirebaseStorage;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  console.error('Failed to initialize Firebase:', error);
  // Create placeholder instances to prevent app crash
  app = {} as FirebaseApp;
  auth = {} as Auth;
  db = {} as Firestore;
  storage = {} as FirebaseStorage;
}

// Firestore collection names
export const COLLECTIONS = {
  USERS: 'users',
  POLICIES: 'policies',
  DELETED_POLICIES: 'deletedPolicies',
  LAPSED_POLICIES: 'lapsedPolicies',
  LEADS: 'leads',
  TASKS: 'tasks',
  TEAM_MEMBERS: 'teamMembers',
  TEAM_MEMBER_PERMISSIONS: 'teamMemberPermissions',
  ACTIVITY_LOGS: 'activityLogs',
  GROUP_HEADS: 'groupHeads',
  POLICY_DELETION_REQUESTS: 'policyDeletionRequests',
  FOLLOW_UP_HISTORY: 'followUpHistory',
};

export { app, auth, db, storage };
export default app;

