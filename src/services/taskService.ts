import { supabase } from '../config/supabase';
import { Task } from '../types';

// Create a new task
const createTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
  try {
    const taskWithTimestamps = {
      title: taskData.title,
      description: taskData.description,
      assigned_to: taskData.assignedTo,
      assigned_by: taskData.assignedBy,
      assigned_to_name: taskData.assignedToName,
      assigned_by_name: taskData.assignedByName,
      due_date: new Date(taskData.dueDate).toISOString(),
      status: taskData.status,
      priority: taskData.priority,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      completed_at: taskData.completedAt ? new Date(taskData.completedAt).toISOString() : null,
    };

    const { data, error } = await supabase
      .from('tasks')
      .insert([taskWithTimestamps])
      .select()
      .single();

    if (error) throw error;
    
    console.log('Task created with ID:', data.id);
    return data.id;
  } catch (error) {
    console.error('Error creating task:', error);
    throw error;
  }
};

// Get all tasks
const getAllTasks = async (): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedBy: item.assigned_by,
      assignedToName: item.assigned_to_name,
      assignedByName: item.assigned_by_name,
      dueDate: new Date(item.due_date),
      status: item.status,
      priority: item.priority,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      completedAt: item.completed_at ? new Date(item.completed_at) : null,
    }));
  } catch (error) {
    console.error('Error fetching tasks:', error);
    throw error;
  }
};

// Get tasks assigned to a specific user
const getTasksByAssignedUser = async (userId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_to', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedBy: item.assigned_by,
      assignedToName: item.assigned_to_name,
      assignedByName: item.assigned_by_name,
      dueDate: new Date(item.due_date),
      status: item.status,
      priority: item.priority,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      completedAt: item.completed_at ? new Date(item.completed_at) : null,
    }));
  } catch (error) {
    console.error('Error fetching tasks for user:', error);
    throw error;
  }
};

// Get tasks created by a specific user (admin)
const getTasksByCreator = async (creatorId: string): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('assigned_by', creatorId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedBy: item.assigned_by,
      assignedToName: item.assigned_to_name,
      assignedByName: item.assigned_by_name,
      dueDate: new Date(item.due_date),
      status: item.status,
      priority: item.priority,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      completedAt: item.completed_at ? new Date(item.completed_at) : null,
    }));
  } catch (error) {
    console.error('Error fetching tasks by creator:', error);
    throw error;
  }
};

// Update task status
const updateTaskStatus = async (taskId: string, status: Task['status']): Promise<void> => {
  try {
    const updateData: any = {
      status,
      updated_at: new Date().toISOString(),
    };

    if (status === 'completed') {
      updateData.completed_at = new Date().toISOString();
    }

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) throw error;

    console.log('Task status updated successfully');
  } catch (error) {
    console.error('Error updating task status:', error);
    throw error;
  }
};

// Update task details
const updateTask = async (taskId: string, updates: Partial<Omit<Task, 'id' | 'createdAt'>>): Promise<void> => {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.title !== undefined) updateData.title = updates.title;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.assignedTo !== undefined) updateData.assigned_to = updates.assignedTo;
    if (updates.assignedBy !== undefined) updateData.assigned_by = updates.assignedBy;
    if (updates.assignedToName !== undefined) updateData.assigned_to_name = updates.assignedToName;
    if (updates.assignedByName !== undefined) updateData.assigned_by_name = updates.assignedByName;
    if (updates.dueDate !== undefined) updateData.due_date = new Date(updates.dueDate).toISOString();
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.priority !== undefined) updateData.priority = updates.priority;
    if (updates.completedAt !== undefined) updateData.completed_at = updates.completedAt ? new Date(updates.completedAt).toISOString() : null;

    const { error } = await supabase
      .from('tasks')
      .update(updateData)
      .eq('id', taskId);

    if (error) throw error;

    console.log('Task updated successfully');
  } catch (error) {
    console.error('Error updating task:', error);
    throw error;
  }
};

// Delete a task
const deleteTask = async (taskId: string): Promise<void> => {
  try {
    const { error } = await supabase
      .from('tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;

    console.log('Task deleted successfully');
  } catch (error) {
    console.error('Error deleting task:', error);
    throw error;
  }
};

// Get a single task by ID
const getTaskById = async (taskId: string): Promise<Task | null> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('id', taskId)
      .maybeSingle();

    if (error) throw error;
    
    if (!data) return null;

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      assignedTo: data.assigned_to,
      assignedBy: data.assigned_by,
      assignedToName: data.assigned_to_name,
      assignedByName: data.assigned_by_name,
      dueDate: new Date(data.due_date),
      status: data.status,
      priority: data.priority,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at),
      completedAt: data.completed_at ? new Date(data.completed_at) : null,
    };
  } catch (error) {
    console.error('Error fetching task by ID:', error);
    throw error;
  }
};

// Get tasks by status
const getTasksByStatus = async (status: Task['status']): Promise<Task[]> => {
  try {
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .eq('status', status)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedBy: item.assigned_by,
      assignedToName: item.assigned_to_name,
      assignedByName: item.assigned_by_name,
      dueDate: new Date(item.due_date),
      status: item.status,
      priority: item.priority,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      completedAt: item.completed_at ? new Date(item.completed_at) : null,
    }));
  } catch (error) {
    console.error('Error fetching tasks by status:', error);
    throw error;
  }
};

// Get overdue tasks
const getOverdueTasks = async (): Promise<Task[]> => {
  try {
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('tasks')
      .select('*')
      .lt('due_date', now)
      .neq('status', 'completed')
      .order('due_date', { ascending: true });

    if (error) throw error;

    return data.map(item => ({
      id: item.id,
      title: item.title,
      description: item.description,
      assignedTo: item.assigned_to,
      assignedBy: item.assigned_by,
      assignedToName: item.assigned_to_name,
      assignedByName: item.assigned_by_name,
      dueDate: new Date(item.due_date),
      status: item.status,
      priority: item.priority,
      createdAt: new Date(item.created_at),
      updatedAt: new Date(item.updated_at),
      completedAt: item.completed_at ? new Date(item.completed_at) : null,
    }));
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
