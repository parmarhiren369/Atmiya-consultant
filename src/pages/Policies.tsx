import { useState, useMemo, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { usePolicies } from '../context/PolicyContext';
import { useAuth } from '../context/AuthContext';
import { Policy } from '../types';
import { ConfirmationModal } from '../components/ConfirmationModal';
import { EditPolicyModal } from '../components/EditPolicyModal';
import { PermanentDeleteRequestModal } from '../components/PermanentDeleteRequestModal';
import { policyDeletionRequestService } from '../services/policyDeletionRequestService';
import { 
  Search, 
  Eye, 
  Trash2, 
  FileText,
  Calendar,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
  Plus,
  BarChart3,
  Bell,
  RefreshCw,
  FileDown,
  ExternalLink,
  FolderOpen,
  Edit,
  CheckCircle,
  DollarSign,
  AlertTriangle,
  MoreVertical,
  Share2,
  Download,
  Link2,
  ExternalLink as OpenExternal
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

export function Policies() {
  const { policies, deletePolicy, updatePolicy, loading, error, refreshPolicies, validateUserPassword, permanentlyDeletePolicy } = usePolicies();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [selectedCompany, setSelectedCompany] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [policyToDelete, setPolicyToDelete] = useState<Policy | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [policyToEdit, setPolicyToEdit] = useState<Policy | null>(null);
  // Claim settlement state
  const [showClaimModal, setShowClaimModal] = useState(false);
  const [showClaimOptionsModal, setShowClaimOptionsModal] = useState(false);
  const [selectedPolicyForClaim, setSelectedPolicyForClaim] = useState<string>('');
  const [claimSettlementAmount, setClaimSettlementAmount] = useState('');
  const [claimSettlementDate, setClaimSettlementDate] = useState('');
  // Permanent deletion request state
  const [showPermanentDeleteModal, setShowPermanentDeleteModal] = useState(false);
  const [policyToPermanentDelete, setPolicyToPermanentDelete] = useState<Policy | null>(null);
  // Admin permanent deletion state
  const [showAdminPermanentDeleteModal, setShowAdminPermanentDeleteModal] = useState(false);
  const [policyToAdminDelete, setPolicyToAdminDelete] = useState<Policy | null>(null);
  // Mobile menu state
  const [openMobileMenuId, setOpenMobileMenuId] = useState<string | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  // Share modal state
  const [showShareModal, setShowShareModal] = useState(false);
  const [policyToShare, setPolicyToShare] = useState<Policy | null>(null);
  const itemsPerPage = 10;

  // Get unique companies and types for filters
  const companies = useMemo(() => 
    [...new Set(policies.map(p => p.insuranceCompany))].sort()
  , [policies]);

  const policyTypes = useMemo(() => 
    [...new Set(policies.map(p => p.policyType))].sort()
  , [policies]);
  
  // Get unique years from policy start dates
  const policyYears = useMemo(() => {
    const years = new Set<string>();
    
    policies.forEach(policy => {
      if (policy.policyStartDate) {
        const year = new Date(policy.policyStartDate).getFullYear().toString();
        if (!isNaN(Number(year))) {
          years.add(year);
        }
      }
    });
    
    return [...years].sort((a, b) => parseInt(b) - parseInt(a)); // Sort descending
  }, [policies]);

  // Filter policies
  const filteredPolicies = useMemo(() => {
    return policies.filter(policy => {
      // Enhanced search functionality to include all relevant fields
      const lowerSearchTerm = searchTerm.toLowerCase();
      const matchesSearch = 
        // Basic policy info
        policy.policyholderName?.toLowerCase().includes(lowerSearchTerm) ||
        policy.policyNumber?.toLowerCase().includes(lowerSearchTerm) ||
        policy.insuranceCompany?.toLowerCase().includes(lowerSearchTerm) ||
        policy.productType?.toLowerCase().includes(lowerSearchTerm) ||
        policy.remark?.toLowerCase().includes(lowerSearchTerm) ||
        
        // Contact information
        policy.contactNo?.toLowerCase().includes(lowerSearchTerm) ||
        policy.emailId?.toLowerCase().includes(lowerSearchTerm) ||
        
        // Vehicle specific information
        policy.registrationNo?.toLowerCase().includes(lowerSearchTerm) ||
        policy.engineNo?.toLowerCase().includes(lowerSearchTerm) ||
        policy.chasisNo?.toLowerCase().includes(lowerSearchTerm) ||
        policy.riskLocationAddress?.toLowerCase().includes(lowerSearchTerm) ||
        
        // Referral information
        policy.referenceFromName?.toLowerCase().includes(lowerSearchTerm);
      
      // Apply filters
      const matchesType = !selectedType || policy.policyType === selectedType;
      const matchesCompany = !selectedCompany || policy.insuranceCompany === selectedCompany;
      
      // Year filter based on policy start date
      const matchesYear = !selectedYear || (
        policy.policyStartDate && 
        new Date(policy.policyStartDate).getFullYear().toString() === selectedYear
      );
      
      return matchesSearch && matchesType && matchesCompany && matchesYear;
    });
  }, [policies, searchTerm, selectedType, selectedCompany, selectedYear]);

  // Pagination
  const totalPages = Math.ceil(filteredPolicies.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentPolicies = filteredPolicies.slice(startIndex, endIndex);

  const handleDelete = async (id: string) => {
    const policy = policies.find(p => p.id === id);
    if (policy) {
      setPolicyToDelete(policy);
      setShowDeleteModal(true);
    }
  };

  const handleDeleteConfirm = async () => {
    if (policyToDelete) {
      try {
        await deletePolicy(policyToDelete.id);
        setShowDeleteModal(false);
        setPolicyToDelete(null);
        // Success toast is already shown by the context
      } catch (error) {
        console.error('Error deleting policy:', error);
        // Error toast is already shown by the context
      }
    }
  };

  const handleDeleteCancel = () => {
    setShowDeleteModal(false);
    setPolicyToDelete(null);
  };

  const handleEdit = (policy: Policy) => {
    setPolicyToEdit(policy);
    setShowEditModal(true);
  };

  const handleEditSave = async (updatedPolicy: Partial<Policy>) => {
    if (policyToEdit) {
      try {
        await updatePolicy(policyToEdit.id, updatedPolicy);
        setShowEditModal(false);
        setPolicyToEdit(null);
        // Success toast is already shown by the context
      } catch (error) {
        console.error('Error updating policy:', error);
        // Error toast is already shown by the context
      }
    }
  };

  const handleEditCancel = () => {
    setShowEditModal(false);
    setPolicyToEdit(null);
  };

  const handleViewPDF = (policy: Policy) => {
    if (policy.driveFileUrl) {
      window.open(policy.driveFileUrl, '_blank');
      toast.success('Opening policy document...');
    } else {
      toast.error('No PDF document available for this policy');
    }
  };

  const handleViewDocumentsFolder = (policy: Policy) => {
    if (policy.documentsFolderLink) {
      window.open(policy.documentsFolderLink, '_blank');
      toast.success('Opening documents folder...');
    } else {
      toast.error('No documents folder available for this policy');
    }
  };

  // Share handlers
  const handleShare = (policy: Policy) => {
    if (!policy.driveFileUrl) {
      toast.error('No PDF document available to share');
      return;
    }
    setPolicyToShare(policy);
    setShowShareModal(true);
  };

  const handleDownloadPDF = async () => {
    if (!policyToShare?.driveFileUrl) return;
    
    try {
      toast.loading('Downloading PDF...');
      window.open(policyToShare.driveFileUrl, '_blank');
      toast.dismiss();
      toast.success('PDF download started!');
      setShowShareModal(false);
    } catch (error) {
      toast.dismiss();
      toast.error('Failed to download PDF');
    }
  };

  const handleCopyFormattedMessage = () => {
    if (!policyToShare) return;
    
    const message = `📋 *Policy Document*

👤 Policyholder: ${policyToShare.policyholderName}
📑 Policy Number: ${policyToShare.policyNumber}
🏢 Company: ${policyToShare.insuranceCompany}
📝 Type: ${policyToShare.policyType}
💰 Premium: ₹${(policyToShare.premiumAmount || 0).toLocaleString()}
📅 Expiry Date: ${safeFormatDate(policyToShare.policyEndDate, 'MMM dd, yyyy')}

📎 Document Link: ${policyToShare.driveFileUrl}`;

    navigator.clipboard.writeText(message)
      .then(() => {
        toast.success('Formatted message copied! Ready to paste in WhatsApp/Messages');
        setShowShareModal(false);
      })
      .catch(() => {
        toast.error('Failed to copy message');
      });
  };

  const handleCopyLink = () => {
    if (!policyToShare?.driveFileUrl) return;
    
    navigator.clipboard.writeText(policyToShare.driveFileUrl)
      .then(() => {
        toast.success('PDF link copied to clipboard!');
        setShowShareModal(false);
      })
      .catch(() => {
        toast.error('Failed to copy link');
      });
  };

  const handleOpenAndShare = () => {
    if (!policyToShare?.driveFileUrl) return;
    
    if (navigator.share) {
      navigator.share({
        title: `Policy Document - ${policyToShare.policyholderName}`,
        text: `Policy for ${policyToShare.policyholderName} (${policyToShare.policyNumber})`,
        url: policyToShare.driveFileUrl
      })
        .then(() => {
          toast.success('Shared successfully!');
          setShowShareModal(false);
        })
        .catch((error) => {
          if (error.name !== 'AbortError') {
            toast.error('Failed to share');
          }
        });
    } else {
      // Fallback: open in new tab
      window.open(policyToShare.driveFileUrl, '_blank');
      toast.success('Opening PDF in new tab...');
      setShowShareModal(false);
    }
  };

  // Claim settlement handlers
  const handleClaimPolicy = (policyId: string) => {
    const policy = policies.find(p => p.id === policyId);
    if (!policy) return;

    // If claim is already settled, show settlement details
    if (policy.hasClaimSettled) {
      toast.success(`Claim already settled for ₹${policy.settledAmount} on ${safeFormatDate(policy.settlementDate, 'MMM dd, yyyy')}`);
      return;
    }

    // If claim is in progress, show settlement modal directly
    if (policy.claimStatus === 'in-progress') {
      setSelectedPolicyForClaim(policyId);
      setClaimSettlementDate(new Date().toISOString().split('T')[0]);
      setShowClaimModal(true);
      return;
    }

    // If no claim status, show options modal
    setSelectedPolicyForClaim(policyId);
    setShowClaimOptionsModal(true);
  };

  const handleMarkAsInProgress = async () => {
    if (!selectedPolicyForClaim) return;

    try {
      await updatePolicy(selectedPolicyForClaim, {
        claimStatus: 'in-progress'
      });
      
      toast.success('Claim marked as in progress');
      setShowClaimOptionsModal(false);
      setSelectedPolicyForClaim('');
    } catch (error) {
      console.error('Error marking claim as in progress:', error);
      toast.error('Failed to mark claim as in progress');
    }
  };

  const handleMarkAsSettled = () => {
    setShowClaimOptionsModal(false);
    setClaimSettlementDate(new Date().toISOString().split('T')[0]);
    setShowClaimModal(true);
  };

  const handleClaimSubmit = async () => {
    if (!claimSettlementAmount || isNaN(Number(claimSettlementAmount)) || Number(claimSettlementAmount) <= 0) {
      toast.error('Please enter a valid settlement amount');
      return;
    }
    
    if (!claimSettlementDate) {
      toast.error('Please select the settlement date');
      return;
    }

    try {
      const policy = policies.find(p => p.id === selectedPolicyForClaim);
      if (policy) {
        // Update the policy with settlement information
        await updatePolicy(selectedPolicyForClaim, {
          hasClaimSettled: true,
          claimStatus: 'settled',
          settledAmount: claimSettlementAmount,
          settlementDate: claimSettlementDate
        });
        
        toast.success(`Claim settled for ₹${Number(claimSettlementAmount).toLocaleString()} on ${safeFormatDate(claimSettlementDate, 'MMM dd, yyyy')}`);
        
        // Close modal and reset
        setShowClaimModal(false);
        setSelectedPolicyForClaim('');
        setClaimSettlementAmount('');
        setClaimSettlementDate('');
      }
    } catch (error) {
      console.error('Error settling claim:', error);
      toast.error('Failed to settle claim');
    }
  };

  const handleClaimCancel = () => {
    setShowClaimModal(false);
    setShowClaimOptionsModal(false);
    setSelectedPolicyForClaim('');
    setClaimSettlementAmount('');
    setClaimSettlementDate('');
  };

  const handleClaimKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleClaimSubmit();
    } else if (e.key === 'Escape') {
      handleClaimCancel();
    }
  };

  // Permanent deletion request handlers
  const handlePermanentDeleteRequest = (policy: Policy) => {
    setPolicyToPermanentDelete(policy);
    setShowPermanentDeleteModal(true);
  };

  const handleSubmitPermanentDeleteRequest = async (policyId: string, reason: string, _password: string) => {
    if (!user) {
      throw new Error('User not authenticated');
    }

    // Check if there's already a pending request for this policy
    const existingRequest = await policyDeletionRequestService.checkPendingDeletionRequest(policyId);
    if (existingRequest) {
      throw new Error('A deletion request for this policy is already pending approval');
    }

    // Create the deletion request
    await policyDeletionRequestService.createDeletionRequest({
      policyId,
      policyholderName: policyToPermanentDelete!.policyholderName,
      policyNumber: policyToPermanentDelete!.policyNumber,
      requestedBy: user.userId || user.id,
      requestedByName: user.displayName,
      status: 'pending',
      requestReason: reason
    });

    toast.success('Permanent deletion request submitted successfully');
  };

  const handleCancelPermanentDeleteRequest = () => {
    setShowPermanentDeleteModal(false);
    setPolicyToPermanentDelete(null);
  };

  // Admin permanent deletion handlers
  const handleAdminPermanentDelete = (policy: Policy) => {
    setPolicyToAdminDelete(policy);
    setShowAdminPermanentDeleteModal(true);
  };

  const handleAdminPermanentDeleteConfirm = async () => {
    if (!policyToAdminDelete) return;

    try {
      // First move the policy to deleted collection, then permanently delete it
      await deletePolicy(policyToAdminDelete.id);
      
      // Wait a moment for the policy to be moved to deleted collection
      setTimeout(async () => {
        try {
          await permanentlyDeletePolicy(policyToAdminDelete.id, policyToAdminDelete.policyholderName);
          
          setShowAdminPermanentDeleteModal(false);
          setPolicyToAdminDelete(null);
          toast.success('Policy permanently deleted successfully');
        } catch (error) {
          console.error('Error permanently deleting policy:', error);
          toast.error('Failed to permanently delete policy');
        }
      }, 1000);
      
    } catch (error) {
      console.error('Error during admin permanent deletion:', error);
      toast.error('Failed to delete policy');
    }
  };

  const handleAdminPermanentDeleteCancel = () => {
    setShowAdminPermanentDeleteModal(false);
    setPolicyToAdminDelete(null);
  };

  // Mobile menu handlers
  const handleMobileMenuToggle = (policyId: string) => {
    setOpenMobileMenuId(openMobileMenuId === policyId ? null : policyId);
  };

  const handleMobileMenuClose = () => {
    setOpenMobileMenuId(null);
  };

  // Close mobile menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(event.target as Node)) {
        setOpenMobileMenuId(null);
      }
    };

    if (openMobileMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMobileMenuId]);

  const handleExport = () => {
    // Function to properly escape CSV values with better handling
    const escapeCSV = (value: string | number | undefined | null) => {
      // Convert to string and handle null/undefined
      let str = '';
      if (value === null || value === undefined) {
        str = '';
      } else {
        str = String(value);
      }
      
      // Always wrap in quotes and escape any internal double quotes
      // This ensures proper CSV formatting regardless of content
      return '"' + str.replace(/"/g, '""') + '"';
    };

    // Create CSV headers
    const headers = ['Name', 'Policy Type', 'Company', 'Policy Number', 'Product Type', 'Start Date', 'Expiry Date', 'Premium Amount', 'Remarks'];
    
    // Create CSV rows
    const rows = filteredPolicies.map(policy => [
      escapeCSV(policy.policyholderName),
      escapeCSV(policy.policyType),
      escapeCSV(policy.insuranceCompany),
      escapeCSV(policy.policyNumber),
      escapeCSV(policy.productType),
      escapeCSV(policy.policyStartDate instanceof Date ? policy.policyStartDate.toISOString() : policy.policyStartDate),
      escapeCSV(policy.policyEndDate instanceof Date ? policy.policyEndDate.toISOString() : policy.policyEndDate),
      escapeCSV(policy.premiumAmount || 0),
      escapeCSV(policy.remark)
    ]);

    // Combine headers and rows
    const csvContent = [headers, ...rows]
      .map(row => row.join(','))
      .join('\r\n'); // Use \r\n for better Excel compatibility

    // Create and download the file with proper UTF-8 BOM for Excel compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csvContent], { 
      type: 'text/csv;charset=utf-8;' 
    });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'policies.csv';
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Policies exported successfully');
  };

  const PolicyModal = ({ policy, onClose }: { policy: Policy; onClose: () => void }) => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-800 rounded-card max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200 dark:border-gray-700">
        <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
            <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
            Policy Details
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
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Start Date</label>
              <p className="text-gray-900 dark:text-white font-medium">{safeFormatDate(policy.policyStartDate || policy.startDate, 'PPP')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Expiry Date</label>
              <p className="text-gray-900 dark:text-white font-medium">{safeFormatDate(policy.policyEndDate || policy.expiryDate, 'PPP')}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Premium Amount</label>
              <p className="font-bold text-lg text-green-600">₹{(policy.premiumAmount || 0).toLocaleString()}</p>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Created</label>
              <p className="text-gray-900 dark:text-white font-medium">{safeFormatDate(policy.createdAt, 'PPP')}</p>
            </div>
            {/* Settlement Information */}
            <div>
              <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-1">Claim Status</label>
              {policy.hasClaimSettled ? (
                <div className="space-y-1">
                  <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300">
                    Claim Settled
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Amount: ₹{policy.settledAmount ? Number(policy.settledAmount).toLocaleString() : 'N/A'}
                  </p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Date: {safeFormatDate(policy.settlementDate, 'PPP')}
                  </p>
                </div>
              ) : (
                <span className="inline-flex px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 dark:bg-gray-900/20 text-gray-800 dark:text-gray-300">
                  No Claim Settled
                </span>
              )}
            </div>
          </div>
          {/* PDF Document section - temporarily disabled */}
          <div>
            <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Policy Document</label>
            <div className="flex items-center justify-between bg-gray-50 dark:bg-gray-700 p-3 rounded-sharp">
              <div className="flex items-center space-x-2">
                <FileText className="h-5 w-5 text-red-500" />
                <span className="text-gray-900 dark:text-white font-medium">
                  Document upload feature coming soon
                </span>
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
        {/* Quick Actions Header */}
        <div className="mb-8">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center space-y-4 sm:space-y-0">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">OnClicks Policy Manager - Policies</h1>
              <p className="text-gray-600 dark:text-gray-400 mt-1">Manage and track all your insurance policies</p>
            </div>
            <div className="flex flex-wrap gap-2 sm:gap-3 w-full sm:w-auto">
              <Link
                to="/add-policy"
                className="bg-blue-700 dark:bg-gradient-to-r dark:from-blue-600 dark:to-indigo-600 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-sharp hover:bg-blue-800 dark:hover:from-blue-700 dark:hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 shadow-sm hover:shadow-sm text-sm sm:text-base flex-1 sm:flex-none justify-center"
              >
                <Plus className="h-5 w-5" />
                <span className="font-medium">Add New Policy</span>
              </Link>
              <Link
                to="/dashboard"
                className="bg-white dark:bg-gray-800 text-slate-700 dark:text-gray-300 px-4 sm:px-6 py-2 sm:py-3 rounded-sharp hover:bg-slate-50 dark:hover:bg-gray-700 transition-colors duration-200 flex items-center space-x-2 border border-slate-200 dark:border-gray-600 shadow-sm hover:shadow-sm text-sm sm:text-base"
              >
                <BarChart3 className="h-5 w-5" />
                <span className="font-medium hidden sm:inline">Analytics</span>
                <span className="font-medium sm:hidden">Stats</span>
              </Link>
              <Link
                to="/reminders"
                className="bg-amber-50 dark:bg-orange-900/20 text-amber-700 dark:text-orange-400 px-4 sm:px-6 py-2 sm:py-3 rounded-sharp hover:bg-amber-100 dark:hover:bg-orange-900/30 transition-colors duration-200 flex items-center space-x-2 border border-amber-200 dark:border-orange-800 text-sm sm:text-base"
              >
                <Bell className="h-5 w-5" />
                <span className="font-medium hidden sm:inline">Reminders</span>
                <span className="font-medium sm:hidden">Alerts</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            <span className="ml-3 text-gray-600 dark:text-gray-400">Loading policies...</span>
          </div>
        )}

        {/* Error State */}
        {error && !loading && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-sharp p-6 mb-8">
            <div className="flex items-center">
              <div className="text-red-500 dark:text-red-400">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-red-800 dark:text-red-300 font-medium">Error loading policies</h3>
                <p className="text-red-600 dark:text-red-400 text-sm mt-1">{error}</p>
              </div>
              <button
                onClick={refreshPolicies}
                className="ml-auto bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 px-4 py-2 rounded-sharp hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors duration-200 flex items-center"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </button>
            </div>
          </div>
        )}

        {/* Main Content - Only show when not loading */}
        {!loading && (

        <div className="bg-white dark:bg-gray-800 rounded-card shadow-sm border border-gray-100 dark:border-gray-700 transition-colors duration-200">
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center space-y-4 md:space-y-0">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 dark:text-white flex items-center">
                  <FileText className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                  Current Policies ({filteredPolicies.length})
                </h2>
                <p className="text-gray-500 dark:text-gray-400 text-sm">View and manage all your active policies</p>
              </div>
              <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-3 w-full sm:w-auto">
                <button
                onClick={handleExport}
                  className="bg-green-600 text-white px-4 py-2 rounded-sharp hover:bg-green-700 transition-all duration-200 flex items-center shadow-sm hover:shadow-sm justify-center text-sm sm:text-base"
              >
                <FileDown className="h-4 w-4 mr-2" />
                Export CSV
              </button>
                <button
                  onClick={() => window.location.reload()}
                  className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-4 py-2 rounded-sharp hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 flex items-center justify-center text-sm sm:text-base"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </button>
              </div>
            </div>
          </div>

          {/* Filters */}
          <div className="px-4 sm:px-6 py-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
            <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 lg:space-x-4">
              {/* Search */}
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 h-5 w-5" />
                  <input
                    type="text"
                    placeholder="Search by name, policy #, email, mobile..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-gray-400 transition-colors duration-200"
                    autoComplete="off"
                    autoCorrect="off"
                    autoCapitalize="off"
                    spellCheck={false}
                    name="policy-search-input"
                    id="policy-search-input"
                    role="searchbox"
                    aria-label="Search policies by name, number, email, mobile, or other details"
                    title="Search across all policy fields including name, policy number, email, mobile, registration number, etc."
                  />
                </div>
              </div>
              
              {/* Type Filter */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedType}
                  onChange={(e) => setSelectedType(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                >
                  <option value="">All Types</option>
                  {policyTypes.map(type => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </div>

              {/* Company Filter */}
              <div className="w-full sm:w-48">
                <select
                  value={selectedCompany}
                  onChange={(e) => setSelectedCompany(e.target.value)}
                  className="w-full px-3 py-3 border border-slate-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-600 focus:border-blue-600 shadow-sm bg-white dark:bg-gray-800 text-slate-900 dark:text-white transition-colors duration-200"
                >
                  <option value="">All Companies</option>
                  {companies.map(company => (
                    <option key={company} value={company}>{company}</option>
                  ))}
                </select>
              </div>
              
              {/* Year Filter */}
              <div className="w-full sm:w-40">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(e.target.value)}
                  className="w-full px-3 py-3 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-blue-500 focus:border-transparent shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white transition-colors duration-200"
                >
                  <option value="">All Years</option>
                  {policyYears.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gradient-to-r from-gray-50 to-blue-50 dark:from-gray-800 dark:to-gray-700">
                <tr>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <User className="h-4 w-4 mr-1 hidden sm:inline" />
                    Name
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden sm:table-cell">
                    Policy Type
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden md:table-cell">
                    <Building className="h-4 w-4 mr-1 hidden sm:inline" />
                    Company
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider hidden lg:table-cell">
                    <Calendar className="h-4 w-4 mr-1 hidden sm:inline" />
                    Expiry Date
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-left text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Premium Amount
                  </th>
                  <th className="px-3 sm:px-6 py-4 text-center text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {currentPolicies.map((policy) => (
                  <tr key={policy.id} className="hover:bg-blue-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-3 sm:px-6 py-4">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {policy.policyholderName}
                      </div>
                      <div className="text-xs text-gray-500 dark:text-gray-400 font-mono bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded mt-1 inline-block">
                        {policy.policyNumber}
                      </div>
                      {/* Mobile-only info */}
                      <div className="sm:hidden mt-2 space-y-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          {policy.insuranceCompany}
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">
                          Expires: {safeFormatDate(policy.policyEndDate, 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap hidden sm:table-cell">
                      <span className="inline-flex px-3 py-1 text-xs font-semibold rounded-full bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-blue-900/20 dark:to-indigo-900/20 text-blue-800 dark:text-blue-300 shadow-sm">
                        {policy.policyType}
                      </span>
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden md:table-cell">
                      {policy.insuranceCompany}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white hidden lg:table-cell">
                      {safeFormatDate(policy.policyEndDate, 'MMM dd, yyyy')}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      ₹{(policy.premiumAmount || 0).toLocaleString()}
                    </td>
                    <td className="px-3 sm:px-6 py-4 whitespace-nowrap text-center text-sm font-medium">
                      {/* Desktop Actions */}
                      <div className="hidden sm:flex justify-center space-x-2">
                        <button
                          onClick={() => handleViewPDF(policy)}
                          className={`p-2 rounded-sharp transition-all duration-200 shadow-sm hover:shadow-sm ${
                            policy.driveFileUrl 
                              ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={policy.driveFileUrl ? "View PDF Document" : "PDF Document Not Available"}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleViewDocumentsFolder(policy)}
                          className={`p-2 rounded-sharp transition-all duration-200 shadow-sm hover:shadow-sm ${
                            policy.documentsFolderLink 
                              ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : 'text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20'
                          }`}
                          title={policy.documentsFolderLink ? "View Documents Folder" : "Documents Folder Not Available"}
                        >
                          <FolderOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(policy)}
                          className="text-amber-600 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-300 p-2 rounded-sharp hover:bg-amber-50 dark:hover:bg-amber-900/20 transition-all duration-200 shadow-sm hover:shadow-sm"
                          title="Edit Policy"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleClaimPolicy(policy.id)}
                          className={`p-2 rounded-sharp transition-all duration-200 shadow-sm hover:shadow-sm ${
                            policy.hasClaimSettled 
                              ? 'text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 hover:bg-green-50 dark:hover:bg-green-900/20' 
                              : policy.claimStatus === 'in-progress'
                              ? 'text-yellow-600 dark:text-yellow-400 hover:text-yellow-900 dark:hover:text-yellow-300 hover:bg-yellow-50 dark:hover:bg-yellow-900/20'
                              : 'text-purple-600 dark:text-purple-400 hover:text-purple-900 dark:hover:text-purple-300 hover:bg-purple-50 dark:hover:bg-purple-900/20'
                          }`}
                          title={
                            policy.hasClaimSettled 
                              ? `Claim Settled: ₹${policy.settledAmount} on ${safeFormatDate(policy.settlementDate, 'MMM dd, yyyy')}`
                              : policy.claimStatus === 'in-progress'
                              ? 'Claim In Progress - Click to settle'
                              : 'Start Claim Process'
                          }
                        >
                          {policy.hasClaimSettled ? <CheckCircle className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => handleShare(policy)}
                          className={`p-2 rounded-sharp transition-all duration-200 shadow-sm hover:shadow-sm ${
                            policy.driveFileUrl
                              ? 'text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                              : 'text-gray-400 dark:text-gray-600 cursor-not-allowed'
                          }`}
                          title={policy.driveFileUrl ? "Share PDF Document" : "PDF Not Available"}
                          disabled={!policy.driveFileUrl}
                        >
                          <Share2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setSelectedPolicy(policy)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-2 rounded-sharp hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-all duration-200 shadow-sm hover:shadow-sm"
                          title="View Details"
                        >
                          <Eye className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(policy.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-2 rounded-sharp hover:bg-red-50 dark:hover:bg-red-900/20 transition-all duration-200 shadow-sm hover:shadow-sm"
                          title="Delete Policy"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            if (user?.role === 'admin') {
                              handleAdminPermanentDelete(policy);
                            } else {
                              handlePermanentDeleteRequest(policy);
                            }
                          }}
                          className="text-orange-600 dark:text-orange-400 hover:text-orange-900 dark:hover:text-orange-300 p-2 rounded-sharp hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all duration-200 shadow-sm hover:shadow-sm"
                          title={user?.role === 'admin' ? "Permanently Delete Policy" : "Request Permanent Deletion"}
                        >
                          <AlertTriangle className="h-4 w-4" />
                        </button>
                      </div>

                      {/* Mobile Actions - Hamburger Menu */}
                      <div className="sm:hidden relative" ref={mobileMenuRef}>
                        <button
                          onClick={() => handleMobileMenuToggle(policy.id)}
                          className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100 p-2 rounded-sharp hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200"
                          title="More Actions"
                        >
                          <MoreVertical className="h-5 w-5" />
                        </button>
                        
                        {/* Mobile Dropdown Menu */}
                        {openMobileMenuId === policy.id && (
                          <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-sharp shadow-sm border border-gray-200 dark:border-gray-700 z-50">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  handleViewPDF(policy);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <ExternalLink className={`h-4 w-4 mr-3 ${
                                  policy.driveFileUrl ? 'text-green-500' : 'text-red-500'
                                }`} />
                                View PDF {!policy.driveFileUrl && '(Not Available)'}
                              </button>
                              <button
                                onClick={() => {
                                  handleViewDocumentsFolder(policy);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <FolderOpen className={`h-4 w-4 mr-3 ${
                                  policy.documentsFolderLink ? 'text-green-500' : 'text-red-500'
                                }`} />
                                Documents Folder {!policy.documentsFolderLink && '(Not Available)'}
                              </button>
                              <button
                                onClick={() => {
                                  handleEdit(policy);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <Edit className="h-4 w-4 mr-3 text-amber-500" />
                                Edit Policy
                              </button>
                              <button
                                onClick={() => {
                                  handleClaimPolicy(policy.id);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                {policy.hasClaimSettled ? (
                                  <CheckCircle className="h-4 w-4 mr-3 text-green-500" />
                                ) : policy.claimStatus === 'in-progress' ? (
                                  <DollarSign className="h-4 w-4 mr-3 text-yellow-500" />
                                ) : (
                                  <DollarSign className="h-4 w-4 mr-3 text-purple-500" />
                                )}
                                {policy.hasClaimSettled 
                                  ? 'View Settlement' 
                                  : policy.claimStatus === 'in-progress'
                                  ? 'Settle Claim (In Progress)'
                                  : 'Start Claim Process'
                                }
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPolicy(policy);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <Eye className="h-4 w-4 mr-3 text-blue-500" />
                                View Details
                              </button>
                              <button
                                onClick={() => {
                                  handleDelete(policy.id);
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <Trash2 className="h-4 w-4 mr-3 text-red-500" />
                                Delete Policy
                              </button>
                              <button
                                onClick={() => {
                                  if (user?.role === 'admin') {
                                    handleAdminPermanentDelete(policy);
                                  } else {
                                    handlePermanentDeleteRequest(policy);
                                  }
                                  handleMobileMenuClose();
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 flex items-center"
                              >
                                <AlertTriangle className="h-4 w-4 mr-3 text-orange-500" />
                                {user?.role === 'admin' ? 'Permanent Delete' : 'Request Permanent Delete'}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-4 sm:px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row items-center justify-between bg-gray-50 dark:bg-gray-800 space-y-3 sm:space-y-0">
              <div className="text-sm text-gray-700 dark:text-gray-300">
                Showing {startIndex + 1} to {Math.min(endIndex, filteredPolicies.length)} of {filteredPolicies.length} results
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm bg-white dark:bg-gray-800"
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  <span className="hidden sm:inline">Previous</span>
                  <span className="sm:hidden">Prev</span>
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="px-3 sm:px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center shadow-sm bg-white dark:bg-gray-800"
                >
                  <span className="hidden sm:inline">Next</span>
                  <span className="sm:hidden">Next</span>
                  <ChevronRight className="h-4 w-4 ml-1" />
                </button>
              </div>
            </div>
          )}

          {filteredPolicies.length === 0 && (
            <div className="px-4 sm:px-6 py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
              <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No policies found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || selectedType || selectedCompany 
                  ? 'Try adjusting your search or filters'
                  : 'Get started by adding your first policy'}
              </p>
              {!searchTerm && !selectedType && !selectedCompany && (
                <Link
                  to="/add-policy"
                  className="mt-4 inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-sharp hover:bg-blue-700 transition-colors duration-200"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Your First Policy
                </Link>
              )}
            </div>
          )}
        </div>
        )}

      </div>

      {/* Policy Details Modal */}
      {selectedPolicy && (
        <PolicyModal
          policy={selectedPolicy as Policy}
          onClose={() => setSelectedPolicy(null)}
        />
      )}

      {/* Edit Policy Modal */}
      {showEditModal && policyToEdit && (
        <EditPolicyModal
          policy={policyToEdit}
          isOpen={showEditModal}
          onClose={handleEditCancel}
          onSave={handleEditSave}
        />
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={handleDeleteCancel}
        onConfirm={handleDeleteConfirm}
        title="Delete Policy"
        message={`You are about to delete the policy for ${policyToDelete?.policyholderName}. This policy will be moved to deleted policies and can be restored later. Please enter your password to confirm this action.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="warning"
        requirePassword={true}
        onPasswordValidation={validateUserPassword}
      />

      {/* Claim Options Modal */}
      {showClaimOptionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-card max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
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
                  className="w-full px-4 py-3 bg-yellow-600 text-white rounded-sharp hover:bg-yellow-700 transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  <AlertTriangle className="h-4 w-4 mr-2" />
                  Mark as In Progress
                </button>
                <button
                  onClick={handleMarkAsSettled}
                  className="w-full px-4 py-3 bg-green-600 text-white rounded-sharp hover:bg-green-700 transition-colors duration-200 font-medium flex items-center justify-center"
                >
                  <CheckCircle className="h-4 w-4 mr-2" />
                  Mark as Settled
                </button>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={handleClaimCancel}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Claim Settlement Modal */}
      {showClaimModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-card max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-600 dark:text-green-400" />
                Settle Claim
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Enter settlement details for this policy claim
              </p>
            </div>
            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Settlement Amount (₹)
                </label>
                <input
                  type="number"
                  value={claimSettlementAmount}
                  onChange={(e) => setClaimSettlementAmount(e.target.value)}
                  onKeyDown={handleClaimKeyDown}
                  placeholder="Enter settlement amount"
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Settlement Date
                </label>
                <input
                  type="date"
                  value={claimSettlementDate}
                  onChange={(e) => setClaimSettlementDate(e.target.value)}
                  onKeyDown={handleClaimKeyDown}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-sharp focus:ring-2 focus:ring-green-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700 flex space-x-3">
              <button
                onClick={handleClaimCancel}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleClaimSubmit}
                className="flex-1 px-4 py-2 bg-green-600 text-white rounded-sharp hover:bg-green-700 transition-colors duration-200 font-medium"
              >
                Settle Claim
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Permanent Delete Request Modal */}
      {showPermanentDeleteModal && policyToPermanentDelete && (
        <PermanentDeleteRequestModal
          isOpen={showPermanentDeleteModal}
          onClose={handleCancelPermanentDeleteRequest}
          policy={policyToPermanentDelete}
          onSubmitRequest={handleSubmitPermanentDeleteRequest}
          onPasswordValidation={validateUserPassword}
        />
      )}

      {/* Admin Permanent Delete Confirmation Modal */}
      {showAdminPermanentDeleteModal && policyToAdminDelete && (
        <ConfirmationModal
          isOpen={showAdminPermanentDeleteModal}
          onClose={handleAdminPermanentDeleteCancel}
          onConfirm={handleAdminPermanentDeleteConfirm}
          title="Permanently Delete Policy"
          message={`You are about to PERMANENTLY delete the policy for ${policyToAdminDelete.policyholderName} (Policy: ${policyToAdminDelete.policyNumber}). This action cannot be undone and the policy data will be lost forever. Please enter your password to confirm this critical action.`}
          confirmText="Delete Forever"
          cancelText="Cancel"
          type="danger"
          requirePassword={true}
          onPasswordValidation={validateUserPassword}
        />
      )}

      {/* Share PDF Modal */}
      {showShareModal && policyToShare && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-800 rounded-card max-w-md w-full shadow-2xl border border-gray-200 dark:border-gray-700">
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center">
                <Share2 className="h-5 w-5 mr-2 text-blue-600 dark:text-blue-400" />
                Share PDF Document
              </h2>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                Choose how to share the policy document for {policyToShare.policyholderName}
              </p>
            </div>
            <div className="px-6 py-4 space-y-3">
              {/* Download PDF File */}
              <button
                onClick={handleDownloadPDF}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-purple-700 text-white rounded-sharp hover:from-purple-700 hover:to-purple-800 transition-all duration-200 font-medium flex items-center justify-center shadow-md hover:shadow-lg"
              >
                <Download className="h-4 w-4 mr-2" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Download PDF File</div>
                  <div className="text-xs text-purple-100">Save to device & share</div>
                </div>
              </button>

              {/* Copy Formatted Message */}
              <button
                onClick={handleCopyFormattedMessage}
                className="w-full px-4 py-3 bg-gradient-to-r from-green-600 to-green-700 text-white rounded-sharp hover:from-green-700 hover:to-green-800 transition-all duration-200 font-medium flex items-center justify-center shadow-md hover:shadow-lg"
              >
                <FileText className="h-4 w-4 mr-2" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Copy Formatted Message</div>
                  <div className="text-xs text-green-100">Best for WhatsApp, Messages</div>
                </div>
              </button>

              {/* Copy Link Only */}
              <button
                onClick={handleCopyLink}
                className="w-full px-4 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-sharp hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-medium flex items-center justify-center shadow-md hover:shadow-lg"
              >
                <Link2 className="h-4 w-4 mr-2" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Copy Link Only</div>
                  <div className="text-xs text-blue-100">Just the PDF URL</div>
                </div>
              </button>

              {/* Open PDF & Share */}
              <button
                onClick={handleOpenAndShare}
                className="w-full px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-700 text-white rounded-sharp hover:from-purple-700 hover:to-indigo-800 transition-all duration-200 font-medium flex items-center justify-center shadow-md hover:shadow-lg"
              >
                <OpenExternal className="h-4 w-4 mr-2" />
                <div className="text-left flex-1">
                  <div className="font-semibold">Open PDF & Share</div>
                  <div className="text-xs text-purple-100">Use browser's share feature</div>
                </div>
              </button>
            </div>
            <div className="px-6 py-4 border-t border-gray-200 dark:border-gray-700">
              <button
                onClick={() => setShowShareModal(false)}
                className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-sharp hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
            <div className="px-6 pb-4">
              <div className="flex items-start space-x-2 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-sharp">
                <span className="text-blue-600 dark:text-blue-400 text-lg">💡</span>
                <p className="text-xs text-blue-700 dark:text-blue-300">
                  <span className="font-semibold">Tip:</span> Download option saves the PDF to your device for direct sharing. Formatted message works best for messaging apps.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
