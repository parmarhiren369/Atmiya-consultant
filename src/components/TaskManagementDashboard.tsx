import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Plus,
  Users,
  CheckCircle,
  Clock,
  AlertTriangle,
  Filter,
  Search,
  Calendar,
  User,
  Target,
  TrendingUp,
  Eye,
  UserPlus,
  Mail,
  Shield,
  Trash2,
  Edit
} from 'lucide-react';
import { Task, SubAdmin, AppUser, TeamMember } from '../types';
import { format, isPast, differenceInDays } from 'date-fns';
import { CreateTaskModal } from './CreateTaskModal';
import { TaskDetailsModal } from './TaskDetailsModal';
import { AddTeamMemberModal } from './AddTeamMemberModal';
import { EditTeamMemberModal } from './EditTeamMemberModal';
import { taskService } from '../services/taskService';
import { UserService } from '../services/userService';
import { teamMemberService } from '../services/teamMemberService';
import toast from 'react-hot-toast';

interface TaskManagementDashboardProps {
  userRole: 'master_admin' | 'sub_admin';
  currentUserId: string;
  currentUserDepartment?: string;
}

export function TaskManagementDashboard({ 
  userRole, 
  currentUserId, 
  currentUserDepartment 
}: TaskManagementDashboardProps) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [allUsers, setAllUsers] = useState<AppUser[]>([]);
  const [subAdmins] = useState<SubAdmin[]>([]);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedTeamMember, setSelectedTeamMember] = useState<TeamMember | null>(null);
  const [showCreateTask, setShowCreateTask] = useState(false);
  const [showAddTeamMember, setShowAddTeamMember] = useState(false);
  const [showEditTeamMember, setShowEditTeamMember] = useState(false);
  const [loading, setLoading] = useState(true);

  // Initialize user service
  const userService = useMemo(() => new UserService(), []);

  // Load data function
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      // Load all users for task assignment
      const users = await userService.getAllUsers();
      setAllUsers(users);

      // Load team members if master admin
      if (userRole === 'master_admin') {
        const members = await teamMemberService.getTeamMembers();
        setTeamMembers(members);
      }

      // Load tasks based on user role
      let userTasks: Task[] = [];
      if (userRole === 'master_admin') {
        // Master admin sees all tasks
        userTasks = await taskService.getAllTasks();
      } else {
        // Regular users see only tasks assigned to them
        userTasks = await taskService.getTasksByAssignedUser(currentUserId);
      }
      
      setTasks(userTasks);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  }, [currentUserId, userRole, userService]);

  // Load data on component mount
  useEffect(() => {
    loadData();
  }, [loadData]);

  // Handler functions


  const handleCreateTask = async (taskData: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await taskService.createTask(taskData);
      toast.success('Task created successfully');
      
      // Reload tasks to get the updated list
      await loadData();
      setShowCreateTask(false);
    } catch (error) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    }
  };

  const handleTeamMemberSuccess = async () => {
    toast.success('Team member created successfully');
    await loadData(); // Reload to get updated team members
  };

  const handleDeleteTeamMember = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete team member "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      await teamMemberService.deleteTeamMember(id);
      toast.success('Team member deleted successfully');
      await loadData();
    } catch (error) {
      console.error('Error deleting team member:', error);
      toast.error('Failed to delete team member');
    }
  };

  const handleToggleTeamMemberStatus = async (id: string, name: string, currentStatus: boolean) => {
    try {
      await teamMemberService.toggleTeamMemberStatus(id);
      toast.success(`Team member "${name}" ${currentStatus ? 'deactivated' : 'activated'} successfully`);
      await loadData();
    } catch (error) {
      console.error('Error toggling team member status:', error);
      toast.error('Failed to update team member status');
    }
  };

  const handleEditTeamMember = (member: TeamMember) => {
    setSelectedTeamMember(member);
    setShowEditTeamMember(true);
  };

  const handleTeamMemberEditSuccess = async () => {
    toast.success('Team member updated successfully');
    setShowEditTeamMember(false);
    setSelectedTeamMember(null);
    await loadData();
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<Task>) => {
    try {
      if (updates.status) {
        await taskService.updateTaskStatus(taskId, updates.status);
      } else {
        // For other updates, we would need a more general update function
        // For now, we'll just handle status updates
        console.log('Other updates not implemented yet:', updates);
      }
      
      toast.success('Task updated successfully');
      
      // Reload tasks to get the updated list
      await loadData();
    } catch (error) {
      console.error('Error updating task:', error);
      toast.error('Failed to update task');
    }
  };

  const handleDeleteTask = async (taskId: string) => {
    try {
      await taskService.deleteTask(taskId);
      toast.success('Task deleted successfully');
      
      // Reload tasks to get the updated list
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
      toast.error('Failed to delete task');
    }
  };
  
  const [filter, setFilter] = useState<'all' | 'pending' | 'in_progress' | 'completed' | 'overdue'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Filter tasks based on user role
  const filteredTasks = tasks.filter(task => {
    if (userRole === 'sub_admin') {
      return task.assignedTo === currentUserId;
    }
    
    // Apply filters
    const statusFilter = filter === 'all' || task.status === filter;
    const searchFilter = searchTerm === '' || 
      task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusFilter && searchFilter;
  });

  const getTaskStats = () => {
    const userTasks = userRole === 'master_admin' ? tasks : tasks.filter(t => t.assignedTo === currentUserId);
    return {
      total: userTasks.length,
      pending: userTasks.filter(t => t.status === 'pending').length,
      inProgress: userTasks.filter(t => t.status === 'in_progress').length,
      completed: userTasks.filter(t => t.status === 'completed').length,
      overdue: userTasks.filter(t => t.status !== 'completed' && isPast(t.dueDate)).length
    };
  };

  const stats = getTaskStats();

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-300">Loading tasks...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                {userRole === 'master_admin' ? 'Master Admin Dashboard' : 'My Tasks'}
              </h1>
              <p className="text-gray-600 dark:text-gray-300 mt-2">
                {userRole === 'master_admin' 
                  ? 'Manage sub-admins, assign tasks, and monitor progress'
                  : `Your assigned tasks ${currentUserDepartment ? `- ${currentUserDepartment.charAt(0).toUpperCase() + currentUserDepartment.slice(1)} Department` : ''}`
                }
              </p>
            </div>
            <div className="flex items-center space-x-4 mt-4 sm:mt-0">
              {/* Action Buttons for Master Admin */}
              {userRole === 'master_admin' && (
                <>
                  <button
                    onClick={() => setShowAddTeamMember(true)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-sharp flex items-center"
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Add Team Member
                  </button>
                  <button
                    onClick={() => setShowCreateTask(true)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-sharp flex items-center"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Assign Task
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-blue-600">
            <div className="flex items-center">
              <Target className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Tasks</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-gray-600">
            <div className="flex items-center">
              <Clock className="h-8 w-8 text-gray-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.pending}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-cyan-600">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">In Progress</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.inProgress}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-emerald-600">
            <div className="flex items-center">
              <CheckCircle className="h-8 w-8 text-green-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.completed}</p>
              </div>
            </div>
          </div>
          
          <div className="bg-white dark:bg-gray-800 p-6 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 border-l-4 border-l-red-600">
            <div className="flex items-center">
              <AlertTriangle className="h-8 w-8 text-red-500" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Overdue</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.overdue}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Team Members Section (Master Admin Only) */}
        {userRole === 'master_admin' && teamMembers.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center">
                <Users className="h-5 w-5 mr-2" />
                Team Members ({teamMembers.length}/3)
              </h2>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-gray-900 dark:text-white">
                            {member.fullName}
                          </h3>
                          {member.isActive ? (
                            <span className="text-xs bg-green-100 dark:bg-green-900/20 text-green-600 dark:text-green-400 px-2 py-1 rounded">
                              Active
                            </span>
                          ) : (
                            <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 px-2 py-1 rounded">
                              Inactive
                            </span>
                          )}
                        </div>
                        <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-2">
                          <Mail className="h-4 w-4 mr-1" />
                          {member.email}
                        </div>
                        {member.permissions && (
                          <div className="flex items-center text-sm text-gray-600 dark:text-gray-400 mt-1">
                            <Shield className="h-4 w-4 mr-1" />
                            {member.permissions.pageAccess.length} page(s) access
                          </div>
                        )}
                        <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
                          Added {format(member.createdAt, 'MMM dd, yyyy')}
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-2">
                        <button
                          onClick={() => handleEditTeamMember(member)}
                          className="p-1.5 text-gray-400 hover:text-green-600 dark:hover:text-green-400"
                          title="Edit"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleToggleTeamMemberStatus(member.id, member.fullName, member.isActive)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400"
                          title={member.isActive ? 'Deactivate' : 'Activate'}
                        >
                          <Shield className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTeamMember(member.id, member.fullName)}
                          className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 mb-8">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
              <div className="flex items-center space-x-4">
                <Filter className="h-5 w-5 text-gray-400" />
                <select
                  value={filter}
                  onChange={(e) => setFilter(e.target.value as 'all' | 'pending' | 'in_progress' | 'completed' | 'overdue')}
                  className="border border-gray-300 dark:border-gray-600 rounded-sharp px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                >
                  <option value="all">All Tasks</option>
                  <option value="pending">Pending</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="overdue">Overdue</option>
                </select>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
              {userRole === 'master_admin' ? 'All Tasks' : 'My Assigned Tasks'}
            </h2>
          </div>
          
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredTasks.length > 0 ? (
              filteredTasks.map(task => {
                const assignedSubAdmin = subAdmins.find(admin => admin.id === task.assignedTo);
                const isOverdue = task.status !== 'completed' && isPast(task.dueDate);
                const daysUntilDue = differenceInDays(task.dueDate, new Date());
                
                return (
                  <div 
                    key={task.id} 
                    className="p-6 hover:bg-gray-50 dark:hover:bg-gray-750 cursor-pointer transition-colors duration-200"
                    onClick={() => setSelectedTask(task)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                            {task.title}
                          </h3>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                            {task.priority.charAt(0).toUpperCase() + task.priority.slice(1)}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(isOverdue ? 'overdue' : task.status)}`}>
                            {isOverdue ? 'Overdue' : task.status.replace('_', ' ').charAt(0).toUpperCase() + task.status.slice(1).replace('_', ' ')}
                          </span>
                        </div>
                        
                        <p className="text-gray-600 dark:text-gray-300 mb-3">{task.description}</p>
                        
                        <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                          {task.department && (
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getDepartmentColor(task.department)}`}>
                              {task.department.charAt(0).toUpperCase() + task.department.slice(1)}
                            </span>
                          )}
                          
                          {userRole === 'master_admin' && assignedSubAdmin && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 mr-1" />
                              {assignedSubAdmin.displayName}
                            </div>
                          )}
                          
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-1" />
                            Due: {format(task.dueDate, 'MMM dd, yyyy')}
                            {isOverdue && (
                              <span className="text-red-500 ml-2">({Math.abs(daysUntilDue)} days overdue)</span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                        }}
                        className="ml-4 p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                      >
                        <Eye className="h-5 w-5" />
                      </button>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="p-12 text-center">
                <Target className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No tasks found</h3>
                <p className="mt-1 text-gray-500 dark:text-gray-400">
                  {userRole === 'master_admin' 
                    ? 'Start by creating and assigning tasks to sub-admins'
                    : 'No tasks have been assigned to you yet'
                  }
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      {showAddTeamMember && (
        <AddTeamMemberModal
          isOpen={showAddTeamMember}
          onClose={() => setShowAddTeamMember(false)}
          onSuccess={handleTeamMemberSuccess}
        />
      )}

      {showEditTeamMember && selectedTeamMember && (
        <EditTeamMemberModal
          isOpen={showEditTeamMember}
          onClose={() => {
            setShowEditTeamMember(false);
            setSelectedTeamMember(null);
          }}
          onSuccess={handleTeamMemberEditSuccess}
          teamMember={selectedTeamMember}
        />
      )}

      {showCreateTask && (
        <CreateTaskModal
          isOpen={showCreateTask}
          onClose={() => setShowCreateTask(false)}
          onCreateTask={handleCreateTask}
          allUsers={allUsers}
          teamMembers={teamMembers}
        />
      )}

      {selectedTask && (
        <TaskDetailsModal
          isOpen={!!selectedTask}
          onClose={() => setSelectedTask(null)}
          task={selectedTask}
          subAdmins={subAdmins}
          userRole={userRole}
          onUpdateTaskStatus={(taskId: string, status: Task['status']) => {
            handleTaskUpdate(taskId, { status });
          }}
          onDeleteTask={userRole === 'master_admin' ? handleDeleteTask : undefined}
        />
      )}
    </div>
  );
}
