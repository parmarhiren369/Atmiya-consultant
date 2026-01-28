import React, { useState } from 'react';
import { X, Save, User, Phone, Mail, Package, Calendar, Tag, DollarSign, AlertCircle } from 'lucide-react';
import { Lead, LeadFormData } from '../types';
import { format } from 'date-fns';

interface EditLeadModalProps {
  lead: Lead;
  onClose: () => void;
  onSave: (leadData: LeadFormData) => Promise<void>;
}

export function EditLeadModal({ lead, onClose, onSave }: EditLeadModalProps) {
  const [formData, setFormData] = useState<LeadFormData>({
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

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSave(formData);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'estimatedValue' ? parseFloat(value) || 0 : value
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 text-white p-6 rounded-t-lg flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold flex items-center">
              <User className="h-6 w-6 mr-2" />
              Edit Lead
            </h2>
            <p className="text-blue-100 mt-1 text-sm">Update lead information</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 rounded-full p-2 transition-colors"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Customer Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center border-b border-gray-200 dark:border-gray-600 pb-2">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              Customer Information
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="customerName" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Customer Name *
                </label>
                <input
                  type="text"
                  id="customerName"
                  name="customerName"
                  value={formData.customerName}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="customerMobile" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Phone className="h-4 w-4 mr-1" />
                  Mobile *
                </label>
                <input
                  type="tel"
                  id="customerMobile"
                  name="customerMobile"
                  value={formData.customerMobile}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="md:col-span-2">
                <label htmlFor="customerEmail" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Mail className="h-4 w-4 mr-1" />
                  Email *
                </label>
                <input
                  type="email"
                  id="customerEmail"
                  name="customerEmail"
                  value={formData.customerEmail}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="productType" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Product Type *
                </label>
                <input
                  type="text"
                  id="productType"
                  name="productType"
                  value={formData.productType}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                  placeholder="e.g., TW, FOUR WHEELER, HEALTH"
                />
              </div>
              <div>
                <label htmlFor="leadSource" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <Tag className="h-4 w-4 mr-1" />
                  Lead Source *
                </label>
                <select
                  id="leadSource"
                  name="leadSource"
                  value={formData.leadSource}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Status *
                </label>
                <select
                  id="status"
                  name="status"
                  value={formData.status}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={formData.priority}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </div>
              <div>
                <label htmlFor="estimatedValue" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 flex items-center">
                  <DollarSign className="h-4 w-4 mr-1" />
                  Estimated Value (₹)
                </label>
                <input
                  type="number"
                  id="estimatedValue"
                  name="estimatedValue"
                  value={formData.estimatedValue}
                  onChange={handleChange}
                  min="0"
                  step="100"
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
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
                <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Follow-up Date *
                </label>
                <input
                  type="date"
                  id="followUpDate"
                  name="followUpDate"
                  value={formData.followUpDate}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label htmlFor="nextFollowUpDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Next Follow-up Date
                </label>
                <input
                  type="date"
                  id="nextFollowUpDate"
                  name="nextFollowUpDate"
                  value={formData.nextFollowUpDate}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>
            </div>
          </div>

          {/* Remarks */}
          <div>
            <label htmlFor="remark" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Remarks
            </label>
            <textarea
              id="remark"
              name="remark"
              value={formData.remark}
              onChange={handleChange}
              rows={4}
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
              placeholder="Add any additional notes or comments..."
            />
          </div>

          {/* Footer Actions */}
          <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 dark:border-gray-600">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 font-medium transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors flex items-center disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
