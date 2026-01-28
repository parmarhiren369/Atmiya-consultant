import { useState } from 'react';
import { X, Calendar, User, AlertTriangle, CheckCircle, Clock, Edit, Trash2 } from 'lucide-react';
import { Task, SubAdmin } from '../types';
import { format, differenceInDays, isPast } from 'date-fns';
import toast from 'react-hot-toast';

interface TaskDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  subAdmins: SubAdmin[];
  userRole: 'master_admin' | 'sub_admin';
  onUpdateTaskStatus: (taskId: string, status: Task['status']) => void;
  onDeleteTask?: (taskId: string) => void;
}

export function TaskDetailsModal({ 
  isOpen, 
  onClose, 
  task, 
  subAdmins, 
  userRole,
  onUpdateTaskStatus,
  onDeleteTask
}: TaskDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  if (!isOpen || !task) return null;

  const assignedSubAdmin = subAdmins.find(admin => admin.id === task.assignedTo);
  const isOverdue = task.status !== 'completed' && isPast(task.dueDate);
  const daysUntilDue = differenceInDays(task.dueDate, new Date());

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/20';
      case 'in_progress': return 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20';
      case 'pending': return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
      case 'overdue': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  const getDepartmentColor = (department: string) => {
    switch (department) {
      case 'sales': return 'text-blue-600 bg-blue-100 dark:text-blue-300 dark:bg-blue-900/20';
      case 'pr': return 'text-purple-600 bg-purple-100 dark:text-purple-300 dark:bg-purple-900/20';
      case 'marketing': return 'text-pink-600 bg-pink-100 dark:text-pink-300 dark:bg-pink-900/20';
      case 'operations': return 'text-indigo-600 bg-indigo-100 dark:text-indigo-300 dark:bg-indigo-900/20';
      case 'finance': return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  const handleStatusUpdate = async (newStatus: Task['status']) => {
    setIsUpdating(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 500));
      
      onUpdateTaskStatus(task.id, newStatus);
      
      const statusLabels: { [key: string]: string } = {
        pending: 'Pending',
        in_progress: 'In Progress',
        completed: 'Completed'
      };
      
      toast.success(`Task status updated to ${statusLabels[newStatus]}`);
    } catch {
      toast.error('Failed to update task status');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteTask = async () => {
    if (!task || !onDeleteTask) return;
    
    try {
      await onDeleteTask(task.id);
      toast.success('Task deleted successfully');
      onClose();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    } finally {
      setShowDeleteConfirm(false);
    }
  };

  const getStatusActions = () => {
    const actions = [];
    
    if (task.status !== 'pending') {
      actions.push(
        <button
          key="pending"
          onClick={() => handleStatusUpdate('pending')}
          disabled={isUpdating}
          className="px-3 py-1 text-sm bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors duration-200"
        >
          Mark as Pending
        </button>
      );
    }
    
    if (task.status !== 'in_progress') {
      actions.push(
        <button
          key="in_progress"
          onClick={() => handleStatusUpdate('in_progress')}
          disabled={isUpdating}
          className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800/40 disabled:opacity-50 transition-colors duration-200"
        >
          Mark as In Progress
        </button>
      );
    }
    
    if (task.status !== 'completed') {
      actions.push(
        <button
          key="completed"
          onClick={() => handleStatusUpdate('completed')}
          disabled={isUpdating}
          className="px-3 py-1 text-sm bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800/40 disabled:opacity-50 transition-colors duration-200"
        >
          Mark as Completed
        </button>
      );
    }
    
    return actions;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Edit className="h-5 w-5 mr-2 text-blue-500" />
            Task Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <div className="px-6 py-4 space-y-6">
          {/* Task Header */}
          <div>
            <h3 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">
              {task.title}
            </h3>
            
            <div className="flex flex-wrap items-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getPriorityColor(task.priority)}`}>
                {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)} Priority
              </span>
              
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(isOverdue ? 'overdue' : task.status)}`}>
                {isOverdue ? 'Overdue' : task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
              </span>
              
              {task.department && (
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${getDepartmentColor(task.department)}`}>
                  {task.department.charAt(0).toUpperCase() + task.department.slice(1)} Department
                </span>
              )}
            </div>
          </div>

          {/* Task Description */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Description</h4>
            <p className="text-gray-700 dark:text-gray-300 leading-relaxed">
              {task.description}
            </p>
          </div>

          {/* Task Details Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Assigned To
                </label>
                <div className="flex items-center">
                  <User className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {assignedSubAdmin?.displayName || 'Unknown'}
                  </span>
                </div>
                {assignedSubAdmin && (
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                    {assignedSubAdmin.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Due Date
                </label>
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-gray-900 dark:text-white font-medium">
                    {format(task.dueDate, 'EEEE, MMMM dd, yyyy')}
                  </span>
                </div>
                {isOverdue ? (
                  <p className="text-sm text-red-600 dark:text-red-400 ml-6 flex items-center">
                    <AlertTriangle className="h-3 w-3 mr-1" />
                    {Math.abs(daysUntilDue)} days overdue
                  </p>
                ) : daysUntilDue <= 3 && task.status !== 'completed' ? (
                  <p className="text-sm text-orange-600 dark:text-orange-400 ml-6 flex items-center">
                    <Clock className="h-3 w-3 mr-1" />
                    Due in {daysUntilDue} {daysUntilDue === 1 ? 'day' : 'days'}
                  </p>
                ) : (
                  <p className="text-sm text-gray-500 dark:text-gray-400 ml-6">
                    {daysUntilDue} days remaining
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Created
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {format(task.createdAt, 'MMM dd, yyyy at HH:mm')}
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                  Last Updated
                </label>
                <p className="text-gray-900 dark:text-white font-medium">
                  {format(task.updatedAt, 'MMM dd, yyyy at HH:mm')}
                </p>
              </div>

              {task.completedAt && (
                <div>
                  <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">
                    Completed
                  </label>
                  <div className="flex items-center">
                    <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                    <span className="text-gray-900 dark:text-white font-medium">
                      {format(task.completedAt, 'MMM dd, yyyy at HH:mm')}
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Update Actions - Only for Sub Admins */}
          {userRole === 'sub_admin' && task.status !== 'completed' && (
            <div>
              <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                Update Status
              </h4>
              <div className="flex flex-wrap gap-2">
                {getStatusActions()}
              </div>
              {isUpdating && (
                <p className="text-sm text-blue-600 dark:text-blue-400 mt-2">
                  Updating task status...
                </p>
              )}
            </div>
          )}

          {/* Progress Indicator */}
          <div>
            <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
              Progress
            </h4>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  task.status === 'completed' ? 'bg-green-500' :
                  task.status === 'in_progress' ? 'bg-blue-500' :
                  'bg-gray-400'
                }`}
                style={{ 
                  width: task.status === 'completed' ? '100%' :
                         task.status === 'in_progress' ? '60%' :
                         task.status === 'pending' ? '10%' : '0%'
                }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
              <span>Pending</span>
              <span>In Progress</span>
              <span>Completed</span>
            </div>
          </div>
        </div>
        
        <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex justify-between">
          <div>
            {/* Delete Task Button - Only for Master Admin */}
            {userRole === 'master_admin' && onDeleteTask && (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200 flex items-center gap-2"
              >
                <Trash2 className="h-4 w-4" />
                Delete Task
              </button>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
          >
            Close
          </button>
        </div>

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full mx-4 shadow-2xl">
              <div className="p-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0 bg-red-50 dark:bg-red-900/20 rounded-full p-2 border border-red-200 dark:border-red-800">
                    <AlertTriangle className="h-6 w-6 text-red-600 dark:text-red-400" />
                  </div>
                  <div className="ml-4 flex-1">
                    <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                      Delete Task
                    </h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                      Are you sure you want to delete this task? This action cannot be undone and will permanently remove the task from the system.
                    </p>
                  </div>
                </div>
                
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-4 py-2 bg-gray-100 dark:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteTask}
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors duration-200"
                  >
                    Delete Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
