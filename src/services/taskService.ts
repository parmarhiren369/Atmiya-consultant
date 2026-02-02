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
  orderBy,
  Timestamp,
  FieldValue
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { Task } from '../types';
import { localBackupService } from './localBackupService';

// Helper to convert Firestore Timestamp to Date
const toDate = (timestamp: Timestamp | string | undefined): Date | undefined => {
  if (!timestamp) return undefined;
  if (timestamp instanceof Timestamp) return timestamp.toDate();
  return new Date(timestamp);
};

// Helper to map Firestore data to Task type
const mapDocToTask = (id: string, data: Record<string, unknown>): Task => ({
  id,
  title: data.title as string,
  description: data.description as string,
  assignedTo: data.assignedTo as string,
  assignedBy: data.assignedBy as string,
  assignedToName: data.assignedToName as string,
  assignedByName: data.assignedByName as string,
  dueDate: toDate(data.dueDate as Timestamp | string) || new Date(),
  status: data.status as Task['status'],
  priority: data.priority as Task['priority'],
  createdAt: toDate(data.createdAt as Timestamp | string) || new Date(),
  updatedAt: toDate(data.updatedAt as Timestamp | string) || new Date(),
  completedAt: data.completedAt ? toDate(data.completedAt as Timestamp | string) || null : null,
});

// Create a new task - saves to local backup FIRST
const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  const now = new Date().toISOString();
  const tempId = `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  const taskWithTimestamps = {
    title: taskData.title,
    description: taskData.description,
    assignedTo: taskData.assignedTo,
    assignedBy: taskData.assignedBy,
    assignedToName: taskData.assignedToName,
    assignedByName: taskData.assignedByName,
    dueDate: new Date(taskData.dueDate).toISOString(),
    status: taskData.status,
    priority: taskData.priority,
    createdAt: now,
    updatedAt: now,
    completedAt: taskData.completedAt ? new Date(taskData.completedAt).toISOString() : null,
  };

  // Local backup FIRST
  const localBackupPromise = localBackupService.backup('tasks', {
    action: 'CREATE',
    data: { id: tempId, ...taskWithTimestamps, _tempId: true },
    userId: taskData.assignedBy,
    userName: taskData.assignedByName,
    timestamp: now,
  });

  try {
    const docRef = await addDoc(collection(db, COLLECTIONS.TASKS), taskWithTimestamps);
    console.log('Task created with ID:', docRef.id);

    // Update local backup with real Firebase ID
    await localBackupService.backup('tasks', {
      action: 'UPDATE',
      data: { id: docRef.id, ...taskWithTimestamps, _tempId: tempId },
      userId: taskData.assignedBy,
      userName: taskData.assignedByName,
      timestamp: now,
    });

    return docRef.id;
  } catch (firebaseError) {
    await localBackupPromise;
    console.error('Firebase save failed, task saved to local backup with temp ID:', tempId);
    throw new Error('Failed to create task in Firebase (saved locally)');
  }
};

// Get all tasks - with fallback to local backup
const getAllTasks = async (): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    const tasks = querySnapshot.docs.map(docSnap => 
      mapDocToTask(docSnap.id, docSnap.data())
    );

    // Sync to local backup
    if (tasks.length > 0) {
      localBackupService.syncAll('tasks', tasks).catch(() => {});
    }

    return tasks;
  } catch (error) {
    console.error('Error fetching tasks from Firebase:', error);
    
    // Fallback to local backup
    const localTasks = await localBackupService.getAll<Task>('tasks');
    if (localTasks && localTasks.length > 0) {
      console.log(`📥 Loaded ${localTasks.length} tasks from local backup`);
      return localTasks.map(t => ({
        ...t,
        dueDate: t.dueDate ? new Date(t.dueDate) : new Date(),
        createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        updatedAt: t.updatedAt ? new Date(t.updatedAt) : new Date(),
        completedAt: t.completedAt ? new Date(t.completedAt) : null,
      }));
    }
    
    throw new Error('Failed to fetch tasks from both Firebase and local backup');
  }
};

// Get tasks assigned to a specific user
const getTasksByAssignedUser = async (userId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('assignedTo', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => 
      mapDocToTask(docSnap.id, docSnap.data())
    );
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    throw error;
  }
};

// Get tasks created by a specific user (admin)
const getTasksByCreator = async (creatorId: string): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('assignedBy', '==', creatorId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => 
      mapDocToTask(docSnap.id, docSnap.data())
    );
  } catch (error) {
    console.error('Error fetching tasks by creator:', error);
    throw error;
  }
};

// Update task status - saves to local backup FIRST
const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<void> => {
  const now = new Date().toISOString();
  const updateData: { [key: string]: string | null | FieldValue | undefined } = {
    status,
    updatedAt: now,
  };

  if (status === 'completed') {
    updateData.completedAt = now;
  }

  // Local backup FIRST
  const localBackupPromise = localBackupService.backup('tasks', {
    action: 'UPDATE',
    data: { id: taskId, ...updateData },
    userId: undefined,
    userName: undefined,
    timestamp: now,
  });

  try {
    await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), updateData);
    console.log('Task status updated successfully');
    await localBackupPromise;
  } catch (firebaseError) {
    await localBackupPromise;
    console.error('Firebase update failed, task status update saved to local backup');
    throw new Error('Failed to update task status in Firebase (saved locally)');
  }
};

// Update task details - saves to local backup FIRST
const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
  const now = new Date().toISOString();
  const updateData: { [key: string]: string | null | FieldValue | undefined } = {
    updatedAt: now,
  };

  if (updates.title !== undefined) updateData.title = updates.title;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.assignedTo !== undefined) updateData.assignedTo = updates.assignedTo;
  if (updates.assignedBy !== undefined) updateData.assignedBy = updates.assignedBy;
  if (updates.assignedToName !== undefined) updateData.assignedToName = updates.assignedToName;
  if (updates.assignedByName !== undefined) updateData.assignedByName = updates.assignedByName;
  if (updates.dueDate !== undefined) updateData.dueDate = new Date(updates.dueDate).toISOString();
  if (updates.status !== undefined) updateData.status = updates.status;
  if (updates.priority !== undefined) updateData.priority = updates.priority;
  if (updates.completedAt !== undefined) updateData.completedAt = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;

  // Local backup FIRST
  const localBackupPromise = localBackupService.backup('tasks', {
    action: 'UPDATE',
    data: { id: taskId, ...updateData },
    userId: undefined,
    userName: undefined,
    timestamp: now,
  });

  try {
    await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), updateData);
    console.log('Task updated successfully');
    await localBackupPromise;
  } catch (firebaseError) {
    await localBackupPromise;
    console.error('Firebase update failed, task update saved to local backup');
    throw new Error('Failed to update task in Firebase (saved locally)');
  }
};

// Delete a task - saves to local backup FIRST
const deleteTask = async (taskId: string): Promise<void> => {
  const now = new Date().toISOString();
  
  // Local backup FIRST
  const localBackupPromise = localBackupService.backup('tasks', {
    action: 'DELETE',
    data: { id: taskId, deletedAt: now },
    userId: undefined,
    userName: undefined,
    timestamp: now,
  });

  try {
    await deleteDoc(doc(db, COLLECTIONS.TASKS, taskId));
    console.log('Task deleted successfully');
    await localBackupPromise;
  } catch (firebaseError) {
    await localBackupPromise;
    console.error('Firebase delete failed, task deletion saved to local backup');
    throw new Error('Failed to delete task from Firebase (saved locally)');
  }
};

// Get a single task by ID
const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const docSnap = await getDoc(doc(db, COLLECTIONS.TASKS, taskId));
    
    if (!docSnap.exists()) return null;

    return mapDocToTask(docSnap.id, docSnap.data());
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    throw error;
  }
};

// Get tasks by status
const getTasksByStatus = async (status: Task['status']): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('status', '==', status),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => 
      mapDocToTask(docSnap.id, docSnap.data())
    );
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    throw error;
  }
};

// Get overdue tasks
const getOverdueTasks = async (): Promise<Task[]> => {
  try {
    const now = new Date().toISOString();
    // Note: Firestore doesn't support multiple inequality filters on different fields
    // We'll filter completed tasks in memory
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      where('dueDate', '<', now),
      orderBy('dueDate', 'asc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map(docSnap => mapDocToTask(docSnap.id, docSnap.data()))
      .filter(task => task.status !== 'completed');
  } catch (error) {
    console.error('Error fetching overdue tasks:', error);
    throw error;
  }
};

export const taskService = {
  createTask,
  getAllTasks,
  getTasksByAssignedUser,
  getTasksByCreator,
  updateTaskStatus,
  updateTask,
  deleteTask,
  getTaskById,
  getTasksByStatus,
  getOverdueTasks,
};
