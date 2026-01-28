import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { LapsedPolicy } from '../types';
import { 
  RefreshCw,
  ArrowLeft,
  AlertTriangle,
  Search,
  Eye
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';
import { getLapsedPolicies } from '../services';
import { useAuth } from '../context/AuthContext';

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

export function LapsedPoliciesPage() {
  const { user } = useAuth();
  const [lapsedPolicies, setLapsedPolicies] = useState<LapsedPolicy[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedPolicy, setSelectedPolicy] = useState<LapsedPolicy | null>(null);

  const fetchLapsedPolicies = async () => {
    setLoading(true);
    setError(null);
    
    try {
      // If admin, get all policies. Otherwise, only get user's policies
      const userId = user && user.role !== 'admin' ? user.id : undefined;
      const policies = await getLapsedPolicies(userId);
      setLapsedPolicies(policies);
    } catch (err) {
      console.error('Error fetching lapsed policies:', err);
      setError('Failed to load lapsed policies');
      toast.error('Failed to load lapsed policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLapsedPolicies();
  }, []);

  // Filter policies based on search term
  const filteredPolicies = lapsedPolicies.filter(policy => {
    const lowerSearchTerm = searchTerm.toLowerCase();
    
    return (
      policy.policyholderName?.toLowerCase().includes(lowerSearchTerm) ||
      policy.policyNumber?.toLowerCase().includes(lowerSearchTerm) ||
      policy.insuranceCompany?.toLowerCase().includes(lowerSearchTerm) ||
      policy.lapsedReason?.toLowerCase().includes(lowerSearchTerm) ||
      policy.contactNo?.toLowerCase().includes(lowerSearchTerm) ||
      policy.emailId?.toLowerCase().includes(lowerSearchTerm)
    );
  });

  const LapsedPolicyModal = ({ policy, onClose }: { policy: LapsedPolicy; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
            Lapsed Policy Details
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-xl p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-sharp transition-colors duration-200"
          >
            ×
          </button>
        </div>
        <div className="px-4 sm:px-6 py-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Policyholder Name</label>
              <p className="text-gray-900 dark:text-white font-medium">{policy.policyholderName}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Policy Type</label>
              <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300">
                {policy.policyType} Insurance
              </span>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Insurance Company</label>
              <p className="text-gray-900 dark:text-white font-medium">{policy.insuranceCompany}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Policy Number</label>
              <p className="text-gray-900 dark:text-white font-mono text-sm bg-gray-50 dark:bg-gray-700 px-2 py-1 rounded">{policy.policyNumber}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Lapsed Date</label>
              <p className="text-gray-900 dark:text-white font-medium">{safeFormatDate(policy.lapsedAt, 'PPP')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Lapsed Reason</label>
              <p className="text-gray-900 dark:text-white font-medium">{policy.lapsedReason || 'No reason provided'}</p>
            </div>
            {policy.contactNo && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Contact Number</label>
                <p className="text-gray-900 dark:text-white font-medium">{policy.contactNo}</p>
              </div>
            )}
            {policy.emailId && (
              <div>
                <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Email</label>
                <p className="text-gray-900 dark:text-white font-medium">{policy.emailId}</p>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Original Policy Details</label>
            <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-sharp">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Start Date: </span>
                  <span className="text-gray-900 dark:text-white">{safeFormatDate(policy.policyStartDate || policy.startDate, 'PPP')}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Expiry Date: </span>
                  <span className="text-gray-900 dark:text-white">{safeFormatDate(policy.policyEndDate || policy.expiryDate, 'PPP')}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500 dark:text-gray-400">Premium: </span>
                  <span className="text-gray-900 dark:text-white">₹{(policy.premiumAmount || 0).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-4 sm:py-8 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <Link 
                to="/reminders" 
                className="inline-flex items-center text-blue-600 dark:text-blue-400 hover:underline mb-2"
              >
                <ArrowLeft className="h-4 w-4 mr-1" />
                Back to Reminders
              </Link>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">Lapsed Policies</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage policies that have lapsed</p>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading lapsed policies...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sharp p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-500 dark:text-red-400">
                <AlertTriangle className="h-6 w-6" />
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading policies</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={fetchLapsedPolicies}
                className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-sharp hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content */}
        {!loading && !error && (
          <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                    <AlertTriangle className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                    Lapsed Policies ({filteredPolicies.length})
                  </h2>
                  <p className="text-gray-500 dark:text-gray-400 text-sm">Policies that have been marked as lapsed</p>
                </div>
                <div>
                  <button
                    onClick={fetchLapsedPolicies}
                    className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-sharp hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center"
                  >
                    <RefreshCw className="h-4 w-4 mr-2" />
                    Refresh
                  </button>
                </div>
              </div>
            </div>

            {/* Search */}
            <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-gray-800 dark:to-gray-700">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Search lapsed policies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-amber-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 transition-colors duration-200"
                />
              </div>
            </div>

            {/* Lapsed Policies List */}
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredPolicies.length > 0 ? (
                filteredPolicies.map(policy => (
                  <div 
                    key={policy.id} 
                    className="p-4 sm:p-6 hover:bg-amber-50 dark:hover:bg-amber-900/10 transition-colors duration-200 cursor-pointer"
                    onClick={() => setSelectedPolicy(policy)}
                  >
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                          {policy.policyholderName}
                        </h3>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 mt-1">
                          <span className="text-sm font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded text-gray-600 dark:text-gray-400">
                            {policy.policyNumber}
                          </span>
                          <span className="text-sm text-gray-500 dark:text-gray-400">
                            {policy.insuranceCompany}
                          </span>
                        </div>
                      </div>
                      <div className="mt-4 md:mt-0 flex flex-col items-start md:items-end">
                        <span className="bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-300 text-xs font-medium px-2.5 py-1 rounded-full">
                          Lapsed on {safeFormatDate(policy.lapsedAt, 'MMM dd, yyyy')}
                        </span>
                        {policy.lapsedReason && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 mt-1 max-w-xs truncate">
                            Reason: {policy.lapsedReason}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-3 mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPolicy(policy);
                        }}
                        className="inline-flex items-center text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        <Eye className="h-3 w-3 mr-1" />
                        View Details
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center">
                  <AlertTriangle className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-white">No lapsed policies found</h3>
                  <p className="text-gray-500 dark:text-gray-400 mt-2">
                    {searchTerm ? 'Try adjusting your search term' : 'There are no lapsed policies in the system yet'}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Policy Details Modal */}
        {selectedPolicy && (
          <LapsedPolicyModal
            policy={selectedPolicy}
            onClose={() => setSelectedPolicy(null)}
          />
        )}
      </div>
    </div>
  );
}
