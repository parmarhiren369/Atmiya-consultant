import React, { useState, useMemo } from 'react';
import { usePolicies } from '../context/PolicyContext';
import { Policy } from '../types';
import { 
  FileText, 
  ExternalLink, 
  CheckCircle, 
  XCircle, 
  Calendar,
  DollarSign,
  Building,
  User,
  AlertCircle,
  Search,
  Filter
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// Helper function to safely format dates
const safeFormatDate = (dateValue: string | Date | undefined | null, formatString: string, fallback: string = 'N/A'): string => {
  if (!dateValue) return fallback;
  
  try {
    let date: Date;
    
    if (dateValue instanceof Date) {
      date = dateValue;
    } else {
      date = new Date(dateValue);
    }
    
    // Check if the date is valid
    if (isNaN(date.getTime())) {
      return fallback;
    }
    return format(date, formatString);
  } catch (error) {
    console.warn('Invalid date formatting:', dateValue, error);
    return fallback;
  }
};

export function Claims() {
  const { policies, loading, error, refreshPolicies, updatePolicy } = usePolicies();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [claimStatusFilter, setClaimStatusFilter] = useState('');
  const [showSettlementModal, setShowSettlementModal] = useState(false);
  const [showClaimOptionsModal, setShowClaimOptionsModal] = useState(false);
  const [selectedPolicyId, setSelectedPolicyId] = useState<string>('');
  const [settlementAmount, setSettlementAmount] = useState('');
  const [settlementDate, setSettlementDate] = useState('');

  // Get unique companies for filter
  const companies = useMemo(() => 
    [...new Set(policies.map(p => p.insuranceCompany))].sort()
  , [policies]);

  // Filter policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      const matchesSearch = 
        policy.policyholderName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.policyNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        policy.insuranceCompany.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesCompany = !selectedCompany || policy.insuranceCompany === selectedCompany;
      
      let matchesClaimStatus = true;
      
      if (claimStatusFilter === 'settled') {
        matchesClaimStatus = policy.hasClaimSettled === true;
      } else if (claimStatusFilter === 'not-settled') {
        matchesClaimStatus = policy.hasClaimSettled !== true;
      } else if (claimStatusFilter === 'in-progress') {
        matchesClaimStatus = policy.claimStatus === 'in-progress';
      } else if (claimStatusFilter === 'last-year-claim') {
        matchesClaimStatus = policy.hasClaimLastYear === true;
      }
      
      return matchesSearch && matchesCompany && matchesClaimStatus;
    });
  }, [policies, searchTerm, selectedCompany, claimStatusFilter]);

  const handleClaimStatusToggle = async (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;
    
    // If claim is already settled, show settlement details
    if (policy.hasClaimSettled) {
      toast.success(`Claim already settled for ₹${policy.settledAmount} on ${safeFormatDate(policy.settlementDate, 'MMM dd, yyyy')}`);
      return;
    }

    // If claim is in progress, show settlement modal directly
    if (policy.claimStatus === 'in-progress') {
      setSelectedPolicyId(policyId);
      setSettlementDate(new Date().toISOString().split('T')[0]);
      setShowSettlementModal(true);
      return;
    }

    // If no claim status, show options modal
    setSelectedPolicyId(policyId);
    setShowClaimOptionsModal(true);
  };

  const handleMarkAsInProgress = async () => {
    if (!selectedPolicyId) return;

    try {
      await updatePolicy(selectedPolicyId, {
        claimStatus: 'in-progress'
      });
      
      toast.success('Claim marked as in progress');
      setShowClaimOptionsModal(false);
      setSelectedPolicyId('');
    } catch (error) {
      console.error('Error marking claim as in progress:', error);
      toast.error('Failed to mark claim as in progress');
    }
  };

  const handleMarkAsSettled = () => {
    setShowClaimOptionsModal(false);
    setSettlementDate(new Date().toISOString().split('T')[0]);
    setShowSettlementModal(true);
  };

  const handleSettlementSubmit = async () => {
    if (!settlementAmount || isNaN(Number(settlementAmount)) || Number(settlementAmount) <= 0) {
      toast.error('Please enter a valid settlement amount');
      return;
    }
    
    if (!settlementDate) {
      toast.error('Please select the settlement date');
      return;
    }
    
    try {
      await updatePolicy(selectedPolicyId, {
        hasClaimSettled: true,
        claimStatus: 'settled',
        settledAmount: settlementAmount,
        settlementDate: settlementDate
      });
      
      toast.success(`Claim settled for ₹${Number(settlementAmount).toLocaleString()} on ${safeFormatDate(settlementDate, 'MMM dd, yyyy')}`);
      
      // Close modal and reset
      setShowSettlementModal(false);
      setSelectedPolicyId('');
      setSettlementAmount('');
      setSettlementDate('');
    } catch (error) {
      console.error('Error settling claim:', error);
      toast.error('Failed to settle claim');
    }
  };

  const handleSettlementCancel = () => {
    setShowSettlementModal(false);
    setShowClaimOptionsModal(false);
    setSelectedPolicyId('');
    setSettlementAmount('');
    setSettlementDate('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSettlementSubmit();
    } else if (e.key === 'Escape') {
      handleSettlementCancel();
    }
  };

  const handleLastYearClaimToggle = async (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;
    
    const hasClaimLastYear = !policy.hasClaimLastYear;
    
    try {
      await updatePolicy(policyId, {
        hasClaimLastYear,
        // If toggling to true and no existing data, set sample data
        lastClaimDate: hasClaimLastYear && !policy.lastClaimDate 
          ? '2023-08-15' 
          : policy.lastClaimDate,
        lastClaimAmount: hasClaimLastYear && !policy.lastClaimAmount 
          ? '25000' 
          : policy.lastClaimAmount
      });
      
      toast.success(`Last year claim status ${hasClaimLastYear ? 'added' : 'removed'}`);
    } catch (error) {
      console.error('Error updating last year claim status:', error);
      toast.error('Failed to update last year claim status');
    }
  };

  const handleClaimDataUpdate = async (policyId: string, field: 'lastClaimDate' | 'lastClaimAmount' | 'settledAmount', value: string) => {
    try {
      await updatePolicy(policyId, {
        [field]: value
      });
    } catch (error) {
      console.error('Error updating claim data:', error);
      toast.error('Failed to update claim data');
    }
  };

  const PolicyClaimCard = ({ policy }: { policy: Policy }) => {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
              {policy.policyholderName}
            </h3>
            <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
              <div className="flex items-center">
                <Building className="h-4 w-4 mr-2" />
                <span>{policy.insuranceCompany}</span>
              </div>
              <div className="flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                <span>{policy.policyNumber}</span>
              </div>
              <div className="flex items-center">
                <Calendar className="h-4 w-4 mr-2" />
                <span>Expires: {safeFormatDate(policy.expiryDate, 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex items-center">
                <DollarSign className="h-4 w-4 mr-2" />
                <span>Premium: ₹{(policy.premiumAmount || 0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          
          <div className="flex flex-col items-end space-y-2">
            <span className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${
              policy.policyType === 'Health' ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200' :
              policy.policyType === 'Vehicle' ? 'bg-blue-100 dark:bg-blue-800 text-blue-800 dark:text-blue-200' :
              'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200'
            }`}>
              {policy.policyType}
            </span>
            
            {/* Individual Document Folder Button */}
            <a
              href={policy.documentsFolderLink || `https://drive.google.com/drive/folders/${policy.policyholderName.replace(/\s+/g, '-').toLowerCase()}-documents`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center px-3 py-2 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 transition-colors duration-200 shadow-sm hover:shadow-md"
            >
              <ExternalLink className="h-3 w-3 mr-1" />
              Documents
            </a>
          </div>
        </div>

        {/* Claim Status Section */}
        <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
          {/* Current Claim Status */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg transition-colors duration-200">
            <div>
                              <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Claim Settled</label>
              <p className="text-xs text-gray-500 dark:text-gray-400">Mark if this policy has settled claims</p>
              {policy.hasClaimSettled && policy.settledAmount && (
                <div className="mt-1">
                  <p className="text-xs text-green-600 dark:text-green-400 font-medium">
                    Settled for ₹{Number(policy.settledAmount).toLocaleString()}
                  </p>
                  {policy.settlementDate && (
                    <p className="text-xs text-green-500 dark:text-green-400">
                      on {safeFormatDate(policy.settlementDate, 'MMM dd, yyyy')}
                    </p>
                  )}
                </div>
              )}
            </div>
            <button
              onClick={() => handleClaimStatusToggle(policy.id)}
              className={`flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                policy.hasClaimSettled
                  ? 'bg-green-100 dark:bg-green-800 text-green-800 dark:text-green-200 hover:bg-green-200 dark:hover:bg-green-700'
                  : policy.claimStatus === 'in-progress'
                  ? 'bg-yellow-100 dark:bg-yellow-800 text-yellow-800 dark:text-yellow-200 hover:bg-yellow-200 dark:hover:bg-yellow-700'
                  : 'bg-red-100 dark:bg-red-800 text-red-800 dark:text-red-200 hover:bg-red-200 dark:hover:bg-red-700'
              }`}
            >
              {policy.hasClaimSettled ? (
                <>
                  <CheckCircle className="h-4 w-4 mr-1" />
                  Settled
                </>
              ) : policy.claimStatus === 'in-progress' ? (
                <>
                  <AlertCircle className="h-4 w-4 mr-1" />
                  In Progress
                </>
              ) : (
                <>
                  <XCircle className="h-4 w-4 mr-1" />
                  Start Claim
                </>
              )}
            </button>
          </div>

          {/* Last Year Claim Section */}
          <div className="p-3 bg-blue-50 dark:bg-gray-700 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div>
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Had Claim Last Year</label>
                <p className="text-xs text-gray-500 dark:text-gray-400">Track previous year's claim history</p>
              </div>
              <button
                onClick={() => handleLastYearClaimToggle(policy.id)}
                className={`flex items-center px-3 py-1 rounded-full text-sm font-medium transition-colors duration-200 ${
                  policy.hasClaimLastYear
                    ? 'bg-orange-100 dark:bg-orange-800 text-orange-800 dark:text-orange-200 hover:bg-orange-200 dark:hover:bg-orange-700'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {policy.hasClaimLastYear ? (
                  <>
                    <AlertCircle className="h-4 w-4 mr-1" />
                    Yes
                  </>
                ) : (
                  <>
                    <XCircle className="h-4 w-4 mr-1" />
                    No
                  </>
                )}
              </button>
            </div>

            {/* Last Year Claim Details */}
            {policy.hasClaimLastYear && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Claim Date
                  </label>
                  <input
                    type="date"
                    value={policy.lastClaimDate || ''}
                    onChange={(e) => handleClaimDataUpdate(policy.id, 'lastClaimDate', e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Claim Amount (₹)
                  </label>
                  <input
                    type="number"
                    value={policy.lastClaimAmount || ''}
                    onChange={(e) => handleClaimDataUpdate(policy.id, 'lastClaimAmount', e.target.value)}
                    placeholder="Enter amount"
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const StatCard = ({ 
    icon: Icon, 
    title, 
    value, 
    subtitle, 
    color = 'blue',
    borderColor = 'border-blue-600'
  }: {
    icon: React.ElementType;
    title: string;
    value: string;
    subtitle?: string;
    color?: string;
    borderColor?: string;
  }) => {
    const colorClasses = {
      blue: 'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
      green: 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
      red: 'bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-800',
      orange: 'bg-orange-50 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-800'
    };

    return (
      <div className={`bg-white dark:bg-gray-800 rounded-card shadow-sm p-6 border-l-4 ${borderColor} dark:border-blue-400`}>
        <div className="flex items-center">
          <div className={`p-3 rounded-sharp ${colorClasses[color as keyof typeof colorClasses] || colorClasses.blue}`}>
            <Icon className="h-6 w-6" />
          </div>
          <div className="ml-4 flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{title}</p>
            <p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
            {subtitle && (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            )}
          </div>
        </div>
      </div>
    );
  };

  // Calculate statistics
  const settledClaims = policies.filter(policy => policy.hasClaimSettled).length;
  const lastYearClaims = policies.filter(policy => policy.hasClaimLastYear).length;
  const totalClaimAmount = policies
    .filter(policy => policy.hasClaimLastYear && policy.lastClaimAmount)
    .reduce((sum, policy) => sum + parseFloat(policy.lastClaimAmount || '0'), 0);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">OnClicks Policy Manager - Claims Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-2">Track and manage insurance claims for all policies</p>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading claims data...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-card p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-500 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading claims data</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={refreshPolicies}
                className="ml-auto bg-red-100 dark:bg-red-800 text-red-700 dark:text-red-200 px-4 py-2 rounded-lg hover:bg-red-200 dark:hover:bg-red-700 transition-colors duration-200 flex items-center"
              >
                <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Only show when not loading */}
        {!loading && (
        <>
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatCard
            icon={FileText}
            title="Total Policies"
            value={policies.length.toString()}
            subtitle="All active policies"
            color="blue"
            borderColor="border-blue-600"
          />
          <StatCard
            icon={CheckCircle}
            title="Settled Claims"
            value={settledClaims.toString()}
            subtitle="Claims successfully settled"
            color="green"
            borderColor="border-emerald-600"
          />
          <StatCard
            icon={AlertCircle}
            title="Last Year Claims"
            value={lastYearClaims.toString()}
            subtitle="Policies with previous claims"
            color="orange"
            borderColor="border-orange-600"
          />
          <StatCard
            icon={DollarSign}
            title="Total Claim Amount"
            value={`₹${totalClaimAmount.toLocaleString()}`}
            subtitle="Last year's total claims"
            color="red"
            borderColor="border-red-600"
          />
        </div>

        {/* Filters and Search */}
        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm p-6 mb-8 transition-colors duration-200">
          <div className="flex items-center mb-4">
            <Filter className="h-5 w-5 text-blue-600 dark:text-blue-400 mr-2" />
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Filter Claims</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 bg-white dark:bg-gray-700 text-slate-900 dark:text-gray-100 placeholder-slate-500 dark:placeholder-gray-400"
                />
              </div>
            </div>

            {/* Company Filter */}
            <div>
              <select
                value={selectedCompany}
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Companies</option>
                {companies.map(company => (
                  <option key={company} value={company}>{company}</option>
                ))}
              </select>
            </div>

            {/* Claim Status Filter */}
            <div>
              <select
                value={claimStatusFilter}
                onChange={(e) => setClaimStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">All Claim Status</option>
                <option value="settled">Settled Claims</option>
                <option value="in-progress">Claims In Progress</option>
                <option value="not-settled">Not Settled</option>
                <option value="last-year-claim">Had Last Year Claim</option>
              </select>
            </div>

            {/* Clear Filters */}
            <div>
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedCompany('');
                  setClaimStatusFilter('');
                }}
                className="w-full px-4 py-2 bg-slate-100 dark:bg-gray-700 text-slate-700 dark:text-gray-300 rounded-sharp hover:bg-slate-200 dark:hover:bg-gray-600 transition-colors duration-200 font-medium"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Policies Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {filteredPolicies.map((policy) => (
            <PolicyClaimCard key={policy.id} policy={policy} />
          ))}
        </div>

        {/* Empty State */}
        {filteredPolicies.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
            <h3 className="mt-4 text-lg font-medium text-gray-900 dark:text-gray-100">No policies found</h3>
            <p className="mt-2 text-gray-500 dark:text-gray-400">
              {searchTerm || selectedCompany || claimStatusFilter 
                ? 'Try adjusting your search or filters'
                : 'No policies available for claims management'}
            </p>
          </div>
        )}
        </>
        )}

        {/* Claim Options Modal */}
        {showClaimOptionsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
              <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
                <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <DollarSign className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Claim Process
                </h2>
                <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                  Choose how you want to proceed with this claim
                </p>
              </div>
              <div className="px-6 py-4 space-y-4">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  Select an option to manage the claim for this policy:
                </p>
                <div className="space-y-3">
                  <button
                    onClick={handleMarkAsInProgress}
                    className="w-full px-4 py-3 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 transition-colors duration-200 font-medium flex items-center justify-center"
                  >
                    <AlertCircle className="h-4 w-4 mr-2" />
                    Mark as In Progress
                  </button>
                  <button
                    onClick={handleMarkAsSettled}
                    className="w-full px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center"
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    Mark as Settled
                  </button>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleSettlementCancel}
                  className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settlement Amount Modal */}
        {showSettlementModal && (
          <div 
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={(e) => {
              if (e.target === e.currentTarget) {
                handleSettlementCancel();
              }
            }}
          >
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-md mx-4">
              <div className="mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Enter Settlement Details</h3>
                <p className="text-gray-600 dark:text-gray-400">Please enter the settlement amount and date for this claim.</p>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label htmlFor="settlementAmountInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Settlement Amount (₹) *
                  </label>
                  <input
                    id="settlementAmountInput"
                    type="number"
                    value={settlementAmount}
                    onChange={(e) => setSettlementAmount(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter amount"
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    autoFocus
                  />
                </div>
                
                <div>
                  <label htmlFor="settlementDateInput" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Settlement Date *
                  </label>
                  <input
                    id="settlementDateInput"
                    type="date"
                    value={settlementDate}
                    onChange={(e) => setSettlementDate(e.target.value)}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={handleSettlementCancel}
                  className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSettlementSubmit}
                  className="px-6 py-2 bg-green-600 dark:bg-green-700 text-white rounded-lg hover:bg-green-700 dark:hover:bg-green-600 transition-colors duration-200 flex items-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Settle Claim
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}