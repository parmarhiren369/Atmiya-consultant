import { useState, useEffect } from 'react';
import { Users, Plus, Search, Edit2, Trash2, Eye, FileText, Phone, Mail, IndianRupee, Printer } from 'lucide-react';
import { groupHeadService, GroupHead } from '../services/groupHeadService';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import { Policy } from '../types';

export function GroupHeads() {
  const { user } = useAuth();
  const [groupHeads, setGroupHeads] = useState<GroupHead[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGroupHead, setSelectedGroupHead] = useState<GroupHead | null>(null);
  const [groupPolicies, setGroupPolicies] = useState<Policy[]>([]);
  const [formData, setFormData] = useState({
    groupHeadName: '',
    contactNo: '',
    emailId: '',
    address: '',
    relationshipType: 'Primary',
    notes: '',
  });

  useEffect(() => {
    if (user) {
      loadGroupHeads();
    }
  }, [user]);

  const loadGroupHeads = async () => {
    try {
      setLoading(true);
      const data = await groupHeadService.getGroupHeads(user!.id);
      setGroupHeads(data);
    } catch (error) {
      console.error('Error loading group heads:', error);
      toast.error('Failed to load group heads');
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await groupHeadService.addGroupHead({
        userId: user!.id,
        ...formData,
      });
      toast.success('Group head added successfully!');
      setShowAddModal(false);
      resetForm();
      loadGroupHeads();
    } catch (error) {
      console.error('Error adding group head:', error);
      toast.error('Failed to add group head');
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGroupHead) return;
    
    try {
      await groupHeadService.updateGroupHead(selectedGroupHead.id, formData);
      toast.success('Group head updated successfully!');
      setShowEditModal(false);
      resetForm();
      loadGroupHeads();
    } catch (error) {
      console.error('Error updating group head:', error);
      toast.error('Failed to update group head');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete group head "${name}"? This will not delete the policies, but will remove the group association.`)) {
      return;
    }

    try {
      await groupHeadService.deleteGroupHead(id);
      toast.success('Group head deleted successfully!');
      loadGroupHeads();
    } catch (error) {
      console.error('Error deleting group head:', error);
      toast.error('Failed to delete group head');
    }
  };

  const handleViewDetails = async (groupHead: GroupHead) => {
    setSelectedGroupHead(groupHead);
    try {
      const policies = await groupHeadService.getGroupHeadPolicies(groupHead.id);
      setGroupPolicies(policies);
      setShowDetailsModal(true);
    } catch (error) {
      console.error('Error loading group policies:', error);
      toast.error('Failed to load group policies');
    }
  };

  const openEditModal = (groupHead: GroupHead) => {
    setSelectedGroupHead(groupHead);
    setFormData({
      groupHeadName: groupHead.groupHeadName,
      contactNo: groupHead.contactNo || '',
      emailId: groupHead.emailId || '',
      address: groupHead.address || '',
      relationshipType: groupHead.relationshipType || 'Primary',
      notes: groupHead.notes || '',
    });
    setShowEditModal(true);
  };

  const resetForm = () => {
    setFormData({
      groupHeadName: '',
      contactNo: '',
      emailId: '',
      address: '',
      relationshipType: 'Primary',
      notes: '',
    });
    setSelectedGroupHead(null);
  };

  const handlePrint = () => {
    window.print();
  };

  const filteredGroupHeads = groupHeads.filter(gh =>
    gh.groupHeadName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gh.contactNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    gh.emailId?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalPolicies = groupHeads.reduce((sum, gh) => sum + (gh.totalPolicies || 0), 0);
  const totalPremium = groupHeads.reduce((sum, gh) => sum + (gh.totalPremiumAmount || 0), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <Users className="h-8 w-8 text-blue-600" />
                Group Heads Management
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">
                Organize and track family/corporate policy groups
              </p>
            </div>
            <button
              onClick={() => setShowAddModal(true)}
              className="bg-blue-600 text-white px-6 py-3 rounded-sharp hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm"
            >
              <Plus className="h-5 w-5" />
              Add Group Head
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Group Heads</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{groupHeads.length}</p>
              </div>
              <Users className="h-12 w-12 text-blue-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Policies</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">{totalPolicies}</p>
              </div>
              <FileText className="h-12 w-12 text-green-600" />
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 dark:text-gray-400">Total Premium</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-2">
                  ₹{totalPremium.toLocaleString('en-IN')}
                </p>
              </div>
              <IndianRupee className="h-12 w-12 text-amber-600" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, contact, or email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600 focus:border-blue-600"
            />
          </div>
        </div>

        {/* Group Heads Table */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-4 text-gray-600 dark:text-gray-400">Loading group heads...</p>
            </div>
          ) : filteredGroupHeads.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <p className="text-lg font-medium text-gray-900 dark:text-white">No group heads found</p>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
                {searchTerm ? 'Try adjusting your search' : 'Click "Add Group Head" to create your first group'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-900">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Group Head
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Contact Info
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Policies
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Total Premium
                    </th>
                    <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredGroupHeads.map((groupHead) => (
                    <tr key={groupHead.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <button
                          onClick={() => handleViewDetails(groupHead)}
                          className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 hover:underline transition-colors text-left"
                        >
                          {groupHead.groupHeadName}
                        </button>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                          {groupHead.contactNo && (
                            <div className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {groupHead.contactNo}
                            </div>
                          )}
                          {groupHead.emailId && (
                            <div className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {groupHead.emailId}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                          {groupHead.relationshipType || 'Primary'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          {groupHead.totalPolicies || 0}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="text-sm font-medium text-gray-900 dark:text-white">
                          ₹{(groupHead.totalPremiumAmount || 0).toLocaleString('en-IN')}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleViewDetails(groupHead)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                            title="View Details"
                          >
                            <Eye className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => openEditModal(groupHead)}
                            className="text-green-600 hover:text-green-800 dark:text-green-400 dark:hover:text-green-300"
                            title="Edit"
                          >
                            <Edit2 className="h-5 w-5" />
                          </button>
                          <button
                            onClick={() => handleDelete(groupHead.id, groupHead.groupHeadName)}
                            className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="h-5 w-5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Add Group Head Modal */}
        {showAddModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Add New Group Head</h2>
              </div>
              <form onSubmit={handleAdd} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.groupHeadName}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupHeadName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    placeholder="Enter primary customer name"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                      placeholder="Phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email ID
                    </label>
                    <input
                      type="email"
                      value={formData.emailId}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                      placeholder="Email address"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Relationship Type
                  </label>
                  <select
                    value={formData.relationshipType}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationshipType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Family Head">Family Head</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    rows={2}
                    placeholder="Full address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    rows={3}
                    placeholder="Additional notes..."
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-sharp hover:bg-blue-700 transition-colors"
                  >
                    Add Group Head
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowAddModal(false); resetForm(); }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-sharp hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Modal - Same form as Add */}
        {showEditModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">Edit Group Head</h2>
              </div>
              <form onSubmit={handleEdit} className="p-6 space-y-4">
                {/* Same form fields as Add modal */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Group Head Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.groupHeadName}
                    onChange={(e) => setFormData(prev => ({ ...prev, groupHeadName: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Contact Number
                    </label>
                    <input
                      type="tel"
                      value={formData.contactNo}
                      onChange={(e) => setFormData(prev => ({ ...prev, contactNo: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Email ID
                    </label>
                    <input
                      type="email"
                      value={formData.emailId}
                      onChange={(e) => setFormData(prev => ({ ...prev, emailId: e.target.value }))}
                      className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Relationship Type
                  </label>
                  <select
                    value={formData.relationshipType}
                    onChange={(e) => setFormData(prev => ({ ...prev, relationshipType: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                  >
                    <option value="Primary">Primary</option>
                    <option value="Family Head">Family Head</option>
                    <option value="Corporate">Corporate</option>
                    <option value="Business">Business</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Address
                  </label>
                  <textarea
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    rows={2}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Notes
                  </label>
                  <textarea
                    value={formData.notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-600"
                    rows={3}
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-sharp hover:bg-blue-700 transition-colors"
                  >
                    Update Group Head
                  </button>
                  <button
                    type="button"
                    onClick={() => { setShowEditModal(false); resetForm(); }}
                    className="flex-1 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-sharp hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Details Modal showing policies */}
        {showDetailsModal && selectedGroupHead && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 print:block print:relative print:bg-transparent print:p-0">
            <div className="bg-white dark:bg-gray-800 rounded-card max-w-6xl w-full max-h-[90vh] overflow-y-auto printable-section print:max-h-none print:max-w-none print:shadow-none">
              {/* Print Header - Only visible when printing */}
              <div className="hidden print:block mb-3 pt-0">
                <div className="flex justify-between items-center border-b-2 border-gray-800 pb-1">
                  <h1 className="text-base font-bold text-gray-900">{selectedGroupHead.groupHeadName} - Group Details</h1>
                  <p className="text-xs text-gray-600">Generated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}</p>
                </div>
              </div>
              
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center no-print print:hidden">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white">
                  {selectedGroupHead.groupHeadName} - Group Details
                </h2>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-sharp hover:bg-blue-700 transition-colors"
                    title="Print Group Details"
                  >
                    <Printer className="w-4 h-4" />
                    Print
                  </button>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 text-2xl px-2"
                  >
                    ×
                  </button>
                </div>
              </div>
              <div className="p-6 space-y-6 print:p-4">
                {/* Group Info */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 bg-gray-50 dark:bg-gray-900 p-4 rounded-sharp print:block print:p-0 print:bg-white">
                  {/* Print Layout - Compact Horizontal */}
                  <div className="hidden print:block border-2 border-gray-800 p-3 mb-4">
                    <div className="grid grid-cols-6 gap-2 text-sm">
                      <div className="col-span-1">
                        <span className="font-semibold">Type:</span> {selectedGroupHead.relationshipType || 'Primary'}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Contact:</span> {selectedGroupHead.contactNo || 'N/A'}
                      </div>
                      <div className="col-span-2">
                        <span className="font-semibold">Email:</span> {selectedGroupHead.emailId || 'N/A'}
                      </div>
                      <div className="col-span-1 text-right">
                        <span className="font-semibold">Policies:</span> {selectedGroupHead.totalPolicies || 0}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-sm mt-2 pt-2 border-t border-gray-300">
                      <div>
                        <span className="font-semibold">Total Premium:</span> ₹{(selectedGroupHead.totalPremiumAmount || 0).toLocaleString('en-IN')}
                      </div>
                      {selectedGroupHead.address && (
                        <div>
                          <span className="font-semibold">Address:</span> {selectedGroupHead.address}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Screen Layout - Card Grid */}
                  <div className="print:hidden">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Relationship Type</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.relationshipType || 'Primary'}</p>
                    </div>
                  </div>
                  <div className="print:hidden">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Contact</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.contactNo || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="print:hidden">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Email</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.emailId || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="print:hidden">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Policies</p>
                      <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.totalPolicies || 0}</p>
                    </div>
                  </div>
                  <div className="print:hidden">
                    <div>
                      <p className="text-sm text-gray-600 dark:text-gray-400">Total Premium</p>
                      <p className="text-gray-900 dark:text-white font-medium">
                        ₹{(selectedGroupHead.totalPremiumAmount || 0).toLocaleString('en-IN')}
                      </p>
                    </div>
                  </div>
                  {selectedGroupHead.address && (
                    <div className="md:col-span-2 lg:col-span-3 print:hidden">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Address</p>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.address}</p>
                      </div>
                    </div>
                  )}
                  {selectedGroupHead.notes && (
                    <div className="md:col-span-2 lg:col-span-3 print:hidden">
                      <div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">Notes</p>
                        <p className="text-gray-900 dark:text-white font-medium">{selectedGroupHead.notes}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Policies Table */}
                <div className="print:mt-2">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 print:text-sm print:mb-2 print:font-bold print:border-b-2 print:border-gray-800 print:pb-1">
                    Policies ({groupPolicies.length})
                  </h3>
                  {groupPolicies.length === 0 ? (
                    <p className="text-center py-8 text-gray-600 dark:text-gray-400 print:py-4 print:text-sm">
                      No policies found for this group head
                    </p>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full border-collapse">
                        <thead className="bg-gray-50 dark:bg-gray-900">
                          <tr>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Policyholder</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Policy Number</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Type</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Company</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Start Date</th>
                            <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 border-b">End Date</th>
                            <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 border-b">Premium</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                          {groupPolicies.map((policy: any) => (
                            <tr key={policy.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                              <td className="px-4 py-3 text-sm text-gray-900 dark:text-white border-b">{policy.policyholder_name}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b">{policy.policy_number}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b">{policy.policy_type}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b">{policy.insurance_company}</td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b">
                                {policy.policy_start_date ? new Date(policy.policy_start_date).toLocaleDateString('en-IN') : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400 border-b">
                                {policy.policy_end_date ? new Date(policy.policy_end_date).toLocaleDateString('en-IN') : 'N/A'}
                              </td>
                              <td className="px-4 py-3 text-sm text-right text-gray-900 dark:text-white border-b">
                                ₹{parseFloat(policy.premium_amount || 0).toLocaleString('en-IN')}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* Print Styles */}
      <style>{`
        @media print {
          @page {
            margin: 0.8cm 0.5cm;
            size: A4 portrait;
          }
          
          /* Hide everything on the page */
          body * {
            visibility: hidden !important;
          }
          
          /* Only show the printable section */
          .printable-section,
          .printable-section * {
            visibility: visible !important;
          }
          
          /* Position printable section at top of page - fixed positioning */
          .printable-section {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            max-width: 100% !important;
            max-height: 100vh !important;
            overflow: hidden !important;
            box-shadow: none !important;
            border-radius: 0 !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            transform: none !important;
            page-break-after: avoid !important;
          }
          
          /* Force white backgrounds */
          body {
            background: white !important;
          }
          
          /* Compact spacing for print */
          .printable-section h1 {
            font-size: 16px !important;
            margin: 0 !important;
            line-height: 1.3 !important;
          }
          
          .printable-section p {
            margin: 0 !important;
            line-height: 1.4 !important;
          }
          
          /* Remove dark mode backgrounds */
          .printable-section .dark\\:bg-gray-800,
          .printable-section .dark\\:bg-gray-900,
          .printable-section .bg-gray-50 {
            background: white !important;
          }
          
          /* Increased font size for info box */
          .printable-section .border-2 {
            border: 2px solid #1f2937 !important;
            padding: 10px !important;
            margin-bottom: 8px !important;
            margin-top: 0 !important;
          }
          
          .printable-section .border-2 .text-sm {
            font-size: 13px !important;
          }
          
          /* Table styling for print - compact */
          .printable-section table {
            border-collapse: collapse !important;
            width: 100% !important;
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
            font-size: 20px !important;
            margin-top: 4px !important;
            margin-bottom: 0 !important;
          }
          
          .printable-section thead {
            display: table-header-group !important;
            background-color: #e5e7eb !important;
          }
          
          .printable-section tbody {
            page-break-inside: avoid !important;
          }
          
          .printable-section tr {
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          }
          
          .printable-section th {
            background-color: #e5e7eb !important;
            font-weight: 700 !important;
            padding: 6px 8px !important;
            border: 1px solid #374151 !important;
            color: #000 !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          .printable-section td {
            padding: 5px 8px !important;
            border: 1px solid #6b7280 !important;
            color: #000 !important;
            font-size: 14px !important;
            line-height: 1.5 !important;
          }
          
          /* Header border */
          .printable-section .border-b-2 {
            border-bottom: 2px solid #1f2937 !important;
            padding-bottom: 3px !important;
            margin-bottom: 8px !important;
          }
          
          /* Policies heading */
          .printable-section h3 {
            font-size: 14px !important;
            margin: 0 0 6px 0 !important;
            padding-bottom: 3px !important;
            line-height: 1.3 !important;
          }
          
          /* Prevent orphaned content */
          .printable-section > div {
            page-break-after: avoid !important;
          }
        }
      `}</style>
    </div>
  );
}

