import { useState } from 'react';
import { X, Plus, Calendar } from 'lucide-react';
import { Task, AppUser, TeamMember } from '../types';
import toast from 'react-hot-toast';

interface CreateTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateTask: (task: Omit<Task, 'id' | 'createdAt' | 'updatedAt'>) => void;
  allUsers: AppUser[];
  teamMembers?: TeamMember[];
}

export function CreateTaskModal({ isOpen, onClose, onCreateTask, allUsers, teamMembers = [] }: CreateTaskModalProps) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    assignedTo: '',
    assignedToType: 'user' as 'user' | 'team_member',
    priority: 'medium' as 'urgent' | 'high' | 'medium' | 'low',
    dueDate: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.assignedTo) {
      toast.error('Please select a user or team member to assign the task');
      return;
    }

    setLoading(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      let assignedUserName = '';
      if (formData.assignedToType === 'user') {
        const assignedUser = allUsers.find(user => user.id === formData.assignedTo);
        assignedUserName = assignedUser?.displayName || '';
      } else {
        const assignedTeamMember = teamMembers.find(member => member.id === formData.assignedTo);
        assignedUserName = assignedTeamMember?.fullName || '';
      }
      
      const newTask = {
        title: formData.title,
        description: formData.description,
        department: 'general' as 'sales' | 'pr' | 'marketing' | 'operations' | 'finance',
        assignedTo: formData.assignedToType === 'user' ? formData.assignedTo : '',
        assignedBy: 'admin',
        status: 'pending' as const,
        priority: formData.priority,
        dueDate: new Date(formData.dueDate),
        assigned_to_team_member_id: formData.assignedToType === 'team_member' ? formData.assignedTo : undefined
      };
      
      onCreateTask(newTask);
      
      toast.success(`Task assigned to ${assignedUserName} successfully!`);
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        assignedTo: '',
        assignedToType: 'user',
        priority: 'medium',
        dueDate: ''
      });
      
      onClose();
    } catch (error: unknown) {
      console.error('Error creating task:', error);
      toast.error('Failed to create task');
    } finally {
      setLoading(false);
    }
  };

  // Show all active users

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'text-red-600 bg-red-100 dark:text-red-300 dark:bg-red-900/20';
      case 'high': return 'text-orange-600 bg-orange-100 dark:text-orange-300 dark:bg-orange-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-300 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:text-green-300 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:text-gray-300 dark:bg-gray-700';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <Plus className="h-5 w-5 mr-2 text-blue-500" />
            Assign New Task
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="px-6 py-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Task Title *
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Enter task title"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Description *
            </label>
            <textarea
              required
              rows={3}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Describe the task in detail"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assign To *
            </label>
            <select
              required
              value={formData.assignedTo}
              onChange={(e) => {
                const value = e.target.value;
                const isTeamMember = value.startsWith('team_');
                setFormData({
                  ...formData,
                  assignedTo: isTeamMember ? value.replace('team_', '') : value,
                  assignedToType: isTeamMember ? 'team_member' : 'user'
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Select a user or team member</option>
              <optgroup label="Users">
                {allUsers.map((user: AppUser) => (
                  <option key={user.id} value={user.id}>
                    {user.displayName} ({user.email})
                  </option>
                ))}
              </optgroup>
              {teamMembers.length > 0 && (
                <optgroup label="Team Members">
                  {teamMembers.filter(m => m.isActive).map((member: TeamMember) => (
                    <option key={member.id} value={`team_${member.id}`}>
                      {member.fullName} ({member.email}) - Team Member
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
            {allUsers.length === 0 && teamMembers.length === 0 && (
              <p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
                No users or team members found
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Priority *
            </label>
            <div className="grid grid-cols-2 gap-2">
              {['low', 'medium', 'high', 'urgent'].map(priority => (
                <button
                  key={priority}
                  type="button"
                  onClick={() => setFormData({ ...formData, priority: priority as 'urgent' | 'high' | 'medium' | 'low' })}
                  className={`px-3 py-2 rounded-lg text-sm font-medium border transition-colors duration-200 ${
                    formData.priority === priority
                      ? `${getPriorityColor(priority)} border-current`
                      : 'border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  {priority.charAt(0).toUpperCase() + priority.slice(1)}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Due Date *
            </label>
            <input
              type="date"
              required
              value={formData.dueDate}
              onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
              min={new Date().toISOString().split('T')[0]}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>
          
          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-600 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-500 transition-colors duration-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || allUsers.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg disabled:opacity-50 flex items-center"
            >
              {loading ? (
                'Assigning...'
              ) : (
                <>
                  <Calendar className="h-4 w-4 mr-2" />
                  Assign Task
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
