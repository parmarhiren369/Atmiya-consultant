import { X, User, Phone, Mail, Package, Calendar, Tag, DollarSign, AlertCircle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { Lead } from '../types';
import { format } from 'date-fns';

interface LeadDetailsModalProps {
  lead: Lead;
  onClose: () => void;
  onEdit: () => void;
}

export function LeadDetailsModal({ lead, onClose, onEdit }: LeadDetailsModalProps) {
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

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <User className="h-6 w-6 mr-2" />
              Lead Details
            </h2>
            <p className="text-blue-100 mt-1 text-sm">View complete lead information</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Status and Priority */}
          <div className="flex flex-wrap gap-3">
            <span className={`px-4 py-2 rounded-full text-sm font-semibold ${getStatusColor(lead.status)}`}>
              {lead.status.replace('_', ' ').toUpperCase()}
            </span>
            {lead.priority && (
              <span className={`px-4 py-2 rounded-full text-sm font-semibold flex items-center ${getPriorityColor(lead.priority)}`}>
                <AlertCircle className="h-4 w-4 mr-1" />
                {lead.priority.toUpperCase()} Priority
              </span>
            )}
            {lead.isConverted && (
              <span className="px-4 py-2 rounded-full text-sm font-semibold bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 flex items-center">
                <CheckCircle2 className="h-4 w-4 mr-1" />
                Converted
              </span>
            )}
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
                <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.customerMobile}</p>
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Email
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.customerEmail}</p>
              </div>
            </div>
          </div>

          {/* Lead Details */}
          <div className="bg-gray-50 dark:bg-gray-700/50 p-5 rounded-lg space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
              <FileText className="h-5 w-5 mr-2 text-blue-600" />
              Lead Details
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Package className="h-4 w-4 mr-1" />
                  Product Type
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.productType}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Lead Source
                </label>
                <p className="text-base text-gray-900 dark:text-gray-100 mt-1">{lead.leadSource}</p>
              </div>
              {lead.estimatedValue && (
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

          {/* Follow-up Information */}
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
                <FileText className="h-5 w-5 mr-2 text-blue-600" />
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

        {/* Footer Actions */}
        <div className="sticky bottom-0 bg-gray-50 dark:bg-gray-700 px-6 py-4 rounded-b-lg flex justify-end gap-3 border-t border-gray-200 dark:border-gray-600">
          <button
            onClick={onClose}
            className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors"
          >
            Close
          </button>
          <button
            onClick={onEdit}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center"
          >
            <FileText className="h-4 w-4 mr-2" />
            Edit Lead
          </button>
        </div>
      </div>
    </div>
  );
}
