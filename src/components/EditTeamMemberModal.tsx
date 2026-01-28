import React, { useState, useEffect } from 'react';
import { X, Eye, EyeOff, RefreshCw, Save, AlertCircle } from 'lucide-react';
import { TeamMember, TeamMemberFormData, PagePermission } from '../types';
import { teamMemberService } from '../services/teamMemberService';

interface EditTeamMemberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  teamMember: TeamMember;
}

// Available pages for permission assignment
const AVAILABLE_PAGES: PagePermission[] = [
  { path: '/dashboard', label: 'Dashboard', enabled: false },
  { path: '/policies', label: 'Policies', enabled: false },
  { path: '/add-policy', label: 'Add Policy', enabled: false },
  { path: '/leads', label: 'Leads Management', enabled: false },
  { path: '/follow-up-leads', label: 'Follow-Up Leads', enabled: false },
  { path: '/tasks', label: 'Task Management', enabled: false },
  { path: '/claims', label: 'Claims', enabled: false },
  { path: '/lapsed-policies', label: 'Lapsed Policies', enabled: false },
  { path: '/commissions', label: 'Commissions', enabled: false },
  { path: '/reminders', label: 'Reminders', enabled: false },
  { path: '/activity-log', label: 'Activity Log', enabled: false },
  { path: '/client-folders', label: 'Client Folders', enabled: false },
  { path: '/profile', label: 'Profile', enabled: false },
];

export const EditTeamMemberModal: React.FC<EditTeamMemberModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  teamMember,
}) => {
  const [formData, setFormData] = useState<Partial<TeamMemberFormData>>({
    fullName: teamMember.fullName,
    email: teamMember.email,
    password: '',
    pageAccess: teamMember.permissions?.pageAccess || [],
  });
  const [pagePermissions, setPagePermissions] = useState<PagePermission[]>(AVAILABLE_PAGES);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Initialize form with team member data
      setFormData({
        fullName: teamMember.fullName,
        email: teamMember.email,
        password: '',
        pageAccess: teamMember.permissions?.pageAccess || [],
      });

      // Set page permissions based on existing access
      const existingAccess = teamMember.permissions?.pageAccess || [];
      setPagePermissions(
        AVAILABLE_PAGES.map(page => ({
          ...page,
          enabled: existingAccess.includes(page.path),
        }))
      );
    }
  }, [isOpen, teamMember]);

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
    if (!formData.fullName?.trim()) {
      setError('Full name is required');
      return;
    }
    if (!formData.email?.trim() || !formData.email.includes('@')) {
      setError('Valid email is required');
      return;
    }
    if (formData.password && formData.password.length < 8) {
      setError('Password must be at least 8 characters (leave blank to keep current password)');
      return;
    }

    const selectedPages = pagePermissions.filter(p => p.enabled).map(p => p.path);
    if (selectedPages.length === 0) {
      setError('Please select at least one page access');
      return;
    }

    setLoading(true);
    try {
      const updateData: Partial<TeamMemberFormData> = {
        fullName: formData.fullName,
        email: formData.email,
        pageAccess: selectedPages,
      };

      // Only include password if it was changed
      if (formData.password) {
        updateData.password = formData.password;
      }

      await teamMemberService.updateTeamMember(teamMember.id, updateData);
      
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error updating team member:', err);
      setError(err.message || 'Failed to update team member');
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
              Edit Team Member
            </h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update details and permissions for {teamMember.fullName}
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
              New Password (optional)
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="w-full px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  placeholder="Leave blank to keep current password"
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
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 flex items-center gap-2"
                title="Generate Password"
              >
                <RefreshCw className="w-4 h-4" />
                Generate
              </button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              Leave blank to keep the current password. Or generate a new one to reset.
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
              disabled={loading}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  Updating...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Update Team Member
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
