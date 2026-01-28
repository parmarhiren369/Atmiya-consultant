import { useState } from 'react';
import { X, Save, MessageSquare, Calendar, AlertCircle } from 'lucide-react';
import { Lead } from '../types';
import { format } from 'date-fns';

interface FollowUpCompletionModalProps {
  isOpen: boolean;
  lead: Lead;
  onClose: () => void;
  onSubmit: (data: {
    notes: string;
    status: Lead['status'];
    priority: 'low' | 'medium' | 'high';
    remarks: string;
    nextFollowUpDate?: string;
  }) => Promise<void>;
}

export function FollowUpCompletionModal({ isOpen, lead, onClose, onSubmit }: FollowUpCompletionModalProps) {
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState<Lead['status']>(lead.status);
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>(lead.priority || 'medium');
  const [remarks, setRemarks] = useState(lead.remark || '');
  const [nextFollowUpDate, setNextFollowUpDate] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!notes.trim()) {
      alert('Please enter conversation notes');
      return;
    }

    try {
      setIsSubmitting(true);
      await onSubmit({
        notes: notes.trim(),
        status,
        priority,
        remarks: remarks.trim(),
        nextFollowUpDate: nextFollowUpDate || undefined,
      });
      onClose();
    } catch (error) {
      console.error('Error submitting follow-up:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-2xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-green-600 to-teal-600">
            <div className="flex items-center space-x-3">
              <MessageSquare className="h-6 w-6 text-white" />
              <div>
                <h2 className="text-xl font-bold text-white">Complete Follow-Up</h2>
                <p className="text-sm text-green-100">{lead.customerName}</p>
              </div>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-5">
            {/* Conversation Notes */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <MessageSquare className="inline h-4 w-4 mr-1" />
                What was discussed? *
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={4}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Enter detailed notes about the conversation, customer feedback, concerns, requirements, etc..."
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                This will be saved in the lead's follow-up history
              </p>
            </div>

            {/* Status and Priority Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Current Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Current Lead Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as Lead['status'])}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="new">New</option>
                  <option value="contacted">Contacted</option>
                  <option value="qualified">Qualified</option>
                  <option value="proposal_sent">Proposal Sent</option>
                  <option value="follow_up">Follow Up Required</option>
                  <option value="negotiation">In Negotiation</option>
                  <option value="won">Won (Converted)</option>
                  <option value="lost">Lost</option>
                  <option value="canceled">Canceled</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Priority Level
                </label>
                <select
                  value={priority}
                  onChange={(e) => setPriority(e.target.value as 'low' | 'medium' | 'high')}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="low">Low Priority</option>
                  <option value="medium">Medium Priority</option>
                  <option value="high">High Priority</option>
                </select>
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <AlertCircle className="inline h-4 w-4 mr-1" />
                Remarks / Updates
              </label>
              <textarea
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                rows={3}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white resize-none"
                placeholder="Additional remarks, customer requirements, or important notes..."
              />
            </div>

            {/* Next Follow-Up Date */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                <Calendar className="inline h-4 w-4 mr-1" />
                Schedule Next Follow-Up (Optional)
              </label>
              <input
                type="date"
                value={nextFollowUpDate}
                onChange={(e) => setNextFollowUpDate(e.target.value)}
                min={format(new Date(), 'yyyy-MM-dd')}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-green-500 dark:bg-gray-700 dark:text-white"
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Leave empty if no further follow-up is needed
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="px-5 py-2.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex items-center space-x-2 px-5 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                <Save className="h-4 w-4" />
                <span>{isSubmitting ? 'Saving...' : 'Save & Complete'}</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
