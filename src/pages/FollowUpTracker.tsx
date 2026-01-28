import { useEffect, useState } from 'react';
import { Calendar, Filter, Clock, Phone, Mail, Package, AlertCircle, CheckCircle2, MessageSquare } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { leadService } from '../services/leadService';
import { Lead, FollowUpHistory } from '../types';
import { format, isToday, isTomorrow, isPast, isWithinInterval, startOfDay, endOfDay, addDays } from 'date-fns';
import toast from 'react-hot-toast';

export function FollowUpTracker() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [filteredLeads, setFilteredLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [dateFilter, setDateFilter] = useState<'today' | 'tomorrow' | 'this_week' | 'overdue' | 'custom'>('today');
  const [customStartDate, setCustomStartDate] = useState<string>('');
  const [customEndDate, setCustomEndDate] = useState<string>('');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [showFollowUpModal, setShowFollowUpModal] = useState(false);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpStatus, setFollowUpStatus] = useState<'completed' | 'missed' | 'rescheduled'>('completed');
  const [nextFollowUpDate, setNextFollowUpDate] = useState<string>('');

  useEffect(() => {
    if (user) {
      loadLeads();
    }
  }, [user]);

  useEffect(() => {
    filterLeadsByDate();
  }, [leads, dateFilter, customStartDate, customEndDate]);

  const loadLeads = async () => {
    try {
      setLoading(true);
      const data = await leadService.getLeads(user?.userId);
      setLeads(data);
    } catch (error) {
      console.error('Error loading leads:', error);
      toast.error('Failed to load leads');
    } finally {
      setLoading(false);
    }
  };

  const filterLeadsByDate = () => {
    let filtered = [...leads];
    const now = new Date();

    switch (dateFilter) {
      case 'today':
        filtered = filtered.filter(lead => {
          const followUpDate = typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate;
          return isToday(followUpDate);
        });
        break;

      case 'tomorrow':
        filtered = filtered.filter(lead => {
          const followUpDate = typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate;
          return isTomorrow(followUpDate);
        });
        break;

      case 'this_week':
        const weekEnd = addDays(now, 7);
        filtered = filtered.filter(lead => {
          const followUpDate = typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate;
          return isWithinInterval(followUpDate, { start: startOfDay(now), end: endOfDay(weekEnd) });
        });
        break;

      case 'overdue':
        filtered = filtered.filter(lead => {
          const followUpDate = typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate;
          return isPast(followUpDate) && !isToday(followUpDate) && lead.status !== 'won' && lead.status !== 'lost' && lead.status !== 'canceled';
        });
        break;

      case 'custom':
        if (customStartDate && customEndDate) {
          const startDate = new Date(customStartDate);
          const endDate = new Date(customEndDate);
          filtered = filtered.filter(lead => {
            const followUpDate = typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate;
            return isWithinInterval(followUpDate, { start: startOfDay(startDate), end: endOfDay(endDate) });
          });
        }
        break;
    }

    // Sort by follow-up date (earliest first)
    filtered.sort((a, b) => {
      const dateA = typeof a.followUpDate === 'string' ? new Date(a.followUpDate) : a.followUpDate;
      const dateB = typeof b.followUpDate === 'string' ? new Date(b.followUpDate) : b.followUpDate;
      return dateA.getTime() - dateB.getTime();
    });

    setFilteredLeads(filtered);
  };

  const handleMarkFollowUp = (lead: Lead) => {
    setSelectedLead(lead);
    setFollowUpNote('');
    setFollowUpStatus('completed');
    setNextFollowUpDate('');
    setShowFollowUpModal(true);
  };

  const handleSaveFollowUp = async () => {
    if (!selectedLead || !user) return;

    if (!followUpNote.trim()) {
      toast.error('Please add follow-up notes');
      return;
    }

    try {
      const followUpHistory: Omit<FollowUpHistory, 'id' | 'createdAt'> = {
        leadId: selectedLead.id,
        followUpDate: selectedLead.followUpDate,
        actualFollowUpDate: new Date().toISOString(),
        status: followUpStatus,
        notes: followUpNote,
        nextFollowUpDate: nextFollowUpDate || undefined,
        createdBy: user.userId || '',
        createdByName: user.displayName || '',
      };

      await leadService.addFollowUpHistory(selectedLead.id, followUpHistory);

      // Update lead's next follow-up date if provided
      if (nextFollowUpDate && followUpStatus !== 'missed') {
        await leadService.updateLead(selectedLead.id, {
          ...selectedLead,
          followUpDate: nextFollowUpDate,
          nextFollowUpDate: nextFollowUpDate,
        }, user.userId || '', user.displayName || '');
      }

      toast.success('Follow-up recorded successfully');
      setShowFollowUpModal(false);
      setSelectedLead(null);
      loadLeads();
    } catch (error) {
      console.error('Error saving follow-up:', error);
      toast.error('Failed to save follow-up');
    }
  };

  const getStatusColor = (status: Lead['status']) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      qualified: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200',
      proposal_sent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200',
      follow_up: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200',
      won: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    };
    return colors[status] || colors.new;
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'text-gray-500',
      medium: 'text-yellow-500',
      high: 'text-red-500',
    };
    return priority ? colors[priority] : colors.low;
  };

  const formatDate = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MMM dd, yyyy');
  };

  const getDateLabel = (date: Date | string) => {
    const d = typeof date === 'string' ? new Date(date) : date;
    if (isToday(d)) return 'Today';
    if (isTomorrow(d)) return 'Tomorrow';
    if (isPast(d) && !isToday(d)) return 'Overdue';
    return formatDate(d);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading follow-ups...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Calendar className="h-8 w-8 mr-3 text-blue-600" />
            Follow-Up Tracker
          </h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage your lead follow-ups</p>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-gray-500 dark:text-gray-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Follow-Ups</h2>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-4">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === 'today'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Today
            </button>
            <button
              onClick={() => setDateFilter('tomorrow')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === 'tomorrow'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Tomorrow
            </button>
            <button
              onClick={() => setDateFilter('this_week')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === 'this_week'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              This Week
            </button>
            <button
              onClick={() => setDateFilter('overdue')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === 'overdue'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Overdue
            </button>
            <button
              onClick={() => setDateFilter('custom')}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                dateFilter === 'custom'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              Custom
            </button>
          </div>

          {dateFilter === 'custom' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Follow-Ups</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{filteredLeads.length}</p>
              </div>
              <Calendar className="h-10 w-10 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">High Priority</p>
                <p className="text-2xl font-bold text-red-600 dark:text-red-400 mt-1">
                  {filteredLeads.filter(l => l.priority === 'high').length}
                </p>
              </div>
              <AlertCircle className="h-10 w-10 text-red-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Today's Tasks</p>
                <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400 mt-1">
                  {leads.filter(l => isToday(typeof l.followUpDate === 'string' ? new Date(l.followUpDate) : l.followUpDate)).length}
                </p>
              </div>
              <Clock className="h-10 w-10 text-yellow-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Completed</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">
                  {leads.filter(l => l.status === 'won').length}
                </p>
              </div>
              <CheckCircle2 className="h-10 w-10 text-green-600" />
            </div>
          </div>
        </div>

        {/* Follow-Up List */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {dateFilter === 'today' && 'Today\'s Follow-Ups'}
              {dateFilter === 'tomorrow' && 'Tomorrow\'s Follow-Ups'}
              {dateFilter === 'this_week' && 'This Week\'s Follow-Ups'}
              {dateFilter === 'overdue' && 'Overdue Follow-Ups'}
              {dateFilter === 'custom' && 'Custom Date Range Follow-Ups'}
            </h2>
          </div>

          {filteredLeads.length === 0 ? (
            <div className="p-12 text-center">
              <Calendar className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500 dark:text-gray-400 text-lg">No follow-ups scheduled for this period</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredLeads.map(lead => (
                <div key={lead.id} className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">{lead.customerName}</h3>
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getStatusColor(lead.status)}`}>
                          {lead.status.replace('_', ' ').toUpperCase()}
                        </span>
                        {lead.priority && (
                          <AlertCircle className={`h-5 w-5 ${getPriorityColor(lead.priority)}`} />
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600 dark:text-gray-400 mb-3">
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 mr-2" />
                          {lead.customerMobile}
                        </div>
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2" />
                          {lead.customerEmail}
                        </div>
                        <div className="flex items-center">
                          <Package className="h-4 w-4 mr-2" />
                          {lead.productType}
                        </div>
                      </div>

                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center text-blue-600 dark:text-blue-400 font-medium">
                          <Clock className="h-4 w-4 mr-1" />
                          {getDateLabel(lead.followUpDate)}
                        </div>
                        {lead.remark && (
                          <div className="flex items-center text-gray-500 dark:text-gray-400">
                            <MessageSquare className="h-4 w-4 mr-1" />
                            {lead.remark.substring(0, 50)}{lead.remark.length > 50 ? '...' : ''}
                          </div>
                        )}
                      </div>
                    </div>

                    <button
                      onClick={() => handleMarkFollowUp(lead)}
                      className="ml-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center whitespace-nowrap"
                    >
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Mark Follow-Up
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Follow-Up Modal */}
      {showFollowUpModal && selectedLead && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg">
              <h2 className="text-2xl font-bold">Record Follow-Up</h2>
              <p className="text-blue-100 mt-1">{selectedLead.customerName}</p>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Follow-Up Status *
                </label>
                <select
                  value={followUpStatus}
                  onChange={(e) => setFollowUpStatus(e.target.value as 'completed' | 'missed' | 'rescheduled')}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="completed">Completed</option>
                  <option value="missed">Missed</option>
                  <option value="rescheduled">Rescheduled</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Follow-Up Notes *
                </label>
                <textarea
                  value={followUpNote}
                  onChange={(e) => setFollowUpNote(e.target.value)}
                  rows={4}
                  placeholder="What happened during the follow-up? What was discussed?"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              {followUpStatus !== 'missed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Next Follow-Up Date
                  </label>
                  <input
                    type="date"
                    value={nextFollowUpDate}
                    onChange={(e) => setNextFollowUpDate(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  />
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 p-6 border-t border-gray-200 dark:border-gray-600">
              <button
                onClick={() => setShowFollowUpModal(false)}
                className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveFollowUp}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
              >
                Save Follow-Up
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
