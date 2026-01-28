import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { AppUser, SupabaseUserData } from '../types';
import { supabase, TABLES } from '../config/supabase';
import { supabaseAuthService } from '../services/supabaseAuthService';
import toast from 'react-hot-toast';
import { 
  Users, Lock, Unlock, Calendar,
  CheckCircle, XCircle, Clock, Search, RefreshCw, Shield
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function AdminPanel() {
  const { user: currentUser } = useAuth();
  const navigate = useNavigate();
  const [users, setUsers] = useState<AppUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'trial' | 'active' | 'expired' | 'locked'>('all');
  const [selectedUser, setSelectedUser] = useState<AppUser | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState<'lock' | 'unlock' | 'activate' | 'extend'>('lock');
  const [lockReason, setLockReason] = useState('');
  const [subscriptionDays, setSubscriptionDays] = useState(30);

  useEffect(() => {
    // Check if user is admin
    if (!currentUser || currentUser.role !== 'admin') {
      toast.error('Access denied: Admin only');
      navigate('/');
      return;
    }

    loadUsers();
  }, [currentUser, navigate]);

  const loadUsers = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from(TABLES.USERS)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      if (!data) {
        setUsers([]);
        return;
      }

      const parsedUsers: AppUser[] = data.map((userData: SupabaseUserData) => ({
        id: userData.id,
        email: userData.email,
        displayName: userData.display_name || 'Unknown User',
        role: (userData.role === 'admin' ? 'admin' : 'user') as 'admin' | 'user',
        isActive: userData.is_active ?? true,
        createdAt: new Date(userData.created_at || Date.now()),
        lastLogin: userData.last_login ? new Date(userData.last_login) : undefined,
        subscriptionStatus: (userData.subscription_status || 'trial') as 'trial' | 'active' | 'expired' | 'locked',
        trialStartDate: userData.trial_start_date ? new Date(userData.trial_start_date) : undefined,
        trialEndDate: userData.trial_end_date ? new Date(userData.trial_end_date) : undefined,
        subscriptionStartDate: userData.subscription_start_date ? new Date(userData.subscription_start_date) : undefined,
        subscriptionEndDate: userData.subscription_end_date ? new Date(userData.subscription_end_date) : undefined,
        isLocked: userData.is_locked ?? false,
        lockedReason: userData.locked_reason,
        lockedBy: userData.locked_by,
        lockedAt: userData.locked_at ? new Date(userData.locked_at) : undefined,
      }));

      setUsers(parsedUsers);
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  const handleLockUser = async () => {
    if (!selectedUser || !lockReason.trim()) {
      toast.error('Please provide a reason for locking');
      return;
    }

    try {
      const { error } = await supabase
        .from(TABLES.USERS)
        .update({
          is_locked: true,
          locked_reason: lockReason,
          locked_by: currentUser?.id,
          locked_at: new Date().toISOString(),
          subscription_status: 'locked'
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`User ${selectedUser.displayName} locked successfully`);
      setShowModal(false);
      setLockReason('');
      loadUsers();
    } catch (error) {
      console.error('Error locking user:', error);
      toast.error('Failed to lock user');
    }
  };

  const handleUnlockUser = async () => {
    if (!selectedUser) return;

    try {
      // Determine new status based on dates
      const now = new Date();
      let newStatus: 'trial' | 'active' | 'expired' = 'expired';

      if (selectedUser.trialEndDate && now <= selectedUser.trialEndDate) {
        newStatus = 'trial';
      } else if (selectedUser.subscriptionEndDate && now <= selectedUser.subscriptionEndDate) {
        newStatus = 'active';
      }

      const { error } = await supabase
        .from(TABLES.USERS)
        .update({
          is_locked: false,
          locked_reason: null,
          locked_by: null,
          locked_at: null,
          subscription_status: newStatus
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`User ${selectedUser.displayName} unlocked successfully`);
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error unlocking user:', error);
      toast.error('Failed to unlock user');
    }
  };

  const handleActivateSubscription = async () => {
    if (!selectedUser || subscriptionDays < 1) {
      toast.error('Invalid subscription duration');
      return;
    }

    try {
      const startDate = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + subscriptionDays);

      const { error } = await supabase
        .from(TABLES.USERS)
        .update({
          subscription_status: 'active',
          subscription_start_date: startDate.toISOString(),
          subscription_end_date: endDate.toISOString(),
          is_locked: false
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`Subscription activated for ${selectedUser.displayName} (${subscriptionDays} days)`);
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error activating subscription:', error);
      toast.error('Failed to activate subscription');
    }
  };

  const handleExtendSubscription = async () => {
    if (!selectedUser || subscriptionDays < 1) {
      toast.error('Invalid extension duration');
      return;
    }

    try {
      let newEndDate = new Date();
      
      // If user has an existing end date, extend from there
      if (selectedUser.subscriptionEndDate) {
        newEndDate = new Date(selectedUser.subscriptionEndDate);
      }
      
      newEndDate.setDate(newEndDate.getDate() + subscriptionDays);

      const { error } = await supabase
        .from(TABLES.USERS)
        .update({
          subscription_end_date: newEndDate.toISOString(),
          subscription_status: 'active'
        })
        .eq('id', selectedUser.id);

      if (error) throw error;

      toast.success(`Subscription extended for ${selectedUser.displayName} (+${subscriptionDays} days)`);
      setShowModal(false);
      loadUsers();
    } catch (error) {
      console.error('Error extending subscription:', error);
      toast.error('Failed to extend subscription');
    }
  };

  const openModal = (user: AppUser, action: 'lock' | 'unlock' | 'activate' | 'extend') => {
    setSelectedUser(user);
    setModalAction(action);
    setShowModal(true);
  };

  const getStatusBadge = (user: AppUser) => {
    const daysRemaining = supabaseAuthService.getDaysRemaining(user);
    
    const badges = {
      trial: {
        color: daysRemaining <= 3 ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-200',
        icon: <Clock className="w-4 h-4" />,
        text: `Trial (${daysRemaining}d)`
      },
      active: {
        color: daysRemaining <= 7 ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-200' : 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200',
        icon: <CheckCircle className="w-4 h-4" />,
        text: `Active (${daysRemaining}d)`
      },
      expired: {
        color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-200',
        icon: <XCircle className="w-4 h-4" />,
        text: 'Expired'
      },
      locked: {
        color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
        icon: <Lock className="w-4 h-4" />,
        text: 'Locked'
      }
    };

    const badge = badges[user.subscriptionStatus as keyof typeof badges] || badges.expired;

    return (
      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${badge.color}`}>
        {badge.icon}
        {badge.text}
      </span>
    );
  };

  const filteredUsers = users.filter(user => {
    // Filter out admins from the list (optional, or show them separately)
    // if (user.role === 'admin') return false;

    const matchesSearch = 
      user.displayName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || user.subscriptionStatus === filterStatus;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: users.filter(u => u.role !== 'admin').length,
    trial: users.filter(u => u.subscriptionStatus === 'trial').length,
    active: users.filter(u => u.subscriptionStatus === 'active').length,
    expired: users.filter(u => u.subscriptionStatus === 'expired').length,
    locked: users.filter(u => u.subscriptionStatus === 'locked').length
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-blue-600" />
                Admin Panel
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-2">
                Manage users, subscriptions, and access control
              </p>
            </div>
            <button
              onClick={loadUsers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Total Users</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.total}</p>
                </div>
                <Users className="w-8 h-8 text-blue-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Trial</p>
                  <p className="text-2xl font-bold text-yellow-600">{stats.trial}</p>
                </div>
                <Clock className="w-8 h-8 text-yellow-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
                  <p className="text-2xl font-bold text-green-600">{stats.active}</p>
                </div>
                <CheckCircle className="w-8 h-8 text-green-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Expired</p>
                  <p className="text-2xl font-bold text-red-600">{stats.expired}</p>
                </div>
                <XCircle className="w-8 h-8 text-red-500" />
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600 dark:text-gray-400">Locked</p>
                  <p className="text-2xl font-bold text-gray-600">{stats.locked}</p>
                </div>
                <Lock className="w-8 h-8 text-gray-500" />
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search by name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>
              </div>
              <div className="flex gap-2">
                {(['all', 'trial', 'active', 'expired', 'locked'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={`px-4 py-2 rounded-sharp font-medium capitalize transition-colors ${
                      filterStatus === status
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-700">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">User</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Role</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Days Left</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">End Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Last Login</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <RefreshCw className="w-8 h-8 animate-spin text-blue-500 mx-auto" />
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-gray-500 dark:text-gray-400">
                      No users found
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const daysRemaining = supabaseAuthService.getDaysRemaining(user);
                    const endDate = user.subscriptionStatus === 'trial' ? user.trialEndDate : user.subscriptionEndDate;

                    return (
                      <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-6 py-4">
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{user.displayName}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">{user.email}</div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-2 py-1 rounded text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-200' 
                              : 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-200'
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4">{getStatusBadge(user)}</td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.role === 'admin' ? '∞' : daysRemaining > 0 ? `${daysRemaining} days` : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {endDate ? new Date(endDate).toLocaleDateString() : '-'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never'}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          {user.role !== 'admin' && (
                            <div className="flex gap-2">
                              {user.isLocked ? (
                                <button
                                  onClick={() => openModal(user, 'unlock')}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-green-600 text-white rounded hover:bg-green-700 text-xs"
                                >
                                  <Unlock className="w-3 h-3" />
                                  Unlock
                                </button>
                              ) : (
                                <button
                                  onClick={() => openModal(user, 'lock')}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-red-600 text-white rounded hover:bg-red-700 text-xs"
                                >
                                  <Lock className="w-3 h-3" />
                                  Lock
                                </button>
                              )}
                              {(user.subscriptionStatus === 'trial' || user.subscriptionStatus === 'expired') ? (
                                <button
                                  onClick={() => openModal(user, 'activate')}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 text-xs"
                                >
                                  <CheckCircle className="w-3 h-3" />
                                  Activate
                                </button>
                              ) : (
                                <button
                                  onClick={() => openModal(user, 'extend')}
                                  className="inline-flex items-center gap-1 px-3 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 text-xs"
                                >
                                  <Calendar className="w-3 h-3" />
                                  Extend
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Action Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-4">
              {modalAction === 'lock' && 'Lock Account'}
              {modalAction === 'unlock' && 'Unlock Account'}
              {modalAction === 'activate' && 'Activate Subscription'}
              {modalAction === 'extend' && 'Extend Subscription'}
            </h3>

            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                User: <span className="font-medium text-gray-900 dark:text-white">{selectedUser.displayName}</span>
              </p>
            </div>

            {modalAction === 'lock' && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Reason for locking <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={lockReason}
                  onChange={(e) => setLockReason(e.target.value)}
                  placeholder="Enter reason..."
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            )}

            {(modalAction === 'activate' || modalAction === 'extend') && (
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  {modalAction === 'activate' ? 'Subscription Duration' : 'Extension Duration'} (days)
                </label>
                <input
                  type="number"
                  value={subscriptionDays}
                  onChange={(e) => setSubscriptionDays(Number(e.target.value))}
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Common: 30 days (1 month), 90 days (3 months), 365 days (1 year)
                </p>
              </div>
            )}

            {modalAction === 'unlock' && selectedUser.lockedReason && (
              <div className="mb-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Lock reason:</strong> {selectedUser.lockedReason}
                </p>
              </div>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowModal(false);
                  setLockReason('');
                  setSubscriptionDays(30);
                }}
                className="flex-1 px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  if (modalAction === 'lock') handleLockUser();
                  else if (modalAction === 'unlock') handleUnlockUser();
                  else if (modalAction === 'activate') handleActivateSubscription();
                  else if (modalAction === 'extend') handleExtendSubscription();
                }}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  modalAction === 'lock'
                    ? 'bg-red-600 hover:bg-red-700'
                    : modalAction === 'unlock'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
