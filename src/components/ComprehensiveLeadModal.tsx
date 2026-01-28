import { useState, useEffect } from 'react';
import { X, Save, User, Phone, Mail, Package, Calendar, DollarSign, AlertCircle, Clock, MessageSquare, Check, ChevronRight, History, CheckCircle2, XCircle, Edit2 } from 'lucide-react';
import { Lead, LeadFormData, FollowUpHistory } from '../types';
import { format } from 'date-fns';
import { leadService } from '../services/leadService';
import toast from 'react-hot-toast';

interface ComprehensiveLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onUpdate: () => void;
  userId: string;
  userDisplayName: string;
}

type TabType = 'details' | 'history' | 'edit';

export function ComprehensiveLeadModal({ lead, onClose, onUpdate, userId, userDisplayName }: ComprehensiveLeadModalProps) {
  const [activeTab, setActiveTab] = useState<TabType>('details');
  const [followUpHistory, setFollowUpHistory] = useState<FollowUpHistory[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  
  // Edit form state
  const [editData, setEditData] = useState<LeadFormData>({
    customerName: lead.customerName,
    customerMobile: lead.customerMobile,
    customerEmail: lead.customerEmail,
    productType: lead.productType,
    followUpDate: format(typeof lead.followUpDate === 'string' ? new Date(lead.followUpDate) : lead.followUpDate, 'yyyy-MM-dd'),
    status: lead.status,
    leadSource: lead.leadSource,
    remark: lead.remark || '',
    nextFollowUpDate: lead.nextFollowUpDate 
      ? format(typeof lead.nextFollowUpDate === 'string' ? new Date(lead.nextFollowUpDate) : lead.nextFollowUpDate, 'yyyy-MM-dd')
      : '',
    priority: lead.priority || 'medium',
    estimatedValue: lead.estimatedValue || 0,
  });

  useEffect(() => {
    if (activeTab === 'history') {
      loadFollowUpHistory();
    }
  }, [activeTab]);

  const loadFollowUpHistory = async () => {
    try {
      setLoadingHistory(true);
      const history = await leadService.getFollowUpHistory(lead.id);
      setFollowUpHistory(history);
    } catch (error) {
      console.error('Error loading follow-up history:', error);
      toast.error('Failed to load follow-up history');
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSaveEdit = async () => {
    try {
      await leadService.updateLead(lead.id, editData, userId, userDisplayName);
      toast.success('Lead updated successfully!');
      setActiveTab('details');
      onUpdate();
    } catch (error) {
      console.error('Error updating lead:', error);
      toast.error('Failed to update lead');
    }
  };

  const handleQuickStatusChange = async (newStatus: Lead['status']) => {
    try {
      await leadService.updateLead(lead.id, {
        status: newStatus,
      }, userId, userDisplayName);
      toast.success('Status updated!');
      onUpdate();
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleQuickPriorityChange = async (newPriority: 'low' | 'medium' | 'high') => {
    try {
      await leadService.updateLead(lead.id, {
        priority: newPriority,
      }, userId, userDisplayName);
      toast.success('Priority updated!');
      onUpdate();
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
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
      low: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300',
      high: 'bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300',
    };
    return priority ? colors[priority] : colors.low;
  };

  const formatDate = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MMM dd, yyyy');
  };

  const formatDateTime = (date: Date | string | undefined) => {
    if (!date) return 'N/A';
    const d = typeof date === 'string' ? new Date(date) : date;
    return format(d, 'MMM dd, yyyy hh:mm a');
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-5xl w-full max-h-[95vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6">
          <div className="flex justify-between items-start">
            <div className="flex-1">
              <h2 className="text-2xl font-bold flex items-center">
                <User className="h-6 w-6 mr-2" />
                {lead.customerName}
              </h2>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className={`px-3 py-1 rounded-full text-sm font-semibold ${getStatusColor(lead.status)}`}>
                  {lead.status.replace('_', ' ').toUpperCase()}
                </span>
                {lead.priority && (
                  <span className={`px-3 py-1 rounded-full text-sm font-semibold flex items-center ${getPriorityColor(lead.priority)}`}>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    {lead.priority.toUpperCase()}
                  </span>
                )}
                {lead.isConverted && (
                  <span className="px-3 py-1 rounded-full text-sm font-semibold bg-green-100 text-green-800 flex items-center">
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    CONVERTED
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900">
          <div className="flex space-x-1 px-6">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'details'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <User className="h-4 w-4 inline mr-2" />
              Details
            </button>
            <button
              onClick={() => setActiveTab('history')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'history'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <History className="h-4 w-4 inline mr-2" />
              History ({followUpHistory.length})
            </button>
            <button
              onClick={() => setActiveTab('edit')}
              className={`px-6 py-3 font-medium transition-colors ${
                activeTab === 'edit'
                  ? 'border-b-2 border-blue-600 text-blue-600 dark:text-blue-400'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200'
              }`}
            >
              <Edit2 className="h-4 w-4 inline mr-2" />
              Edit
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Details Tab */}
          {activeTab === 'details' && (
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
                <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">Quick Actions</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Change Status</label>
                    <select
                      value={lead.status}
                      onChange={(e) => handleQuickStatusChange(e.target.value as Lead['status'])}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">Change Priority</label>
                    <select
                      value={lead.priority || 'medium'}
                      onChange={(e) => handleQuickPriorityChange(e.target.value as 'low' | 'medium' | 'high')}
                      className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Customer Information */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Name</label>
                    <p className="text-base font-semibold text-gray-900 dark:text-gray-100 mt-1">{lead.customerName}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Phone className="h-4 w-4 mr-1" />
                      Mobile
                    </label>
                    <p className="text-base text-gray-900 dark:text-gray-100 mt-1">
                      <a href={`tel:${lead.customerMobile}`} className="text-blue-600 hover:underline">
                        {lead.customerMobile}
                      </a>
                    </p>
                  </div>
                  <div className="md:col-span-2">
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                      <Mail className="h-4 w-4 mr-1" />
                      Email
                    </label>
                    <p className="text-base text-gray-900 dark:text-gray-100 mt-1">
                      <a href={`mailto:${lead.customerEmail}`} className="text-blue-600 hover:underline">
                        {lead.customerEmail}
                      </a>
                    </p>
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Lead Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Product Type</label>
                    <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.productType}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Source</label>
                    <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.leadSource}</p>
                  </div>
                  {lead.estimatedValue && lead.estimatedValue > 0 && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                        <DollarSign className="h-4 w-4 mr-1" />
                        Estimated Value
                      </label>
                      <p className="text-base font-semibold text-green-600 dark:text-green-400 mt-1">
                        ₹{lead.estimatedValue.toLocaleString()}
                      </p>
                    </div>
                  )}
                  {lead.assignedToName && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Assigned To</label>
                      <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.assignedToName}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Follow-up Schedule */}
              <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Follow-up Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Follow-up Date</label>
                    <p className="text-base text-gray-900 dark:text-gray-100 mt-1 flex items-center">
                      <Clock className="h-4 w-4 mr-1 text-blue-600" />
                      {formatDate(lead.followUpDate)}
                    </p>
                  </div>
                  {lead.nextFollowUpDate && (
                    <div>
                      <label className="text-sm font-medium text-gray-500 dark:text-gray-400">Next Follow-up</label>
                      <p className="text-base text-gray-900 dark:text-gray-100 mt-1 flex items-center">
                        <Clock className="h-4 w-4 mr-1 text-green-600" />
                        {formatDate(lead.nextFollowUpDate)}
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Remarks */}
              {lead.remark && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center">
                    <MessageSquare className="h-5 w-5 mr-2 text-blue-600" />
                    Remarks
                  </h3>
                  <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{lead.remark}</p>
                </div>
              )}

              {/* Timestamps */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-500 dark:text-gray-400">
                <div>
                  <span className="font-medium">Created:</span> {formatDate(lead.createdAt)}
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span> {formatDate(lead.updatedAt)}
                </div>
              </div>
            </div>
          )}

          {/* History Tab */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {loadingHistory ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading history...</p>
                </div>
              ) : followUpHistory.length === 0 ? (
                <div className="text-center py-12">
                  <History className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 dark:text-gray-400 text-lg font-medium">No follow-up history yet</p>
                  <p className="text-gray-400 dark:text-gray-500 text-sm mt-2">
                    Record follow-ups from the Follow-Up Leads page
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Follow-Up Timeline ({followUpHistory.length} entries)
                  </h3>
                  <div className="space-y-3">
                    {followUpHistory.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border-l-4 border-blue-500"
                      >
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            {entry.status === 'completed' && <CheckCircle2 className="h-5 w-5 text-green-600" />}
                            {entry.status === 'missed' && <XCircle className="h-5 w-5 text-red-600" />}
                            {entry.status === 'rescheduled' && <Clock className="h-5 w-5 text-yellow-600" />}
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                              entry.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                              entry.status === 'missed' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                              'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            }`}>
                              {entry.status.toUpperCase()}
                            </span>
                          </div>
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            #{followUpHistory.length - index}
                          </span>
                        </div>
                        
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Clock className="h-4 w-4 mr-2" />
                            <span className="font-medium">Scheduled:</span>
                            <span className="ml-2">{formatDate(entry.followUpDate)}</span>
                          </div>
                          <div className="flex items-center text-gray-600 dark:text-gray-400">
                            <Check className="h-4 w-4 mr-2" />
                            <span className="font-medium">Completed:</span>
                            <span className="ml-2">{formatDateTime(entry.actualFollowUpDate)}</span>
                          </div>
                          {entry.nextFollowUpDate && (
                            <div className="flex items-center text-blue-600 dark:text-blue-400">
                              <ChevronRight className="h-4 w-4 mr-2" />
                              <span className="font-medium">Next Follow-Up:</span>
                              <span className="ml-2">{formatDate(entry.nextFollowUpDate)}</span>
                            </div>
                          )}
                        </div>

                        <div className="mt-3 p-3 bg-white dark:bg-gray-800 rounded border border-gray-200 dark:border-gray-600">
                          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">{entry.notes}</p>
                        </div>

                        <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          By {entry.createdByName} • {formatDateTime(entry.createdAt)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Edit Tab */}
          {activeTab === 'edit' && (
            <form onSubmit={(e) => { e.preventDefault(); handleSaveEdit(); }} className="space-y-6">
              {/* Customer Information */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <User className="h-5 w-5 mr-2 text-blue-600" />
                  Customer Information
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Customer Name *</label>
                    <input
                      type="text"
                      value={editData.customerName}
                      onChange={(e) => setEditData({ ...editData, customerName: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Mobile *</label>
                    <input
                      type="tel"
                      value={editData.customerMobile}
                      onChange={(e) => setEditData({ ...editData, customerMobile: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email *</label>
                    <input
                      type="email"
                      value={editData.customerEmail}
                      onChange={(e) => setEditData({ ...editData, customerEmail: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Lead Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <Package className="h-5 w-5 mr-2 text-blue-600" />
                  Lead Details
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Product Type *</label>
                    <input
                      type="text"
                      value={editData.productType}
                      onChange={(e) => setEditData({ ...editData, productType: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Lead Source *</label>
                    <select
                      value={editData.leadSource}
                      onChange={(e) => setEditData({ ...editData, leadSource: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="Website">Website</option>
                      <option value="Referral">Referral</option>
                      <option value="Social Media">Social Media</option>
                      <option value="Cold Call">Cold Call</option>
                      <option value="Walk-in">Walk-in</option>
                      <option value="Email Campaign">Email Campaign</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Status *</label>
                    <select
                      value={editData.status}
                      onChange={(e) => setEditData({ ...editData, status: e.target.value as Lead['status'] })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="new">New</option>
                      <option value="contacted">Contacted</option>
                      <option value="qualified">Qualified</option>
                      <option value="proposal_sent">Proposal Sent</option>
                      <option value="follow_up">Follow Up</option>
                      <option value="negotiation">Negotiation</option>
                      <option value="won">Won</option>
                      <option value="lost">Lost</option>
                      <option value="canceled">Canceled</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Priority</label>
                    <select
                      value={editData.priority}
                      onChange={(e) => setEditData({ ...editData, priority: e.target.value as 'low' | 'medium' | 'high' })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Estimated Value (₹)</label>
                    <input
                      type="number"
                      value={editData.estimatedValue}
                      onChange={(e) => setEditData({ ...editData, estimatedValue: parseFloat(e.target.value) || 0 })}
                      min="0"
                      step="100"
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Follow-up Schedule */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
                  <Calendar className="h-5 w-5 mr-2 text-blue-600" />
                  Follow-up Schedule
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Follow-up Date *</label>
                    <input
                      type="date"
                      value={editData.followUpDate}
                      onChange={(e) => setEditData({ ...editData, followUpDate: e.target.value })}
                      required
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Next Follow-up Date</label>
                    <input
                      type="date"
                      value={editData.nextFollowUpDate}
                      onChange={(e) => setEditData({ ...editData, nextFollowUpDate: e.target.value })}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>

              {/* Remarks */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Remarks</label>
                <textarea
                  value={editData.remark}
                  onChange={(e) => setEditData({ ...editData, remark: e.target.value })}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
                <button
                  type="button"
                  onClick={() => setActiveTab('details')}
                  className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
