import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { TeamMemberFormData, PagePermission } from '../types';
import { teamMemberService } from '../services/teamMemberService';

interface AddTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

// Available pages for permission assignment (matching Sidebar navigation exactly)
const AVAILABLE_PAGES: PagePermission[] = [
  { path: '/', label: 'Policies', enabled: false },
  { path: '/dashboard', label: 'Dashboard', enabled: false },
  { path: '/client-folders', label: 'Client Folders', enabled: false },
  { path: '/leads', label: 'Leads', enabled: false },
  { path: '/tasks', label: 'Tasks', enabled: false },
  { path: '/reminders', label: 'Reminders', enabled: false },
  { path: '/lapsed-policies', label: 'Lapsed', enabled: false },
  { path: '/claims', label: 'Claims', enabled: false },
  { path: '/commissions', label: 'Commissions', enabled: false },
  { path: '/activity-log', label: 'Activity Log', enabled: false },
  { path: '/restore', label: 'Restore', enabled: false },
  { path: '/profile', label: 'Profile', enabled: false },
  { path: '/support', label: 'Support', enabled: false },
];

export const AddTeamMemberModal: React.FC<AddTeamMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState<TeamMemberFormData>({
    fullName: '',
    email: '',
    password: '',
    pageAccess: [],
  });
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>(AVAILABLE_PAGES);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamMemberCount, setTeamMemberCount] = useState(0);

  useEffect(() => {
    if (isOpen) {
      loadTeamMemberCount();
    }
  }, [isOpen]);

  const loadTeamMemberCount = async () => {
    try {
      const count = await teamMemberService.getTeamMemberCount();
      setTeamMemberCount(count);
    } catch (err) {
      console.error('Error loading team member count:', err);
    }
  };

  const handleGeneratePassword = () => {
    const newPassword = teamMemberService.generatePassword(12);
    setFormData({ ...formData, password: newPassword });
  };

  const handlePermissionToggle = (path: string) => {
    setPagePermissions(prev =>
      prev.map(perm =>
        perm.path === path ? { ...perm, enabled: !perm.enabled } : perm
      )
    );
  };

  const handleSelectAll = () => {
    const allEnabled = pagePermissions.every(p => p.enabled);
    setPagePermissions(prev =>
      prev.map(perm => ({ ...perm, enabled: !allEnabled }))
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (!formData.fullName.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (!formData.password || formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    const selectedPages = pagePermissions.filter(p => p.enabled).map(p => p.path);
    if (selectedPages.length === 0) {
      setError('Please select at least one page access');
      return;
    }

    if (teamMemberCount >= 3) {
      setError('Maximum limit of 3 team members reached');
      return;
    }

    setLoading(true);
    try {
      await teamMemberService.createTeamMember({
        ...formData,
        pageAccess: selectedPages,
      });
      
      // Reset form
      setFormData({
        fullName: '',
        email: '',
        password: '',
        pageAccess: [],
      });
      setPagePermissions(AVAILABLE_PAGES);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error creating team member:', err);
      setError(err.message || 'Failed to create team member');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const selectedCount = pagePermissions.filter(p => p.enabled).length;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Add Team Member
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              {teamMemberCount}/3 team members created
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Message */}
          {error && (
            <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0" />
              <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
            </div>
          )}

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              type="text"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter team member's full name"
              required
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email *
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder="Enter email address"
              required
            />
          </div>

          {/* Password */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Password *
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Enter your own password (min 8 characters)"
                  required
                  minLength={8}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center gap-2 whitespace-nowrap"
                title="Generate Random Password"
              >
                <RefreshCw className="w-4 h-4" />
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Enter your own password or click "Generate" for a random one. Minimum 8 characters.
            </p>
          </div>

          {/* Page Access Permissions */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                Page Access Permissions * ({selectedCount} selected)
              </label>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {selectedCount === pagePermissions.length ? 'Deselect All' : 'Select All'}
              </button>
            </div>
            <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4 max-h-64 overflow-y-auto">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {pagePermissions.map((perm) => (
                  <label
                    key={perm.path}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                  >
                    <input
                      type="checkbox"
                      checked={perm.enabled}
                      onChange={() => handlePermissionToggle(perm.path)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">
                      {perm.label}
                    </span>
                  </label>
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
              Team member will only see and access the pages you select here
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || teamMemberCount >= 3}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Create Team Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
