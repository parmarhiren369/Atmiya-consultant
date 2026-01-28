import { useState, useEffect } from 'react';
import { X, Calendar, Phone, Mail, Clock, Printer, RefreshCw, CheckCircle, AlertCircle, Package } from 'lucide-react';
import { Lead } from '../types';
import { leadService } from '../services/leadService';
import toast from 'react-hot-toast';
import { format, isPast, isToday, isTomorrow, isThisWeek } from 'date-fns';

interface FollowUpLeadsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userId: string;
  userDisplayName: string;
  onUpdate: () => void;
}

export function FollowUpLeadsModal({ isOpen, onClose, userId, userDisplayName, onUpdate }: FollowUpLeadsModalProps) {
  const [followUpLeads, setFollowUpLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'overdue' | 'today' | 'tomorrow' | 'week'>('all');

  useEffect(() => {
    if (isOpen) {
      loadFollowUpLeads();
    }
  }, [isOpen]);

  const loadFollowUpLeads = async () => {
    try {
      setLoading(true);
      const allLeads = await leadService.getLeads(userId);
      
      // Filter leads that need follow-up
      const filtered = allLeads.filter(lead => {
        // Include leads with follow_up status or leads with upcoming/past follow-up dates
        return (
          lead.status === 'follow_up' ||
          lead.nextFollowUpDate ||
          lead.followUpDate
        );
      });

      // Sort by follow-up date (earliest first)
      filtered.sort((a, b) => {
        const dateA = a.nextFollowUpDate || a.followUpDate;
        const dateB = b.nextFollowUpDate || b.followUpDate;
        return new Date(dateA).getTime() - new Date(dateB).getTime();
      });

      setFollowUpLeads(filtered);
    } catch (error) {
      console.error('Error loading follow-up leads:', error);
      toast.error('Failed to load follow-up leads');
    } finally {
      setLoading(false);
    }
  };

  const getFilteredLeads = () => {
    switch (filter) {
      case 'overdue':
        return followUpLeads.filter(lead => {
          const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
          return isPast(followUpDate) && !isToday(followUpDate);
        });
      case 'today':
        return followUpLeads.filter(lead => {
          const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
          return isToday(followUpDate);
        });
      case 'tomorrow':
        return followUpLeads.filter(lead => {
          const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
          return isTomorrow(followUpDate);
        });
      case 'week':
        return followUpLeads.filter(lead => {
          const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
          return isThisWeek(followUpDate);
        });
      default:
        return followUpLeads;
    }
  };

  const handleQuickStatusChange = async (leadId: string, newStatus: Lead['status']) => {
    try {
      await leadService.updateLead(leadId, { status: newStatus }, userId, userDisplayName);
      toast.success('Status updated successfully!');
      loadFollowUpLeads();
      onUpdate(); // Update parent component
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const handleQuickPriorityChange = async (leadId: string, newPriority: 'low' | 'medium' | 'high') => {
    try {
      await leadService.updateLead(leadId, { priority: newPriority }, userId, userDisplayName);
      toast.success('Priority updated successfully!');
      loadFollowUpLeads();
      onUpdate(); // Update parent component
    } catch (error) {
      console.error('Error updating priority:', error);
      toast.error('Failed to update priority');
    }
  };

  const handleMarkAsCompleted = async (leadId: string) => {
    try {
      await leadService.updateLead(leadId, { 
        status: 'contacted',
        nextFollowUpDate: undefined 
      }, userId, userDisplayName);
      toast.success('Follow-up marked as completed!');
      loadFollowUpLeads();
      onUpdate();
    } catch (error) {
      console.error('Error marking as completed:', error);
      toast.error('Failed to mark as completed');
    }
  };

  const handleReschedule = async (leadId: string, newDate: string) => {
    try {
      await leadService.updateLead(leadId, { 
        nextFollowUpDate: newDate,
        status: 'follow_up'
      }, userId, userDisplayName);
      toast.success('Follow-up rescheduled!');
      loadFollowUpLeads();
      onUpdate();
    } catch (error) {
      console.error('Error rescheduling:', error);
      toast.error('Failed to reschedule');
    }
  };

  const handlePrint = () => {
    const filteredLeads = getFilteredLeads();
    
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Follow-Up Leads - ${format(new Date(), 'dd MMM yyyy')}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              margin: 20px;
              color: #333;
            }
            h1 {
              color: #2563eb;
              border-bottom: 3px solid #2563eb;
              padding-bottom: 10px;
              margin-bottom: 20px;
            }
            .header-info {
              margin-bottom: 20px;
              font-size: 14px;
              color: #666;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 20px;
            }
            th {
              background-color: #2563eb;
              color: white;
              padding: 12px;
              text-align: left;
              font-size: 12px;
              text-transform: uppercase;
            }
            td {
              padding: 10px;
              border-bottom: 1px solid #ddd;
              font-size: 13px;
            }
            tr:hover {
              background-color: #f5f5f5;
            }
            .status-badge {
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              display: inline-block;
            }
            .priority-badge {
              padding: 4px 8px;
              border-radius: 12px;
              font-size: 11px;
              font-weight: bold;
              display: inline-block;
            }
            .overdue {
              background-color: #fee2e2;
              color: #dc2626;
            }
            .today {
              background-color: #fef3c7;
              color: #f59e0b;
            }
            .upcoming {
              background-color: #dbeafe;
              color: #2563eb;
            }
            .high-priority {
              background-color: #fee2e2;
              color: #dc2626;
            }
            .medium-priority {
              background-color: #fef3c7;
              color: #f59e0b;
            }
            .low-priority {
              background-color: #d1fae5;
              color: #059669;
            }
            .footer {
              margin-top: 30px;
              padding-top: 20px;
              border-top: 1px solid #ddd;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <h1>Follow-Up Leads Report</h1>
          <div class="header-info">
            <p><strong>Generated:</strong> ${format(new Date(), 'dd MMM yyyy, hh:mm a')}</p>
            <p><strong>Total Leads:</strong> ${filteredLeads.length}</p>
            <p><strong>Filter:</strong> ${filter.charAt(0).toUpperCase() + filter.slice(1)}</p>
          </div>
          
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>Product</th>
                <th>Follow-Up Date</th>
                <th>Status</th>
                <th>Priority</th>
                <th>Estimated Value</th>
                <th>Remarks</th>
              </tr>
            </thead>
            <tbody>
              ${filteredLeads.map(lead => {
                const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
                const isOverdue = isPast(followUpDate) && !isToday(followUpDate);
                const isTodayDate = isToday(followUpDate);
                const dateClass = isOverdue ? 'overdue' : isTodayDate ? 'today' : 'upcoming';
                const priorityClass = lead.priority === 'high' ? 'high-priority' : 
                                     lead.priority === 'medium' ? 'medium-priority' : 'low-priority';
                
                return `
                  <tr>
                    <td><strong>${lead.customerName}</strong></td>
                    <td>
                      ${lead.customerMobile}<br>
                      <small>${lead.customerEmail}</small>
                    </td>
                    <td>${lead.productType}</td>
                    <td>
                      <span class="status-badge ${dateClass}">
                        ${format(followUpDate, 'dd MMM yyyy')}
                      </span>
                    </td>
                    <td>${lead.status.replace('_', ' ').toUpperCase()}</td>
                    <td>
                      <span class="priority-badge ${priorityClass}">
                        ${lead.priority?.toUpperCase() || 'MEDIUM'}
                      </span>
                    </td>
                    <td>${lead.estimatedValue ? '₹' + lead.estimatedValue.toLocaleString('en-IN') : '-'}</td>
                    <td>${lead.remark || '-'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
          
          <div class="footer">
            <p>This report was generated automatically by OnClicks Policy Manager</p>
            <p>© ${new Date().getFullYear()} - All rights reserved</p>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
    }, 250);
  };

  const getDateBadgeColor = (date: Date | string) => {
    const followUpDate = new Date(date);
    if (isPast(followUpDate) && !isToday(followUpDate)) {
      return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400';
    }
    if (isToday(followUpDate)) {
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400';
    }
    if (isTomorrow(followUpDate)) {
      return 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400';
    }
    return 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400';
  };

  const getStatusColor = (status: Lead['status']) => {
    const colors = {
      new: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
      contacted: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
      qualified: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400',
      proposal_sent: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400',
      follow_up: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
      negotiation: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
      won: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
      lost: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
      canceled: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
    };
    return colors[status] || colors.new;
  };

  const getPriorityColor = (priority?: 'low' | 'medium' | 'high') => {
    const colors = {
      low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
      medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
      high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
    };
    return priority ? colors[priority] : colors.medium;
  };

  if (!isOpen) return null;

  const filteredLeads = getFilteredLeads();
  const overdueCount = followUpLeads.filter(lead => {
    const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
    return isPast(followUpDate) && !isToday(followUpDate);
  }).length;
  const todayCount = followUpLeads.filter(lead => {
    const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
    return isToday(followUpDate);
  }).length;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>

        <div className="inline-block w-full max-w-7xl my-8 text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-2xl rounded-2xl">
          {/* Header */}
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-600 to-purple-600">
            <div className="flex items-center space-x-3">
              <Calendar className="h-6 w-6 text-white" />
              <h2 className="text-2xl font-bold text-white">Follow-Up Leads</h2>
            </div>
            <button onClick={onClose} className="text-white hover:text-gray-200 transition-colors">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Stats Bar */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">{followUpLeads.length}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Total Follow-Ups</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-red-600 dark:text-red-400">{overdueCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Overdue</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{todayCount}</div>
                <div className="text-sm text-gray-600 dark:text-gray-400">Today</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {followUpLeads.filter(l => l.priority === 'high').length}
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400">High Priority</div>
              </div>
            </div>
          </div>

          {/* Filters & Actions */}
          <div className="px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  All ({followUpLeads.length})
                </button>
                <button
                  onClick={() => setFilter('overdue')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'overdue'
                      ? 'bg-red-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Overdue ({overdueCount})
                </button>
                <button
                  onClick={() => setFilter('today')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'today'
                      ? 'bg-yellow-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Today ({todayCount})
                </button>
                <button
                  onClick={() => setFilter('tomorrow')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'tomorrow'
                      ? 'bg-orange-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  Tomorrow
                </button>
                <button
                  onClick={() => setFilter('week')}
                  className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                    filter === 'week'
                      ? 'bg-purple-600 text-white'
                      : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  This Week
                </button>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={loadFollowUpLeads}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                >
                  <RefreshCw className="h-4 w-4" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={handlePrint}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                >
                  <Printer className="h-4 w-4" />
                  <span>Print</span>
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="p-6 max-h-[calc(100vh-400px)] overflow-y-auto">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600 dark:text-gray-400">Loading follow-up leads...</p>
                </div>
              </div>
            ) : filteredLeads.length === 0 ? (
              <div className="text-center py-12">
                <Calendar className="h-16 w-16 mx-auto text-gray-400 dark:text-gray-600 mb-4" />
                <p className="text-lg font-medium text-gray-900 dark:text-white">No follow-up leads found</p>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                  {filter === 'all' 
                    ? 'All leads are up to date!' 
                    : `No leads match the "${filter}" filter`}
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredLeads.map(lead => {
                  const followUpDate = new Date(lead.nextFollowUpDate || lead.followUpDate);
                  const isOverdue = isPast(followUpDate) && !isToday(followUpDate);
                  const isTodayDate = isToday(followUpDate);

                  return (
                    <div
                      key={lead.id}
                      className={`border-2 rounded-lg p-5 transition-all hover:shadow-lg ${
                        isOverdue
                          ? 'border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-900/10'
                          : isTodayDate
                          ? 'border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-900/10'
                          : 'border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-2">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{lead.customerName}</h3>
                            <span className={`px-3 py-1 text-xs font-semibold rounded-full ${getDateBadgeColor(followUpDate)}`}>
                              {isOverdue && <AlertCircle className="inline h-3 w-3 mr-1" />}
                              {isTodayDate && <Clock className="inline h-3 w-3 mr-1" />}
                              {format(followUpDate, 'dd MMM yyyy')}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <Phone className="h-4 w-4" />
                              <span>{lead.customerMobile}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <Mail className="h-4 w-4" />
                              <span className="truncate">{lead.customerEmail}</span>
                            </div>
                            <div className="flex items-center space-x-2 text-gray-600 dark:text-gray-400">
                              <Package className="h-4 w-4" />
                              <span>{lead.productType}</span>
                            </div>
                          </div>

                          {lead.remark && (
                            <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                              <p className="text-sm text-gray-700 dark:text-gray-300"><strong>Remark:</strong> {lead.remark}</p>
                            </div>
                          )}

                          {lead.estimatedValue && (
                            <div className="mt-2 text-sm font-semibold text-green-600 dark:text-green-400">
                              Estimated Value: ₹{lead.estimatedValue.toLocaleString('en-IN')}
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col items-end space-y-2 ml-4">
                          <select
                            value={lead.status}
                            onChange={(e) => handleQuickStatusChange(lead.id, e.target.value as Lead['status'])}
                            className={`px-3 py-1 text-xs font-medium rounded-full border-2 cursor-pointer ${getStatusColor(lead.status)}`}
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

                          <select
                            value={lead.priority || 'medium'}
                            onChange={(e) => handleQuickPriorityChange(lead.id, e.target.value as 'low' | 'medium' | 'high')}
                            className={`px-3 py-1 text-xs font-medium rounded-full border-2 cursor-pointer ${getPriorityColor(lead.priority)}`}
                          >
                            <option value="low">Low Priority</option>
                            <option value="medium">Medium Priority</option>
                            <option value="high">High Priority</option>
                          </select>
                        </div>
                      </div>

                      {/* Quick Actions */}
                      <div className="flex items-center space-x-2 pt-3 border-t border-gray-200 dark:border-gray-700">
                        <button
                          onClick={() => handleMarkAsCompleted(lead.id)}
                          className="flex items-center space-x-1 px-3 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Mark Completed</span>
                        </button>

                        <input
                          type="date"
                          min={format(new Date(), 'yyyy-MM-dd')}
                          onChange={(e) => handleReschedule(lead.id, e.target.value)}
                          className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          placeholder="Reschedule"
                        />

                        <a
                          href={`tel:${lead.customerMobile}`}
                          className="flex items-center space-x-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Phone className="h-4 w-4" />
                          <span>Call</span>
                        </a>

                        <a
                          href={`mailto:${lead.customerEmail}`}
                          className="flex items-center space-x-1 px-3 py-2 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 transition-colors"
                        >
                          <Mail className="h-4 w-4" />
                          <span>Email</span>
                        </a>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-6 py-4 bg-gray-50 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Showing {filteredLeads.length} of {followUpLeads.length} follow-up leads
              </p>
              <button
                onClick={onClose}
                className="px-6 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
