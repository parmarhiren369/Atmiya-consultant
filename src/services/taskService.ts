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
  Timestamp
} from 'firebase/firestore';
import { db, COLLECTIONS } from '../config/firebase';
import { Task } from '../types';

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

// Create a new task
const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const now = new Date().toISOString();
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

    const docRef = await addDoc(collection(db, COLLECTIONS.TASKS), taskWithTimestamps);
    console.log('Task created with ID:', docRef.id);
    return docRef.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Get all tasks
const getAllTasks = async (): Promise<Task[]> => {
  try {
    const q = query(
      collection(db, COLLECTIONS.TASKS),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map(docSnap => 
      mapDocToTask(docSnap.id, docSnap.data())
    );
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
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

// Update task status
const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<void> => {
  try {
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completedAt = new Date().toISOString();
    }

    await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), updateData);
    console.log('Task status updated successfully');
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

// Update task details
const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const updateData: Record<string, unknown> = {
      updatedAt: new Date().toISOString(),
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

    await updateDoc(doc(db, COLLECTIONS.TASKS, taskId), updateData);
    console.log('Task updated successfully');
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// Delete a task
const deleteTask = async (taskId: string): Promise<void> => {
  try {
    await deleteDoc(doc(db, COLLECTIONS.TASKS, taskId));
    console.log('Task deleted successfully');
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
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
